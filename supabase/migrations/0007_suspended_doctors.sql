-- AfyaLink database, part 7: suspended doctors can't be found or booked (2026-10-30).
-- Run this in the Supabase SQL Editor after 0001–0006.
--
-- Suspending an account bans its login, which Supabase Auth stores in
-- auth.users.banned_until. We read it from there instead of copying it into
-- the doctors table, so there's only one copy and the two can't disagree (3NF).

-- True while an admin has this account suspended.
create or replace function public.is_suspended(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = p_user_id and banned_until > now()
  );
$$;

-- Suspended doctors, so the doctor search can leave them out.
create or replace function public.get_suspended_doctors()
returns table (doctor_id uuid)
language sql stable security definer set search_path = ''
as $$
  select d.id from public.doctors d where public.is_suspended(d.id);
$$;

-- Same as in 0002, except that a suspended doctor's slots aren't listed.
create or replace function public.get_available_slots(p_doctor_id uuid)
returns setof public.availability_slots
language sql stable security definer set search_path = ''
as $$
  select s.*
  from public.availability_slots s
  join public.doctors d on d.id = s.doctor_id
  where s.doctor_id = p_doctor_id
    and d.verification_status = 'verified'
    and not public.is_suspended(d.id)
    and s.starts_at > now()
    and not public.slot_is_taken(s.id)
  order by s.starts_at;
$$;

-- Same as in 0002, except that a suspended doctor can't be booked. This is the
-- real check: it still applies if someone calls the function directly.
create or replace function public.hold_slot(p_slot_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_slot       public.availability_slots;
  v_doctor     public.doctors;
  v_amount     integer;
  v_booking_id uuid;
begin
  if public.my_role() is distinct from 'patient' then
    raise exception 'Only patients can book consultations.';
  end if;

  -- "for update" locks the slot row, so if two patients click at the same
  -- moment, the second one waits until the first one's hold is saved.
  select * into v_slot from public.availability_slots where id = p_slot_id for update;
  if not found then
    raise exception 'This slot no longer exists.';
  end if;
  if v_slot.starts_at <= now() then
    raise exception 'This slot has already started.';
  end if;

  select * into v_doctor from public.doctors where id = v_slot.doctor_id;
  if v_doctor.verification_status <> 'verified' or public.is_suspended(v_doctor.id) then
    raise exception 'This doctor is not taking bookings.';
  end if;

  -- Release holds on this slot whose 5 minutes are up.
  update public.bookings
  set status = 'expired'
  where slot_id = p_slot_id
    and status = 'pending_payment'
    and created_at <= now() - interval '5 minutes';

  if v_doctor.fee_type = 'per_session' then
    v_amount := v_doctor.fee_kes;
  else
    -- Hourly rate times the slot length, rounded up to a whole shilling.
    v_amount := ceil(v_doctor.fee_kes * extract(epoch from (v_slot.ends_at - v_slot.starts_at)) / 3600);
  end if;

  insert into public.bookings (patient_id, slot_id, amount_kes)
  values (auth.uid(), p_slot_id, v_amount)
  returning id into v_booking_id;

  return v_booking_id;
exception
  when unique_violation then
    raise exception 'Someone else is booking this slot. Please pick another one.';
end;
$$;

-- is_suspended() can look up any account, so only the functions above may use
-- it (they run with the owner's rights, so they're not affected by this revoke).
revoke execute on function public.is_suspended(uuid) from public, anon, authenticated;
revoke execute on function public.get_suspended_doctors() from public, anon;
grant execute on function public.get_suspended_doctors() to authenticated;
