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

create or replace function public.validate_chat_message()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.message ~* '(https?://|www\.|[a-z0-9.-]+\.[a-z]{2,}(/|\s|$))' then
    raise exception 'Links are not allowed in chat messages';
  end if;

  if (
    select count(*)
    from public.chat_messages
    where user_id = new.user_id
      and created_at > now() - interval '30 seconds'
  ) >= 5 then
    raise exception 'You are sending messages too quickly';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_chat_message_before_insert on public.chat_messages;
create trigger validate_chat_message_before_insert
before insert on public.chat_messages
for each row
execute function public.validate_chat_message();
