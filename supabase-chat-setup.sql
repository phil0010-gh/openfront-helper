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
grant select, insert, delete on public.chat_messages to anon;

drop policy if exists "Anyone can read chat messages" on public.chat_messages;
create policy "Anyone can read recent chat messages"
on public.chat_messages
for select
to anon
using (created_at >= now() - interval '24 hours');

drop policy if exists "Anyone can send chat messages" on public.chat_messages;
create policy "Anyone can send chat messages"
on public.chat_messages
for insert
to anon
with check (
  char_length(display_name) between 1 and 32
  and char_length(message) between 1 and 500
  and room_type in ('global', 'lobby')
);

drop policy if exists "Anyone can delete expired chat messages" on public.chat_messages;
create policy "Anyone can delete expired chat messages"
on public.chat_messages
for delete
to anon
using (created_at < now() - interval '24 hours');

create index chat_messages_room_created_idx
on public.chat_messages (room_type, room_id, created_at desc);

create index if not exists chat_messages_created_idx
on public.chat_messages (created_at);

create or replace function public.delete_expired_chat_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.chat_messages
  where created_at < now() - interval '24 hours';
  return null;
end;
$$;

drop trigger if exists chat_messages_delete_expired_after_insert on public.chat_messages;
create trigger chat_messages_delete_expired_after_insert
after insert on public.chat_messages
for each statement
execute function public.delete_expired_chat_messages();

alter publication supabase_realtime add table public.chat_messages;
