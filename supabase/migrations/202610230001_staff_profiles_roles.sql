-- Apply after 202610200001_shared_crm.sql. Existing admins remain admins; viewers stay read-only.
begin;
alter table public.lh_staff drop constraint if exists lh_staff_role_check;
alter table public.lh_staff add constraint lh_staff_role_check check(role in ('admin','staff','editor','viewer'));
update public.lh_staff set role='staff' where role='editor';
alter table public.lh_staff add column if not exists display_name text not null default '';
alter table public.lh_staff add column if not exists phone text not null default '';
alter table public.lh_staff add column if not exists job_title text not null default '';
update public.lh_staff s set display_name=left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),split_part(u.email,'@',1),'Team member'),80) from auth.users u where s.user_id=u.id and s.display_name='';

create or replace function public.lh_my_profile() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('user_id',s.user_id,'role',s.role,'display_name',s.display_name,'phone',s.phone,'job_title',s.job_title,'email',u.email)
 from public.lh_staff s join auth.users u on u.id=s.user_id where s.user_id=auth.uid(); $$;
revoke all on function public.lh_my_profile() from public,anon;
grant execute on function public.lh_my_profile() to authenticated;

create or replace function public.lh_update_profile(full_name text,contact_phone text,position_title text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if public.lh_staff_role() is null then raise exception 'ACCESS: staff membership required'; end if;
 if full_name is null or length(trim(full_name))<2 or length(full_name)>80 or contact_phone is null or length(contact_phone)>40 or position_title is null or length(position_title)>100 then raise exception 'Invalid profile details'; end if;
 update public.lh_staff set display_name=trim(full_name),phone=trim(contact_phone),job_title=trim(position_title) where user_id=auth.uid();
 insert into public.lh_audit(actor,action,collection,record_id) values(auth.uid(),'profile updated','staff',auth.uid()::text);
end $$;
revoke all on function public.lh_update_profile(text,text,text) from public,anon;
grant execute on function public.lh_update_profile(text,text,text) to authenticated;

create or replace function public.lh_list_team() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if public.lh_staff_role() is distinct from 'admin' then raise exception 'ACCESS: administrator required'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('user_id',s.user_id,'role',s.role,'display_name',s.display_name,'phone',s.phone,'job_title',s.job_title,'email',u.email) order by s.created_at),'[]'::jsonb) from public.lh_staff s join auth.users u on u.id=s.user_id);
end $$;
revoke all on function public.lh_list_team() from public,anon;
grant execute on function public.lh_list_team() to authenticated;

create or replace function public.lh_change_staff(target_user uuid,new_role text) returns void
language plpgsql security definer set search_path='' as $$
declare previous_role text;
begin
 perform pg_advisory_xact_lock(hashtext('land-home-staff-management'));
 if public.lh_staff_role() is distinct from 'admin' then raise exception 'ACCESS: administrator required'; end if;
 if target_user=auth.uid() then raise exception 'Ask another administrator to change your access'; end if;
 if new_role is not null and new_role not in ('admin','staff','viewer') then raise exception 'Invalid role'; end if;
 select role into previous_role from public.lh_staff where user_id=target_user for update;
 if not found then raise exception 'Staff member not found'; end if;
 if previous_role='admin' and new_role is distinct from 'admin' and (select count(*) from public.lh_staff where role='admin')<=1 then raise exception 'Keep at least one administrator'; end if;
 if new_role is null then delete from public.lh_staff where user_id=target_user;
 else update public.lh_staff set role=new_role where user_id=target_user; end if;
 insert into public.lh_audit(actor,action,collection,record_id) values(auth.uid(),coalesce('role changed to '||new_role,'access removed'),'staff',target_user::text);
end $$;
revoke all on function public.lh_change_staff(uuid,text) from public,anon;
grant execute on function public.lh_change_staff(uuid,text) to authenticated;

-- Server-only enrollment: recheck the requesting admin under the same lock used for role changes.
create or replace function public.lh_enroll_staff(actor_id uuid,target_user uuid,new_role text,full_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('land-home-staff-management'));
 if not exists(select 1 from public.lh_staff where user_id=actor_id and role='admin') then raise exception 'ACCESS: administrator required'; end if;
 if new_role is null or new_role not in ('admin','staff') or full_name is null or length(trim(full_name))<2 or length(full_name)>80 then raise exception 'Invalid staff details'; end if;
 insert into public.lh_staff(user_id,role,display_name) values(target_user,new_role,trim(full_name));
 insert into public.lh_audit(actor,action,collection,record_id) values(actor_id,'user created','staff',target_user::text);
end $$;
revoke all on function public.lh_enroll_staff(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.lh_enroll_staff(uuid,uuid,text,text) to service_role;

-- Only activity tied to an operational record is visible to non-admin staff.
create or replace function public.lh_activity_visible(payload jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.lh_crm_records where collection in ('properties','contacts','leads','deals','tasks','viewings','leases','maintenance','documents') and id=payload->>'entityId'); $$;
revoke all on function public.lh_activity_visible(jsonb) from public,anon;
grant execute on function public.lh_activity_visible(jsonb) to authenticated;
drop policy if exists lh_records_staff_read on public.lh_crm_records;
create policy lh_records_staff_read on public.lh_crm_records for select to authenticated using(
 (select public.lh_staff_role())='admin' or
 ((select public.lh_staff_role()) in ('staff','editor','viewer') and collection not in ('finance','compliance','campaigns','settings') and (collection<>'activities' or public.lh_activity_visible(data)))
);
-- Expose only assignment labels to operational staff, not the private settings record.
create or replace function public.lh_assignment_labels() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if public.lh_staff_role() is null then raise exception 'ACCESS: staff membership required'; end if;
 return coalesce((select data->'agents' from public.lh_crm_records where collection='settings' and id='agency'),'["Principal"]'::jsonb);
end $$;
revoke all on function public.lh_assignment_labels() from public,anon;
grant execute on function public.lh_assignment_labels() to authenticated;
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
    insert into public.lh_audit(actor,action,collection,record_id)
      values(auth.uid(),case when item->'data'='null'::jsonb then 'delete' else 'save' end,target_collection,target_id);
  end loop;
end $$;
revoke all on function public.lh_apply_changes(jsonb) from public,anon;
grant execute on function public.lh_apply_changes(jsonb) to authenticated;


drop policy if exists lh_storage_staff_insert on storage.objects;
create policy lh_storage_staff_insert on storage.objects for insert to authenticated with check(
 bucket_id in ('property-photos','crm-documents') and (select public.lh_staff_role()) in ('admin','staff','editor') and (storage.foldername(name))[1]=(select auth.uid())::text
);
commit;
