import pg from 'pg';
const { Pool } = pg;

let pool;
let readyPromise;

function connectionConfig(){
  // Vercel's Supabase integration provides POSTGRES_URL in addition to the
  // individual connection fields. Prefer the URL because it follows the
  // connection mode selected by the integration and is safer for serverless.
  const rawConnectionString=process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
  if(rawConnectionString) {
    // Some managed Postgres URLs include sslmode/sslrootcert parameters. In pg,
    // those URL parameters can override the explicit ssl object and re-enable
    // certificate-chain verification. Normalize them for Supabase/Vercel.
    let connectionString=rawConnectionString;
    try {
      const u=new URL(rawConnectionString);
      ['sslmode','sslrootcert','sslcert','sslkey'].forEach(k=>u.searchParams.delete(k));
      connectionString=u.toString();
    } catch {}
    return {connectionString,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:10000};
  }
  const host=process.env.POSTGRES_HOST || process.env.PGHOST;
  const user=process.env.POSTGRES_USER || process.env.PGUSER;
  const password=process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
  const database=process.env.POSTGRES_DATABASE || process.env.PGDATABASE || 'postgres';
  const port=Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432);
  if(!host||!user||!password) return null;
  return {host,user,password,database,port,ssl:{rejectUnauthorized:false},max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:10000};
}

export function postgresConfigured(){ return Boolean(connectionConfig()); }
export function dbPool(){ if(!pool){const cfg=connectionConfig();if(!cfg) return null;pool=new Pool(cfg);} return pool; }

const SCHEMA_SQL = String.raw`
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
alter table public.sales_people enable row level security;
alter table public.sales_targets enable row level security;
alter table public.lead_history enable row level security;
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
`;

export async function ensureSchema(){
  if(readyPromise) return readyPromise;
  readyPromise=(async()=>{
    const p=dbPool();
    if(!p) return {ok:false,configured:false,message:'Postgres environment variables are missing'};
    const client=await p.connect();
    try{ await client.query(SCHEMA_SQL); return {ok:true,configured:true}; }
    finally{ client.release(); }
  })().catch(err=>{ readyPromise=null; throw err; });
  return readyPromise;
}

export async function tableCounts(){
  const p=dbPool(); if(!p) return {};
  const names=['profiles','inventory_units','clients','eoi_records','leads','sales_people','sales_targets','lead_history','documents','audit_logs','reminders'];
  const out={};
  for(const name of names){try{const r=await p.query(`select count(*)::int as count from public.${name}`);out[name]=r.rows[0]?.count||0;}catch{out[name]=null;}}
  return out;
}
