-- Operation System Enterprise X 1.7.4
-- Per-user module permission matrix. Safe, additive migration.

alter table if exists public.profiles
  add column if not exists permissions jsonb default null;

comment on column public.profiles.permissions is
  'Explicit array of allowed module route keys for User accounts. NULL keeps the role default; [] means no modules. Admin always has full access.';
