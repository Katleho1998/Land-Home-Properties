-- Run after 202610230001_staff_profiles_roles.sql. No business records are deleted.
begin;
alter table public.lh_audit add column if not exists actor_name text;
alter table public.lh_audit add column if not exists actor_email text;
alter table public.lh_audit add column if not exists record_label text;
alter table public.lh_audit add column if not exists changed_fields text[] not null default '{}';
alter table public.lh_audit add column if not exists details jsonb not null default '{}';
alter table public.lh_audit add column if not exists source text not null default 'server';
create index if not exists lh_audit_created_id on public.lh_audit(created_at desc,id desc);

create or replace function public.lh_audit_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.actor is not null then
  select coalesce(nullif(s.display_name,''),u.email,'Staff member'),u.email into new.actor_name,new.actor_email
  from auth.users u left join public.lh_staff s on s.user_id=u.id where u.id=new.actor;
 end if;
 new.actor_name:=coalesce(new.actor_name,case when new.actor is null then 'System / website' else 'Former staff member' end);
 return new;
end $$;
revoke all on function public.lh_audit_identity() from public,anon,authenticated;
drop trigger if exists lh_audit_identity on public.lh_audit;
create trigger lh_audit_identity before insert on public.lh_audit for each row execute function public.lh_audit_identity();

-- Covers all CRM writes, including server enquiries. Audit writes roll back with failed changes.
create or replace function public.lh_audit_record_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare before_data jsonb:='{}'; after_data jsonb:='{}'; payload jsonb; cols text[]; event_name text; col text; rid text;
begin
 if TG_OP<>'INSERT' then before_data:=old.data; end if;
 if TG_OP<>'DELETE' then after_data:=new.data; end if;
 if TG_OP='UPDATE' and before_data=after_data then return new; end if;
 if TG_OP='DELETE' then col:=old.collection; rid:=old.id; payload:=before_data;
 else col:=new.collection; rid:=new.id; payload:=after_data; end if;
 select coalesce(array_agg(k order by k),'{}') into cols from
 (select jsonb_object_keys(before_data||after_data) k) keys
 where before_data->k is distinct from after_data->k and k not in ('__revision','updatedAt');
 event_name:=case TG_OP when 'INSERT' then 'Created' when 'DELETE' then 'Deleted' else 'Updated' end;
 if col='properties' and TG_OP='UPDATE' then
  if after_data->>'status'='Archived' and before_data->>'status' is distinct from 'Archived' then event_name:='Archived';
  elsif before_data->>'status'='Archived' and after_data->>'status'='Draft' then event_name:='Restored as draft';
  elsif after_data->>'status'='Published' and before_data->>'status' is distinct from 'Published' then event_name:='Published';
  elsif before_data->>'status'='Published' and after_data->>'status' is distinct from 'Published' then event_name:='Unpublished';
  elsif after_data->'publicSnapshot' is distinct from before_data->'publicSnapshot' then event_name:='Publication updated'; end if;
 end if;
 insert into public.lh_audit(actor,action,collection,record_id,record_label,changed_fields,details,source)
 values(auth.uid(),event_name,col,rid,left(coalesce(payload->>'title',payload->>'name',payload->>'description',rid),180),cols,
 jsonb_strip_nulls(jsonb_build_object('previous_status',before_data->>'status','new_status',after_data->>'status')),'database');
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.lh_audit_record_change() from public,anon,authenticated;
drop trigger if exists lh_record_audit on public.lh_crm_records;
create trigger lh_record_audit after insert or update or delete on public.lh_crm_records for each row execute function public.lh_audit_record_change();

