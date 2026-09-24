# Enterprise X 1.7.5 — Password Control

- Added Admin password reset and temporary password generation.
- Developer identity: abdelrahmanmahmoudmohamed1@gmail.com.
- Only the developer receives a one-time reveal of a password that was just set/generated.
- Existing passwords cannot be recovered or displayed because Supabase Auth stores password verifiers, not readable passwords.
- Added must_change_password flag for temporary-password workflow.
- Password values are never written to audit logs or profiles.
