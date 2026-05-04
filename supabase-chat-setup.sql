create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('global', 'lobby')),
  room_id text not null,
  user_id text not null,
  display_name text not null check (char_length(display_name) between 1 and 32),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

grant usage on schema public to anon;
grant select, insert on public.chat_messages to anon;

create policy "Anyone can read chat messages"
on public.chat_messages
for select
to anon
using (true);

create policy "Anyone can send chat messages"
on public.chat_messages
for insert
to anon
with check (
  char_length(display_name) between 1 and 32
  and char_length(message) between 1 and 500
  and room_type in ('global', 'lobby')
);

create index chat_messages_room_created_idx
on public.chat_messages (room_type, room_id, created_at desc);

alter publication supabase_realtime add table public.chat_messages;
