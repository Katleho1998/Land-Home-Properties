-- Land & Home: run once in this project's Supabase SQL Editor.
-- No demo data is imported. Staff membership is granted separately by an admin.
begin;

create table if not exists public.lh_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);
alter table public.lh_staff enable row level security;
revoke all on public.lh_staff from anon, authenticated;
grant select on public.lh_staff to authenticated;
drop policy if exists lh_staff_self on public.lh_staff;
create policy lh_staff_self on public.lh_staff for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.lh_staff_role() returns text
language sql stable security definer set search_path=''
as $$ select role from public.lh_staff where user_id=(select auth.uid()); $$;
revoke all on function public.lh_staff_role() from public,anon;
grant execute on function public.lh_staff_role() to authenticated;

create table if not exists public.lh_crm_records (
  collection text not null check(collection in ('properties','contacts','leads','deals','tasks','viewings','leases','maintenance','documents','campaigns','finance','compliance','activities','settings')),
  id text not null,
  data jsonb not null check(jsonb_typeof(data)='object' and data->>'id'=id),
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key(collection,id)
);
alter table public.lh_crm_records enable row level security;
revoke all on public.lh_crm_records from anon,authenticated;
grant select on public.lh_crm_records to authenticated;
drop policy if exists lh_records_staff_read on public.lh_crm_records;
create policy lh_records_staff_read on public.lh_crm_records for select to authenticated using((select public.lh_staff_role()) is not null);

create table if not exists public.lh_public_listings (
  id text primary key, data jsonb not null, updated_at timestamptz not null default now()
);
alter table public.lh_public_listings enable row level security;
revoke all on public.lh_public_listings from anon,authenticated;
grant select on public.lh_public_listings to anon,authenticated;
drop policy if exists lh_published_read on public.lh_public_listings;
create policy lh_published_read on public.lh_public_listings for select to anon,authenticated using(true);

create table if not exists public.lh_audit (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, collection text not null, record_id text not null,
  created_at timestamptz not null default now()
);
alter table public.lh_audit enable row level security;
revoke all on public.lh_audit from anon,authenticated;
grant select on public.lh_audit to authenticated;
drop policy if exists lh_audit_admin on public.lh_audit;
create policy lh_audit_admin on public.lh_audit for select to authenticated using((select public.lh_staff_role())='admin');

