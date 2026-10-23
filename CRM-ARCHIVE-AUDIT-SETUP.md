# Property archives and activity log

## Activate

1. After the staff roles migration, open Supabase → SQL Editor → New query.
2. Paste the complete contents of `supabase/migrations/202610230002_property_archive_audit.sql` and run it. It installs functions/triggers; it does not delete business records.
3. Deploy the updated website, then sign out and sign back in.
4. As an Admin, open Settings → Archives & activity log.

## Permissions and behaviour

| Action | Admin | Staff | Legacy read-only |
| --- | --- | --- | --- |
| Archive a property | Yes | Yes | No |
| Restore an archive as a private draft | Yes | No | No |
| Permanently delete an unlinked property | Yes | No | No |
| Read archives/settings/audit screen | Yes | No | No |

All three actions have confirmation dialogs. Permanent deletion additionally requires typing the property reference. Linked enquiries, opportunities, viewings, leases, maintenance, documents, tasks and compliance records block deletion. Archive those properties instead. Archiving removes public listing data and retains relationships. Restoring never republishes automatically. Stored photographs and audit history survive deletion. No file deletion is performed by these controls.

## Recorded history

Server triggers record successful creates, edits and deletes across CRM records, including public website enquiries and file storage changes. Each entry stores the actor UUID, name/email snapshot where available, server timestamp, affected record, action, changed field names and status transition. Existing profile and staff-management RPCs also record their actions. The log is admin-only, searchable by person, filterable by area and paginated. Times display in South African time.

Browser sign-in/out, section navigation, password changes, exports and document downloads use explicitly labelled client-reported events. A download event means the download was requested, not proof that a file was saved. Export/download controls stop if their audit call fails. Sign-out remains available if logging fails. Browser logging failures show a workspace warning.

This is an operational audit trail, not a recording of every click or keystroke. Failed sign-ins are in Supabase Auth logs; failed/rolled-back transactions do not create successful-change entries. Direct API reads, external messages, browser abandonment and every project-dashboard administrative operation are not covered by browser events. Passwords, tokens, file contents and full previous customer-data values are not copied into audit rows. Profile and staff-management events identify the action and target; they do not preserve all previous profile values. Historical entries may only contain UUIDs. CRM users cannot edit/delete audit rows; database/project administrators retain privileged control. Retention/backups must be managed separately.

## Deployment acceptance checks

Use disposable test records, never an actual client property for deletion testing.

- Admin and Staff can archive a test property; it disappears from active Properties and public listings after refresh.
- Admin sees it in Settings → Archives and restores it as Draft; website stays unpublished.
- Delete → Cancel leaves the property untouched. Wrong confirmation reference leaves Delete disabled.
- An unlinked test property can be deleted with the correct reference; its audit entry remains.
- A property linked to a test enquiry cannot be deleted; archive still works.
- A stale open form fails with a conflict after someone else changes the property.
- Staff cannot restore/delete using either UI or direct RPC; read-only accounts cannot archive.
- Create/edit a contact, change a profile, manage a user, upload a file, export, download and sign out/in; confirm the appropriate actor, time and action.
- Staff cannot read `lh_audit` or access Settings.
- Verify pagination and person/area filters with more than 50 audit entries.

Local TypeScript/build and mocked application checks do not execute PostgreSQL policies/triggers. Run these acceptance checks after applying the SQL; no live destructive tests were performed during implementation.
