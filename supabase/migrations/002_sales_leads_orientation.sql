-- Operation System Enterprise X 1.7.0 — Sales Organization / Targets / Lead Intelligence
create extension if not exists pgcrypto;
create table if not exists public.sales_people (
  id uuid primary key default gen_random_uuid(), employee_code text unique, name text not null unique,
  role text not null default 'sales' check(role in ('sales','manager','director')),
  manager_name text default '', director_name text default '', join_date date, leave_date date,
  is_active boolean not null default true, email text default '', mobile text default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists sales_people_active_idx on public.sales_people(is_active,role);
create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(), sales_person_id uuid references public.sales_people(id) on delete cascade,
  period_type text not null default 'monthly' check(period_type in ('monthly','quarterly','yearly')),
  period_start date not null, period_end date not null, target_value numeric not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(sales_person_id,period_type,period_start)
);
create table if not exists public.lead_history (
  id bigserial primary key, lead_id uuid references public.leads(id) on delete cascade,
  action text not null, old_value text default '', new_value text default '', sales_name text default '',
  user_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
alter table public.leads add column if not exists assigned_at timestamptz;
alter table public.leads add column if not exists status_changed_at timestamptz;
alter table public.leads add column if not exists last_activity_at timestamptz;
alter table public.leads add column if not exists lead_key text;
create unique index if not exists leads_lead_key_uidx on public.leads(lead_key) where lead_key is not null and lead_key <> '';
alter table public.sales_people enable row level security;
alter table public.sales_targets enable row level security;
alter table public.lead_history enable row level security;