create table if not exists public.lh_enquiry_receipts (
  request_id uuid primary key, reference text not null, payload_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.lh_enquiry_receipts enable row level security;
revoke all on public.lh_enquiry_receipts from anon,authenticated;

-- Publication is a database-side allowlist: never copy a full private record.
create or replace function public.lh_sync_public_listing() returns trigger
language plpgsql security definer set search_path='' as $$
declare p jsonb; snap jsonb; safe_photos jsonb; safe_features jsonb; safe_data jsonb;
begin
  if TG_OP='DELETE' then
    if old.collection='properties' then delete from public.lh_public_listings where id=old.id; end if;
    return old;
  end if;
  if new.collection<>'properties' then return new; end if;
  p:=new.data; snap:=p->'publicSnapshot';
  if p->>'status' is distinct from 'Published' or snap is null or snap='null'::jsonb then
    delete from public.lh_public_listings where id=new.id; return new;
  end if;
  if p->>'mandateConfirmed' is distinct from 'true' or p->>'disclosureConfirmed' is distinct from 'true' or p->>'factsVerified' is distinct from 'true'
     or coalesce(p->>'ownerId','')='' then raise exception 'PUBLICATION: complete the mandate and verification checks'; end if;
  if coalesce(p->>'mandateEnd','')<>'' and (p->>'mandateEnd')::date<current_date then
    raise exception 'PUBLICATION: mandate has expired';
  end if;
  if coalesce(snap->>'town','') not in ('Ficksburg','Meqheleng') then raise exception 'PUBLICATION: this town is coming soon'; end if;
  if coalesce(snap->>'purpose','') not in ('buy','rent') or coalesce(length(snap->>'title'),0)<1
    or jsonb_typeof(snap->'price') is distinct from 'number' then raise exception 'PUBLICATION: invalid listing details'; end if;
  if (snap->>'price')::numeric<=0 then raise exception 'PUBLICATION: price must be positive'; end if;
  if jsonb_typeof(snap->'images') is distinct from 'array' then raise exception 'PUBLICATION: photographs required'; end if;
  select jsonb_agg(jsonb_build_object('id',photo->>'id','url',photo->>'url','alt',photo->>'alt','room',photo->>'room'))
    into safe_photos from jsonb_array_elements(snap->'images') photo
    where photo->>'url' like 'https://%' and coalesce(length(photo->>'alt'),0)>0;
  if coalesce(jsonb_array_length(safe_photos),0)=0 or jsonb_array_length(safe_photos)<>jsonb_array_length(snap->'images')
    then raise exception 'PUBLICATION: use HTTPS photo URLs and descriptions'; end if;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into safe_features
    from jsonb_array_elements(case when jsonb_typeof(snap->'features')='array' then snap->'features' else '[]'::jsonb end)
    where jsonb_typeof(value)='string';
  safe_data:=jsonb_strip_nulls(jsonb_build_object(
    'id',new.id,'title',snap->>'title','town',snap->>'town','type',snap->>'type','purpose',snap->>'purpose',
    'price',snap->'price','beds',snap->'beds','baths',snap->'baths','area',snap->'area',
    'image',safe_photos->0->>'url','images',safe_photos,'features',safe_features,
    'commercial',snap->'commercial','province',snap->>'province','postalCode',snap->>'postalCode',
    'parking',snap->'parking','deposit',snap->'deposit','available',snap->>'available',
    'description',snap->>'description','published',true,
    'address',case when p->>'showAddress'='true' then snap->>'address' else '' end,
    'garages',snap->'garages','erfSize',snap->'erfSize','rates',snap->'rates','levies',snap->'levies'
  ));
  insert into public.lh_public_listings(id,data) values(new.id,safe_data)
    on conflict(id) do update set data=excluded.data,updated_at=now();
  return new;
end $$;
revoke all on function public.lh_sync_public_listing() from public,anon,authenticated;
drop trigger if exists lh_publish_projection on public.lh_crm_records;
create trigger lh_publish_projection after insert or update or delete on public.lh_crm_records
for each row execute function public.lh_sync_public_listing();

-- Atomic, incremental edits. Compare revisions to reject stale editor saves.
create or replace function public.lh_apply_changes(changes jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb; role_name text; current_revision bigint; expected bigint; target_collection text; target_id text;
begin
  role_name:=public.lh_staff_role();
  if role_name is null or role_name not in ('admin','editor') then raise exception 'ACCESS: editor access required'; end if;
  if jsonb_typeof(changes) is distinct from 'array' then raise exception 'Invalid change set'; end if;
  if jsonb_array_length(changes)>2000 or octet_length(changes::text)>5000000 then raise exception 'Change set too large'; end if;
  perform pg_advisory_xact_lock(hashtext('land-home-crm-writes'));
  for item in select value from jsonb_array_elements(changes) loop
    target_collection:=item->>'collection'; target_id:=item->>'id';
    if target_collection='settings' and role_name<>'admin' then raise exception 'ACCESS: administrator access required'; end if;
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

-- Called only by the protected Netlify endpoint with a server-side Supabase key.
create or replace function public.lh_submit_enquiry(request_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare receipt public.lh_enquiry_receipts%rowtype; lead_id text; contact_id text; task_id text; stamp text; lead_kind text; contact_name text;
begin
  if payload->>'popia_consent' is distinct from 'on' or length(trim(coalesce(payload->>'name','')))<2
    or length(trim(coalesce(payload->>'phone','')))<7 then raise exception 'Invalid enquiry or consent'; end if;
  perform pg_advisory_xact_lock(hashtext('land-home-crm-writes'));
  select * into receipt from public.lh_enquiry_receipts r where r.request_id=lh_submit_enquiry.request_id;
  if found then
    if receipt.payload_hash<>md5(payload::text) then raise exception 'REQUEST_CONFLICT'; end if;
    return jsonb_build_object('accepted',true,'reference',receipt.reference);
  end if;
  lead_id:='LEAD-'||gen_random_uuid()::text; contact_id:='C-'||gen_random_uuid()::text; task_id:='TASK-'||gen_random_uuid()::text;
  stamp:=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  lead_kind:=coalesce(payload->>'enquiry_type','contact'); contact_name:=trim(payload->>'name');
  insert into public.lh_crm_records(collection,id,data) values
  ('contacts',contact_id,jsonb_build_object('id',contact_id,'name',contact_name,'email',coalesce(payload->>'email',''),'phone',payload->>'phone','role',lead_kind,'town',coalesce(payload->>'town',''),'language',coalesce(payload->>'language','English'),'agent','Unassigned','marketingConsent',false,'notes','Website enquiry','createdAt',stamp)),
  ('leads',lead_id,jsonb_build_object('id',lead_id,'contactId',contact_id,'name',contact_name,'email',coalesce(payload->>'email',''),'phone',payload->>'phone','kind',lead_kind,'source','website','propertyId',coalesce(payload->>'property_reference',''),'budget',coalesce(nullif(payload->>'budget','')::numeric,0),'town',coalesce(payload->>'town',''),'finance',coalesce(payload->>'finance',''),'timeline',coalesce(payload->>'timeline',payload->>'timing',''),'language',coalesce(payload->>'language','English'),'status','New','priority','Normal','agent','Unassigned','message',coalesce(payload->>'message',payload->>'notes','Property enquiry'),'consent',true,'consentAt',stamp,'createdAt',stamp,'updatedAt',stamp,'details',payload,'submissions','[]'::jsonb)),
  ('tasks',task_id,jsonb_build_object('id',task_id,'title','Respond to '||contact_name,'due',to_char(now() at time zone 'Africa/Johannesburg','YYYY-MM-DD'),'time','','agent','Unassigned','priority','High','status','Open','relatedId',lead_id,'notes','Website enquiry; contact during staffed hours.'));
  insert into public.lh_enquiry_receipts values(request_id,lead_id,md5(payload::text),now());
  insert into public.lh_audit(actor,action,collection,record_id) values(null,'website enquiry','leads',lead_id);
  return jsonb_build_object('accepted',true,'reference',lead_id);
end $$;
revoke all on function public.lh_submit_enquiry(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.lh_submit_enquiry(uuid,jsonb) to service_role;

-- Photos are public marketing assets. Sensitive documents use a separate private bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('property-photos','property-photos',true,8388608,array['image/jpeg','image/png','image/webp']),
      ('crm-documents','crm-documents',false,8388608,array['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
on conflict(id) do nothing;
drop policy if exists lh_storage_staff_insert on storage.objects;
create policy lh_storage_staff_insert on storage.objects for insert to authenticated with check(
  bucket_id in ('property-photos','crm-documents') and (select public.lh_staff_role()) in ('admin','editor')
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists lh_storage_staff_read on storage.objects;
create policy lh_storage_staff_read on storage.objects for select to authenticated using(
  bucket_id in ('property-photos','crm-documents') and (select public.lh_staff_role()) is not null
);
-- Deletes intentionally remain administrator-only through the dashboard until
-- file-reference cleanup and retention policies are agreed.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lh_crm_records') then alter publication supabase_realtime add table public.lh_crm_records; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lh_public_listings') then alter publication supabase_realtime add table public.lh_public_listings; end if;
  end if;
end $$;
commit;
