-- Operation System Enterprise X 1.7.6 - internal chat
create table if not exists public.chat_conversations (id uuid primary key default gen_random_uuid(), name text, is_group boolean not null default false, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.chat_members (conversation_id uuid references public.chat_conversations(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade, last_read_at timestamptz, joined_at timestamptz not null default now(), primary key(conversation_id,user_id));
create table if not exists public.chat_messages (id bigserial primary key, conversation_id uuid not null references public.chat_conversations(id) on delete cascade, sender_id uuid references auth.users(id) on delete set null, body text not null check(char_length(body) between 1 and 4000), created_at timestamptz not null default now());
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id,created_at);
create index if not exists chat_members_user_idx on public.chat_members(user_id);
alter table public.chat_conversations enable row level security;alter table public.chat_members enable row level security;alter table public.chat_messages enable row level security;
notify pgrst, 'reload schema';
