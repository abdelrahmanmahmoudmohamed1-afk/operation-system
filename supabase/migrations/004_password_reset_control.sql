alter table public.profiles add column if not exists must_change_password boolean not null default false;
comment on column public.profiles.must_change_password is 'Require the user to change a temporary password after an admin/developer reset.';
notify pgrst, 'reload schema';
