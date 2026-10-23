# Activate profiles and Admin / Staff access

## One-time activation

1. In the existing Supabase project's SQL Editor, run **supabase/migrations/202610230001_staff_profiles_roles.sql** in full. The original shared CRM migration must already be installed. Back up production before applying schema changes.
2. Deploy this website update to Netlify. The account-creation function needs the existing server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` variable in the Functions scope for this deploy context. Never put the key in browser code.
3. Sign in again. Open **My profile**, enter your full name and save. The Overview greeting uses your first name, for example “Hello Katleho.”
4. As an Admin, open **Team** to create an account using a name, email, initial password and Admin or Staff role. Share credentials privately. No invitation email is sent. Ask the user to change their password under My profile.
5. Test with a separate Staff account and verify the restricted sections are absent. Do not promote an existing viewer simply to make editing work.

The migration preserves existing admins, converts editors to Staff, and preserves viewer accounts as read-only Staff. Initial names are taken from existing profile metadata or the email prefix; each user can correct their name. No demo accounts are created by this change.

## Access matrix

| Capability | Admin | Staff | Existing viewer |
|---|---|---|---|
| Own name, phone, job title, password | Yes | Yes | Yes |
| Contacts, inbox, properties, deals, viewings, tasks, rentals, maintenance, operational documents | Read/write | Read/write | Read only |
| Publish/unpublish verified property listings | Yes | Yes | No |
| Finance, compliance, marketing records | Yes | No | No |
| Reports, full exports, agency settings | Yes | No | No |
| Create users, change roles, remove access | Yes | No | No |

Settings, finance, compliance and marketing records are restricted at the database, not merely hidden in navigation. Activity entries are visible to staff only when linked to operational records. Assignment labels are provided by a narrow helper, without exposing the private settings record. Reports aggregate operational information that staff can already read; hiding Reports is a workflow restriction, not per-record secrecy for those operational values.

Operational records and private operational documents remain shared across authorized staff; this is not per-agent ownership isolation. Do not upload admin-only financial or compliance documents to the shared operational document bucket. Previous exports/downloads cannot be recalled when access changes.

The protected account endpoint validates the bearer token and rechecks Admin membership before using Supabase's server-only Auth admin API. Enrollment rechecks the initiating admin inside the database. A failed enrollment attempts to remove only the newly created login. An existing email is never automatically enrolled or promoted. If an existing Auth account needs enrollment, a project administrator can explicitly enroll it in the dashboard as before.

Admins cannot change/remove their own access from Team. Another admin must do that; the database also guards the last administrator. Removing access preserves business records and removes CRM membership, not the underlying Auth login. Re-enrollment of a removed account currently requires the project administrator. An already-open session rechecks membership/role every 15 seconds and on focus; database restrictions apply to new requests immediately. Cached/downloaded information cannot be retroactively erased.

## Connection and notifications

- Header: Online with a pulsing green dot after workspace data loads; Offline when the browser reports offline; Connection issue when loading records fails. This indicates recent workspace connectivity, not a guarantee every downstream service is healthy.
- Settings: Supabase connection details and integration status.
- Bell: red dot while there are unfinished tasks; clicking opens Tasks. This is a pending-task indicator, not a new unread-notification system.
- Reduced-motion preference disables the green pulse.

## Verification before release

Run `node scripts/test-staff-users.mjs`, `node scripts/test-staff-ui.cjs`, `node scripts/test-shared-store.cjs`, TypeScript and the deployment build. Local mocks do not prove deployed RLS.

On an isolated project, verify: self profile updates persist; editing another user's profile/role directly is rejected; Staff cannot read/write restricted collections; admin account creation succeeds without changing the admin's own session; duplicate email does not modify an existing account; role downgrade/revocation removes access; a viewer stays read-only; password change rejects a wrong current password; pending-task dot is red; connection status changes on network loss.

Apply the SQL update before deploying this UI. The app deliberately refuses entry when the profile access function is unavailable, rather than continuing with old, broader permissions. This change does not itself apply SQL to the hosted project or deploy the site.

References: [Supabase server-only user creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [Supabase password security](https://supabase.com/docs/guides/auth/password-security).