-- Enforce property safety even when the generic save RPC is called directly.
create or replace function public.lh_property_lifecycle_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare role_name text:=public.lh_staff_role();
begin
 if TG_OP='DELETE' then
  if old.collection<>'properties' then return old; end if;
  if role_name is distinct from 'admin' then raise exception 'ACCESS: only an administrator may delete a property'; end if;
  if exists(select 1 from public.lh_crm_records r where r.collection in ('leads','deals','viewings','leases','maintenance','documents','tasks','compliance') and
   (r.data->>'propertyId'=old.id or r.data->>'relatedId'=old.id or r.data->'details'->>'property_reference'=old.id or
    exists(select 1 from jsonb_array_elements(case when jsonb_typeof(r.data->'submissions')='array' then r.data->'submissions' else '[]'::jsonb end) sub where sub->>'propertyId'=old.id)))
  then raise exception 'LINKED_RECORDS: this property has linked records. Archive it to preserve its history.'; end if;
  return old;
 end if;
 if new.collection<>'properties' then return new; end if;
 if TG_OP='UPDATE' and old.data->>'status'='Archived' then
  if new.data->>'status' is distinct from 'Archived' then
   if role_name is distinct from 'admin' then raise exception 'ACCESS: only an administrator may restore a property'; end if;
   if new.data->>'status' is distinct from 'Draft' or (new.data->'publicSnapshot' is not null and new.data->'publicSnapshot'<>'null'::jsonb) then raise exception 'Restore as a draft before publishing'; end if;
  elsif new.data is distinct from old.data then raise exception 'Restore this property before editing it'; end if;
 end if;
 if new.data->>'status'='Archived' then
  new.data:=(new.data-'publicSnapshot'-'publishedAt')||jsonb_build_object('archivedAt',now(),'archivedBy',auth.uid());
 end if;
 return new;
end $$;
revoke all on function public.lh_property_lifecycle_guard() from public,anon,authenticated;
drop trigger if exists lh_property_lifecycle_guard on public.lh_crm_records;
create trigger lh_property_lifecycle_guard before insert or update or delete on public.lh_crm_records for each row execute function public.lh_property_lifecycle_guard();

create or replace function public.lh_property_action(property_id text,operation text,expected_revision bigint) returns void
language plpgsql security definer set search_path='' as $$
declare p public.lh_crm_records%rowtype; role_name text;
begin
 perform pg_advisory_xact_lock(hashtext('land-home-crm-writes'));
 role_name:=public.lh_staff_role();
 if role_name is null or role_name not in ('admin','staff','editor') then raise exception 'ACCESS: staff editing access required'; end if;
 if operation is null or operation not in ('archive','restore','delete') then raise exception 'Invalid property action'; end if;
 if operation in ('restore','delete') and role_name<>'admin' then raise exception 'ACCESS: administrator required'; end if;
 select * into p from public.lh_crm_records where collection='properties' and id=property_id for update;
 if not found then raise exception 'Property no longer exists'; end if;
 if expected_revision is null or p.revision<>expected_revision then raise exception 'CONFLICT: property changed. Refresh and try again.'; end if;
 if operation='delete' then delete from public.lh_crm_records where collection='properties' and id=property_id; return; end if;
 if operation='archive' and p.data->>'status'='Archived' then raise exception 'Property is already archived'; end if;
 if operation='restore' and p.data->>'status' is distinct from 'Archived' then raise exception 'Property is not archived'; end if;
 update public.lh_crm_records set data=(p.data-'publicSnapshot'-'publishedAt'-'archivedAt'-'archivedBy')||jsonb_build_object('status',case operation when 'archive' then 'Archived' else 'Draft' end,'updatedAt',now()),revision=revision+1,updated_at=now() where collection='properties' and id=property_id;
end $$;
revoke all on function public.lh_property_action(text,text,bigint) from public,anon;
grant execute on function public.lh_property_action(text,text,bigint) to authenticated;

-- Client events are explicitly labelled; they are not proof that a download was saved on disk.
create or replace function public.lh_log_client_event(event_name text,record_reference text default '') returns void
language plpgsql security definer set search_path='' as $$
declare role_name text:=public.lh_staff_role();
begin
 if role_name is null then raise exception 'ACCESS: staff required'; end if;
 if event_name is null or event_name not in ('Signed in','Signed out','Password changed','Document downloaded','Workspace exported','Activity exported','Section opened') then raise exception 'Invalid event'; end if;
 if record_reference is null or length(record_reference)>160 then raise exception 'Invalid reference'; end if;
 if event_name in ('Workspace exported','Activity exported') and role_name<>'admin' then raise exception 'ACCESS: administrator required'; end if;
 insert into public.lh_audit(actor,action,collection,record_id,source) values(auth.uid(),event_name,'session',record_reference,'client-reported');
end $$;
revoke all on function public.lh_log_client_event(text,text) from public,anon;
grant execute on function public.lh_log_client_event(text,text) to authenticated;

