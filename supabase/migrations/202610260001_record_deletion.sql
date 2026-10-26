-- Run after 202610230002_property_archive_audit.sql. No records are deleted by this migration.
begin;
create or replace function public.lh_record_delete_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.collection not in ('contacts','leads','deals','tasks','viewings','leases','maintenance','documents','campaigns','finance','compliance') then return old; end if;
 if public.lh_staff_role() is distinct from 'admin' then raise exception 'ACCESS: administrator required'; end if;
 if exists(select 1 from public.lh_crm_records r where (r.collection,r.id)<>(old.collection,old.id) and r.collection not in ('activities','settings') and (
  r.data->>'relatedId'=old.id or
  (old.collection='contacts' and (r.data->>'contactId'=old.id or r.data->>'ownerId'=old.id or r.data->>'tenantId'=old.id)) or
  (old.collection='deals' and r.data->>'dealId'=old.id) or
  (old.collection='leads' and r.data->>'leadId'=old.id) or
  (old.collection='leases' and r.data->>'leaseId'=old.id) or
  (old.collection='documents' and r.data->>'documentId'=old.id) or
  (old.collection='campaigns' and nullif(old.data->>'sourceTag','') is not null and r.collection='leads' and r.data->'details'->>'utm_campaign'=old.data->>'sourceTag')
 )) then raise exception 'LINKED_RECORDS: resolve linked records first'; end if;
 return old;
end $$;
revoke all on function public.lh_record_delete_guard() from public,anon,authenticated;
drop trigger if exists lh_record_delete_guard on public.lh_crm_records;
create trigger lh_record_delete_guard before delete on public.lh_crm_records for each row execute function public.lh_record_delete_guard();
create or replace function public.lh_delete_record(target_collection text,target_id text,expected_revision bigint) returns void
language plpgsql security definer set search_path='' as $$
declare current_revision bigint;
begin
 perform pg_advisory_xact_lock(hashtext('land-home-crm-writes'));
 if public.lh_staff_role() is distinct from 'admin' then raise exception 'ACCESS: administrator required'; end if;
 if target_collection is null or target_collection not in ('contacts','leads','deals','tasks','viewings','leases','maintenance','documents','campaigns','finance','compliance') then raise exception 'Record cannot be deleted here'; end if;
 select revision into current_revision from public.lh_crm_records r where r.collection=target_collection and r.id=target_id for update;
 if not found then raise exception 'Record no longer exists. Refresh the workspace.'; end if;
 if expected_revision is null or current_revision<>expected_revision then raise exception 'CONFLICT: record changed'; end if;
 delete from public.lh_crm_records r where r.collection=target_collection and r.id=target_id;
 -- Existing audit trigger records the deletion and actor in this transaction.
end $$;
revoke all on function public.lh_delete_record(text,text,bigint) from public,anon;
grant execute on function public.lh_delete_record(text,text,bigint) to authenticated;
-- Protect structured references against stale forms linking to deleted contacts/deals.
create or replace function public.lh_contact_deal_reference_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare field_name text; target text; ref text; previous jsonb:='{}';
begin
 if TG_OP='UPDATE' then previous:=old.data; end if;
 foreach field_name in array array['contactId','ownerId','tenantId','dealId'] loop
  if (field_name='contactId' and new.collection in ('leads','deals','viewings')) or
     (field_name='ownerId' and new.collection in ('properties','leases')) or
     (field_name='tenantId' and new.collection='leases') or
     (field_name='dealId' and new.collection='finance') then
   ref:=nullif(new.data->>field_name,'');
   target:=case when field_name='dealId' then 'deals' else 'contacts' end;
   if ref is not null and previous->>field_name is distinct from ref and not exists(select 1 from public.lh_crm_records r where r.collection=target and r.id=ref) then
    raise exception 'Linked record no longer exists. Refresh and choose another record.';
   end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.lh_contact_deal_reference_guard() from public,anon,authenticated;
drop trigger if exists lh_contact_deal_reference_guard on public.lh_crm_records;
create trigger lh_contact_deal_reference_guard before insert or update on public.lh_crm_records for each row execute function public.lh_contact_deal_reference_guard();
commit;
