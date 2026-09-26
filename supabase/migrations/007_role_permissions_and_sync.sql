-- Operation System 1.7.7 role hardening. Run after 006.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','operations','sales','user'));
alter table public.profiles add column if not exists assigned_sales_name text not null default '';
alter table public.profiles add column if not exists can_delete boolean not null default false;
alter table public.profiles add column if not exists can_write_sheets boolean not null default true;
create index if not exists profiles_role_active_idx on public.profiles(role,is_active);
notify pgrst, 'reload schema';
