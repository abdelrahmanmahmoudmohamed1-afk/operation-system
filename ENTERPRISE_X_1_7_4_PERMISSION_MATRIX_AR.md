# Operation System Enterprise X 1.7.4 — Permission Matrix

- Per-user module access matrix inside Users > Manage.
- Presets: Select All, Operations, Sales, Viewer, Clear.
- Admin retains full access by design.
- User permissions are stored centrally in Supabase `profiles.permissions`.
- Existing users remain backward-compatible: NULL permissions use the previous User role defaults.
- Explicit empty array means the User has no application modules.
- Sidebar and direct hash routing both honor the user matrix.
- Changes take effect on the next login.

## Required one-time migration
Run `migrations/003_user_permission_matrix.sql` (or the copy under `supabase/migrations`) once in Supabase SQL Editor before deploying/using the matrix.
