-- AfyaLink database, part 6: unread chat messages (2026-10-11).
-- Run this in the Supabase SQL Editor after 0001–0005.
--
-- Each chat remembers when the patient and the doctor last opened it. A
-- message is unread for you if the other person sent it after you last opened
-- the chat. Both times are facts about that one chat (3NF).

alter table public.chat_requests add column if not exists patient_last_read_at timestamptz;
alter table public.chat_requests add column if not exists doctor_last_read_at timestamptz;

-- "I've opened this chat": records the time for the caller's own side only.
create or replace function public.mark_chat_read(p_chat_request_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.chat_requests set patient_last_read_at = now()
  where id = p_chat_request_id and patient_id = auth.uid();

  update public.chat_requests set doctor_last_read_at = now()
  where id = p_chat_request_id and doctor_id = auth.uid();
end;
$$;

-- How many messages sent to the caller they haven't seen yet, across all chats.
create or replace function public.unread_chat_messages()
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::integer
  from public.messages m
  join public.chat_requests c on c.id = m.chat_request_id
  where m.sender_id <> auth.uid()
    and (
      (c.patient_id = auth.uid() and (c.patient_last_read_at is null or m.created_at > c.patient_last_read_at))
      or (c.doctor_id = auth.uid() and (c.doctor_last_read_at is null or m.created_at > c.doctor_last_read_at))
    );
$$;

revoke execute on function public.mark_chat_read(uuid) from public, anon;
revoke execute on function public.unread_chat_messages() from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.unread_chat_messages() to authenticated;
