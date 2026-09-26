-- Apply to the connected Supabase Postgres database before deploying.
-- Existing EOI rows and numbers remain unchanged.
create table if not exists public.eoi_numbering_settings (
 id integer primary key default 1 check (id=1),
 increment integer not null default 1 check (increment between 1 and 1000),
 last_number bigint not null default 0
);
insert into public.eoi_numbering_settings(id) values (1) on conflict do nothing;
create unique index if not exists eoi_request_id_unique on public.eoi_records ((raw_data->>'eoiRequestId'))
 where raw_data ? 'eoiRequestId' and raw_data->>'eoiRequestId' <> '';
create unique index if not exists eoi_number_unique on public.eoi_records ((raw_data->>'eoiNumber'))
 where raw_data ? 'eoiNumber' and raw_data->>'eoiNumber' ~ '^[0-9]+$';
-- IMPORTANT: audit pre-existing duplicates before applying unique indexes.
