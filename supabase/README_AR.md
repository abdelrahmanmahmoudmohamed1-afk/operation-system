# Supabase setup
1. Create a Supabase project.
2. Open SQL Editor and run `migrations/001_operation_system.sql`.
3. Create the first user in Authentication > Users.
4. Copy that user's UUID and insert the matching admin profile:

```sql
insert into public.profiles(id,email,username,full_name,role,is_active)
values ('USER_UUID','your@email.com','admin','Administrator','admin',true)
on conflict (id) do update set role='admin', is_active=true;
```

5. Import your real inventory / CRM / EOI / leads into the matching tables. Keep the original source row in `raw_data` where possible.
