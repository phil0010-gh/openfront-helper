grant usage on schema public to anon;
grant select, insert, delete on public.chat_messages to anon;

drop policy if exists "Anyone can read chat messages" on public.chat_messages;
drop policy if exists "Anyone can read recent chat messages" on public.chat_messages;
create policy "Anyone can read recent chat messages"
on public.chat_messages
for select
to anon
using (created_at >= now() - interval '24 hours');

drop policy if exists "Anyone can delete expired chat messages" on public.chat_messages;
create policy "Anyone can delete expired chat messages"
on public.chat_messages
for delete
to anon
using (created_at < now() - interval '24 hours');

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
