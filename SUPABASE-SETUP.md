> **Profiles and Admin/Staff update:** after the original migration, apply `supabase/migrations/202610230001_staff_profiles_roles.sql`. See [CRM-TEAM-SETUP.md](CRM-TEAM-SETUP.md) for the current access matrix and in-CRM account creation. The original instructions below describe the initial setup; the new migration narrows staff access.

# Activate the shared Land & Home database

Project: https://supabase.com/dashboard/project/fgwvrgqwruzdstscgmys

The application contains the public project URL and anon key. These identify the project; the database access policies protect private records. No server secret belongs in frontend code or GitHub.

## 1. Create the tables

Open this project's **SQL Editor → New query**. Paste the entire contents of:

`supabase/migrations/202610200001_shared_crm.sql`

Run the query. It creates the shared CRM records, public listing table, staff membership, audit log, enquiry receipts, storage buckets and access policies. It does not import browser demo records. Keep row-level security enabled.

## 2. Create your staff login

In **Authentication → Users**, create a user with your chosen staff email and password. Confirm the account using the dashboard's available confirmation option. Never paste the password into chat or commit it.

Then run this separate SQL query, replacing the example email with the exact email you just created:

```sql
insert into public.lh_staff (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('REPLACE_WITH_YOUR_STAFF_EMAIL')
on conflict (user_id) do update set role = excluded.role;
```

Verify enrollment:

```sql
select u.email, s.role
from public.lh_staff s
join auth.users u on u.id = s.user_id;
```

Your account must appear as `admin`. Authentication alone does not grant CRM access.

For additional staff, create an Auth user and use the same enrollment query with `editor` or `viewer`. Admins and editors can edit CRM records; viewers can read. Only admins can change agency settings. All enrolled staff can read the CRM and private documents; assignment labels do not restrict access to individual records.

Remove a staff membership in `lh_staff` to revoke database access. Previously downloaded exports cannot be recalled. Disable public signups in Authentication settings if your project does not need customer accounts. Configure the Auth site URL for the real website.

## 3. Enable online enquiries in Netlify

In the same Supabase project, open **Settings → API Keys**.

Copy a **secret** key directly into Netlify's environment variables:

- Name: `SUPABASE_SECRET_KEY`
- Value: the `sb_secret_...` key
- Include the **Functions** scope, or the available scopes that include Functions.
- Set it for the production deploy context.

Alternatively, a legacy service-role key can be stored as `SUPABASE_SERVICE_ROLE_KEY`.

Do not send either key in chat. Do not use a `NEXT_PUBLIC_` or `VITE_` prefix. The server key is used only by the Netlify enquiry function.

The AI's existing `OPENAI_API_KEY` stays separate.

## 4. Deploy and sign in

Push the application changes to GitHub, then let Netlify finish a fresh deployment. Environment variable changes also require a new deployment.

Open `/crm` on the deployed website and sign in with the staff account. The shared workspace starts empty. Existing browser-only demonstration records are not imported.

The local Vite preview does not run Netlify Functions. Use Netlify's deployed site or Netlify Dev to test online enquiries.

## 5. Verify the complete workflow

1. Create an owner contact and a property draft in the CRM.
2. Add accurate details and photos. Complete the mandate, disclosure and imagery verification checks.
3. Publish the property. Open the public website in a separate signed-out browser and verify the listing and photographs.
4. Change the draft and save. The previous public snapshot remains until you republish.
5. Republish, then unpublish. Confirm the public listing updates and disappears respectively.
6. Submit a clearly labelled test enquiry online with consent. Confirm the receipt reference, lead, contact and follow-up task in the CRM.
7. Confirm a viewer cannot save changes and an account without staff membership cannot open private records.
8. Confirm private documents cannot be downloaded while signed out.

Only report the integration as live after these checks pass.

## What is connected

- Shared CRM records for properties, contacts, leads, deals, tasks, viewings, rentals, maintenance, documents, campaigns, finance, compliance, activities and settings.
- Staff password sign-in and database-enforced roles.
- Published property snapshots shared with website lists, detail pages and guided search cards.
- Public marketing photo uploads; private staff document uploads/downloads.
- Online enquiries saved atomically with a contact and task. A retry using the same request reference returns the original receipt instead of duplicating it.
- Incremental writes with revision conflict checks, database audit entries, realtime refresh and periodic refresh.

## Operational limits

This implementation does not connect payments, trust accounting, property portals, outbound email, WhatsApp messaging APIs, or automatic bookings. The AI text conversation does not query private CRM records or automatically save leads.

Files are limited to 8 MB each. Property photo URLs are public even while their listing is a draft, and unpublishing does not delete the photo files. Upload only approved marketing photographs to the photo bucket. Private documents use the separate private bucket.

Removing a document record does not delete its storage file. File cleanup and retention require an administrator. The JSON export contains records and file references, not a downloadable backup of every storage object. Automated backup recovery, retention, deletion procedures and abuse monitoring still need operational setup.

Publication checks mandate expiry at the time of publication/save; there is no scheduled automatic expiry removal. Staff must unpublish expired or unavailable properties.

Public website contact details are maintained in the website's business configuration. CRM assignment labels and agency settings do not create staff accounts or change that public configuration.

## References

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
