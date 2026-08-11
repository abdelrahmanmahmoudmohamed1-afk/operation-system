-- Operation System Enterprise X 1.7.7 - Chat Collaboration
-- Run once in Supabase SQL Editor after 005_internal_chat.sql.

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

alter table public.chat_attachments enable row level security;
notify pgrst, 'reload schema';