-- Stored-object uploads/changes, without copying file contents or credentials into audit rows.
create or replace function public.lh_audit_file_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare bucket text; path text;
begin
 if TG_OP='DELETE' then bucket:=old.bucket_id; path:=old.name; else bucket:=new.bucket_id; path:=new.name; end if;
 if bucket in ('property-photos','crm-documents') then
  insert into public.lh_audit(actor,action,collection,record_id,source) values(auth.uid(),case TG_OP when 'INSERT' then 'File uploaded' when 'DELETE' then 'File removed' else 'File updated' end,bucket,path,'storage');
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.lh_audit_file_change() from public,anon,authenticated;
drop trigger if exists lh_file_audit on storage.objects;
create trigger lh_file_audit after insert or update or delete on storage.objects for each row execute function public.lh_audit_file_change();
create or replace function public.lh_apply_changes(changes jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; role_name text; current_revision bigint; expected bigint; target_collection text; target_id text;
begin
  role_name:=public.lh_staff_role();
  if role_name is null or role_name not in ('admin','staff','editor') then raise exception 'ACCESS: editor access required'; end if;
  if jsonb_typeof(changes) is distinct from 'array' then raise exception 'Invalid change set'; end if;
  if jsonb_array_length(changes)>2000 or octet_length(changes::text)>5000000 then raise exception 'Change set too large'; end if;
  perform pg_advisory_xact_lock(hashtext('land-home-crm-writes'));
  for item in select value from jsonb_array_elements(changes) loop
    target_collection:=item->>'collection'; target_id:=item->>'id';
    if target_collection in ('settings','finance','compliance','campaigns') and role_name<>'admin' then raise exception 'ACCESS: administrator access required'; end if;
    if role_name<>'admin' and target_collection='activities' then
      if exists(select 1 from public.lh_crm_records r where r.collection='activities' and r.id=target_id and not public.lh_activity_visible(r.data)) then raise exception 'ACCESS: private activity'; end if;
      if item->'data'='null'::jsonb then
        if not exists(select 1 from public.lh_crm_records r where r.collection='activities' and r.id=target_id and public.lh_activity_visible(r.data)) then raise exception 'ACCESS: private activity'; end if;
      elsif not public.lh_activity_visible(item->'data') then raise exception 'ACCESS: private activity'; end if;
    end if;
    if target_id is null or length(target_id)>150 then raise exception 'Invalid record ID'; end if;
    expected:=(item->>'expected_revision')::bigint;
    select revision into current_revision from public.lh_crm_records where collection=target_collection and id=target_id for update;
    if current_revision is distinct from expected then raise exception 'CONFLICT: record changed'; end if;
    if item->'data'='null'::jsonb then
      delete from public.lh_crm_records where collection=target_collection and id=target_id;
    else
      if jsonb_typeof(item->'data') is distinct from 'object' or item->'data'->>'id' is distinct from target_id then raise exception 'Invalid record data'; end if;
      insert into public.lh_crm_records(collection,id,data,revision)
      values(target_collection,target_id,(item->'data')-'__revision',1)
      on conflict(collection,id) do update set data=excluded.data,revision=public.lh_crm_records.revision+1,updated_at=now();
    end if;
    -- The record trigger stores the audit event in this same transaction.
  end loop;
end $$;
revoke all on function public.lh_apply_changes(jsonb) from public,anon;
grant execute on function public.lh_apply_changes(jsonb) to authenticated;



-- Reject a stale form linking a new/changed record to an already deleted property.
create or replace function public.lh_property_reference_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare ref text:=nullif(new.data->>'propertyId','');
begin
 if new.collection in ('leads','deals','viewings','leases','maintenance') and ref is not null then
  if TG_OP='INSERT' or old.data->>'propertyId' is distinct from ref then
   if not exists(select 1 from public.lh_crm_records where collection='properties' and id=ref) then
    raise exception 'Property no longer exists. Refresh and select another property.';
   end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.lh_property_reference_guard() from public,anon,authenticated;
drop trigger if exists lh_property_reference_guard on public.lh_crm_records;
create trigger lh_property_reference_guard before insert or update on public.lh_crm_records for each row execute function public.lh_property_reference_guard();

commit;
