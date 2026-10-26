# CRM CRUD review — 26 October 2026

## Result

12 offline automated suites passed. TypeScript passed. The Vite preview build passed (framework dynamic-import/performance warnings remain). No production records, real accounts or storage files were changed. No live OpenAI calls were made. This is not a claim that every deployed screen or Supabase policy has been tested.

## Fixes in this review

- Finance and compliance edits preserve the record revision from when the editor opened, so concurrent changes cannot be silently overwritten.
- General record editors capture an opening snapshot; periodic refreshes no longer upgrade a stale form's revision. Switching records remounts the editor.
- Agency settings preserve the displayed revision and reload their saved values after a successful save.
- A manually entered enquiry and its newly created contact are submitted as one atomic change set. A failed enquiry save no longer leaves a newly created contact behind from that operation.
- An existing public enquiry test was made insensitive to formatting whitespace; its submission and consent checks remain.

## Coverage and intended behaviour

| Area | Supported workflow | Evidence and remaining checks |
| --- | --- | --- |
| Properties | Create/read/update, publish/unpublish, archive/restore, Admin delete | Offline storage round trips, publication rules and lifecycle requests passed; live projection/trigger checks pending |
| Contacts, enquiries, opportunities | Create/read/update, Admin delete when unlinked | Offline storage round trips, actual editor revision handling and atomic contact/enquiry submissions passed; live RLS/link checks pending |
| Tasks, viewings, leases, maintenance | Create/read/update, Admin delete when unlinked | Offline storage round trips and deletion-request controls passed; calendar/lease/maintenance browser workflows pending |
| Documents | Register create/read/update/delete; upload/download | Register CRUD covered offline; live upload/download/storage permissions and file cleanup not exercised. Deleting a register entry retains the stored file |
| Campaigns, finance, compliance | Admin create/read/update/delete when unlinked | Offline storage round trips; finance/compliance editor submissions preserve revisions; live permissions pending |
| Agency settings | Admin read/update; one agency record | Offline create/read/update and stale-write rejection; not a deletable business record |
| Team | Admin creates users and changes/removes staff access | Mocked account creation, role validation, duplicate protection and failure cleanup passed; live authentication/profile/role changes pending |
| Own profile | Read/update own permitted fields and password | Existing form/permission checks; no real password changes performed |
| Audit/activity | View recorded actions; database audit is not user-editable | Existing audit schema/guard contracts reviewed; live actor/time/transaction recording pending |
| Reports/overview | Derived read views and export | No independent records to create/delete; live totals/export browser checks pending |
| Website enquiries | Validated request creates CRM data | Mocked handler validation, consent, retry ID and errors passed; live delivery still pending |
| Property assistant | Match published property data, handle AI requests | Matching and mocked endpoint checks passed; assistant does not have unrestricted CRM CRUD |

## Repeat local checks

From the website folder:

```powershell
node scripts/test-crm-all.cjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --config vite.preview.config.ts
```

The new CRUD integration test runs the actual shared-store/deletion modules against a transactional in-memory API. It checks all 12 business collections, revision progression, stale edits/deletes, failure preservation, rejection of stale deleted-record recreation and multi-record rollback. The separate editor test invokes actual form submission handlers with isolated React state and mocked form data. These do not execute PostgreSQL or test browser layout.

## Deployment acceptance still required

Use a staging project and disposable QA accounts/records, with the staff, archive/audit and `202610260001_record_deletion.sql` migrations installed. No additional SQL migration is introduced by this review.

1. Sign in as Admin, Staff and read-only Staff separately. Verify permitted screens, own profile updates and denied direct write/delete RPCs.
2. For each business collection, create a QA record, refresh/reopen, update it, refresh/reopen and compare persisted values. Delete only disposable QA records.
3. Open one record in two sessions. Save in the first; the second must receive a conflict rather than overwrite the first. Also test stale editors after deletion.
4. Create linked contact/property/enquiry/deal/lease/finance/document/task chains. Verify deletion is blocked until legitimate incoming links are resolved. Check archived property restoration remains a private draft.
5. Publish a QA property and verify the public listing; unpublish/archive/delete and verify removal. Check photos and gallery separately.
6. Submit a QA website enquiry, retry the same request ID, and verify a single successful submission plus the correct contact/task linkage.
7. Inspect audit entries after successful changes for actor, time, record, action and changed fields. Failed transactions must not appear as successful changes.
8. Exercise file upload/download, exports, filters, pagination, cancelled confirmation, incorrect confirmation IDs, Escape, keyboard focus and centred mobile/desktop dialogs.
9. Confirm reporting totals change after creates/updates/deletes and that no unrelated real records changed.

Unconnected external email delivery, portals, payments/accounting and any other advertised future integration are outside CRUD completion. Audit rows and system history intentionally do not offer arbitrary edit/delete controls. Removing CRM staff access is not the same as permanently deleting an authentication account.
