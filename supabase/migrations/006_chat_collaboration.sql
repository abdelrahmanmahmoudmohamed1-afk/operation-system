-- Operation System Enterprise X 1.7.8 - Chat Collaboration (bootstrap-safe)
-- Safe to run once in Supabase SQL Editor even if 005_internal_chat.sql was skipped.

create extension if not exists pgcrypto;

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);

create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id,created_at);
create index if not exists chat_members_user_idx on public.chat_members(user_id);

alter table public.chat_conversations
  add column if not exists is_announcement_channel boolean not null default false;

alter table public.chat_messages
  add column if not exists message_type text not null default 'text',
  add column if not exists reply_to_id bigint references public.chat_messages(id) on delete set null,
  add column if not exists mention_user_ids jsonb not null default '[]'::jsonb;

alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages alter column body set default '';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='chat_messages_body_length_check') then
    alter table public.chat_messages add constraint chat_messages_body_length_check check (char_length(body) <= 4000);
  end if;
end $$;

create table if not exists public.chat_attachments (
  id bigserial primary key,
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  bucket text not null default 'chat-attachments',
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chat_attachments_message_idx on public.chat_attachments(message_id);
create index if not exists chat_messages_reply_idx on public.chat_messages(reply_to_id);
create index if not exists chat_messages_type_idx on public.chat_messages(message_type);
create unique index if not exists chat_announcement_channel_unique on public.chat_conversations(is_announcement_channel) where is_announcement_channel = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments', 'chat-attachments', false, 15728640,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set public=false, file_size_limit=15728640, allowed_mime_types=excluded.allowed_mime_types;

alter table public.chat_conversations enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_attachments enable row level security;

notify pgrst, 'reload schema';
