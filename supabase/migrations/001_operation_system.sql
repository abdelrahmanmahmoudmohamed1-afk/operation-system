create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_units (
  id uuid primary key default gen_random_uuid(), project text not null default '', unit_code text not null,
  status text, building text, floor text, unit_type text, area numeric default 0, price numeric default 0,
  raw_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  unique(project, unit_code)
);
create index if not exists inventory_project_idx on public.inventory_units(project);
create index if not exists inventory_status_idx on public.inventory_units(status);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(), project text not null default '', unit_code text not null,
  client_name text, mobile1 text, mobile2 text, address text, email text, status text, sales_name text,
  contract_date timestamptz, reservation_date timestamptz, sold_date timestamptz, value numeric default 0,
  raw_data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  unique(project, unit_code)
);
create index if not exists clients_name_idx on public.clients using gin (to_tsvector('simple', coalesce(client_name,'')));

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

create table if not exists public.audit_logs (
  id bigserial primary key, user_id uuid references auth.users(id) on delete set null, action text not null,
  module text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  title text not null, due_at timestamptz not null, completed boolean not null default false, created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('operation-documents','operation-documents',false,26214400,array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=26214400, allowed_mime_types=array['application/pdf'];

alter table public.profiles enable row level security;
alter table public.inventory_units enable row level security;
alter table public.clients enable row level security;
alter table public.eoi_records enable row level security;
alter table public.leads enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reminders enable row level security;

-- App data is intentionally read/written through the Vercel backend using the Supabase secret key.
-- Storage uploads are the exception: authenticated users upload PDFs directly to avoid serverless body-size limits.
drop policy if exists "authenticated pdf insert" on storage.objects;
create policy "authenticated pdf insert" on storage.objects for insert to authenticated
with check (bucket_id='operation-documents' and lower(name) like '%.pdf');

drop policy if exists "authenticated pdf select" on storage.objects;
create policy "authenticated pdf select" on storage.objects for select to authenticated
using (bucket_id='operation-documents');
