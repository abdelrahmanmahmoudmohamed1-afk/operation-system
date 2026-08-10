-- Operation System Enterprise X schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  is_active boolean not null default true,
  manager text default '', director text default '', mobile text default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(), project text not null default '', unit_code text not null,
  status text, building text, floor text, unit_type text, area numeric default 0, price numeric default 0,
  raw_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), unique(project, unit_code)
);
create index if not exists inventory_project_idx on public.inventory_units(project);
create index if not exists inventory_status_idx on public.inventory_units(status);
create index if not exists inventory_unit_code_idx on public.inventory_units(unit_code);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), project text not null default '', unit_code text not null,
  client_name text, mobile1 text, mobile2 text, address text, email text, status text, sales_name text,
  contract_date timestamptz, reservation_date timestamptz, sold_date timestamptz, value numeric default 0,
  raw_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), unique(project, unit_code)
);
create index if not exists clients_unit_idx on public.clients(project,unit_code);
create index if not exists clients_mobile_idx on public.clients(mobile1);

create table if not exists public.eoi_records (
  id uuid primary key default gen_random_uuid(), project text, unit_code text, client_name text, status text,
  eoi_date timestamptz default now(), raw_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(), row_number bigint unique, client_name text, phone text, project text,
  sales_name text, status text, stage text, source text, last_comment text,
  raw_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('contract','floor_plan','other')),
  project text, unit_code text, client_name text, document_type text, file_name text not null, mime_type text not null default 'application/pdf',
  bucket text not null default 'operation-documents', storage_path text not null unique, file_size bigint default 0,
  uploaded_by uuid references auth.users(id) on delete set null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists documents_unit_idx on public.documents(project,unit_code);
create index if not exists documents_client_idx on public.documents(client_name);
create index if not exists documents_kind_idx on public.documents(kind);

create table if not exists public.audit_logs (
  id bigserial primary key, user_id uuid references auth.users(id) on delete set null, action text not null,
  module text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists audit_created_idx on public.audit_logs(created_at desc);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  title text not null, due_at timestamptz not null, completed boolean not null default false,
  source text default 'manual', created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  title text default 'Operation AI', last_response_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ai_messages (
  id bigserial primary key, conversation_id uuid references public.ai_conversations(id) on delete cascade,
  role text not null check(role in ('user','assistant','tool')), content text not null default '', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  provider text not null, account_email text default '', encrypted_refresh_token text default '', metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,provider)
);
create table if not exists public.oauth_states (
  state text primary key, user_id uuid references auth.users(id) on delete cascade, provider text not null,
  expires_at timestamptz not null, created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key, value jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('operation-documents','operation-documents',false,52428800,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['application/pdf'];

alter table public.profiles enable row level security;
alter table public.inventory_units enable row level security;
alter table public.clients enable row level security;
alter table public.eoi_records enable row level security;
alter table public.leads enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reminders enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.integrations enable row level security;
alter table public.oauth_states enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "authenticated pdf insert" on storage.objects;
create policy "authenticated pdf insert" on storage.objects for insert to authenticated
with check (bucket_id='operation-documents' and lower(name) like '%.pdf');
drop policy if exists "authenticated pdf select" on storage.objects;
create policy "authenticated pdf select" on storage.objects for select to authenticated
using (bucket_id='operation-documents');
drop policy if exists "authenticated pdf update" on storage.objects;
create policy "authenticated pdf update" on storage.objects for update to authenticated
using (bucket_id='operation-documents') with check (bucket_id='operation-documents');

drop policy if exists "authenticated pdf delete" on storage.objects;
create policy "authenticated pdf delete" on storage.objects for delete to authenticated
using (bucket_id='operation-documents');
