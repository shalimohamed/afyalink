-- AfyaLink database, part 10: privacy fixes before hosting (2026-11-05).
-- Run this in the Supabase SQL Editor after 0001–0009, AFTER updating the app
-- code (the old code reads profiles.phone directly, which this stops).
--
-- 1. Phone numbers can only be read by their owner and by admins.
-- 2. has_consulted() only answers about yourself.
-- 3. Patients can't send chat requests to a suspended doctor.
-- 4. A patient can only hold one slot at a time.

-- 1. Phone numbers -------------------------------------------------------------
-- Before: any logged-in user could read every verified doctor's phone number
-- straight from the API (the app never showed it, but the database allowed it).
-- Row-level security decides which ROWS you see; column permissions decide which
-- COLUMNS. Now profiles.phone can't be selected directly at all, only through
-- get_phones(), which returns your own number and, for admins, anyone's.
revoke select on public.profiles from authenticated;
grant select (id, role, full_name, created_at) on public.profiles to authenticated;

create or replace function public.get_phones(p_user_ids uuid[])
returns table (id uuid, phone text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.phone
  from public.profiles p
  where p.id = any (p_user_ids)
    and (p.id = auth.uid() or public.is_admin());
$$;

revoke execute on function public.get_phones(uuid[]) from public, anon;
grant execute on function public.get_phones(uuid[]) to authenticated;

-- 2. has_consulted() -------------------------------------------------------------
-- Every function in public can be called through the API, and this one answered
-- "has patient X seen doctor Y?" for anyone (seeing a psychiatrist is itself
-- health information). The policies only ever ask about the logged-in user, so
-- it now returns false when the caller is neither the patient nor the doctor.
create or replace function public.has_consulted(p_patient_id uuid, p_doctor_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.uid() in (p_patient_id, p_doctor_id), false)
     and exists (
       select 1
       from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where b.patient_id = p_patient_id
         and s.doctor_id = p_doctor_id
         and b.status = 'confirmed'
     );
$$;

-- 3. No chat requests to a suspended doctor ------------------------------------
-- Same as in 0002, plus the last line (get_suspended_doctors() is from 0007).
drop policy if exists "Past patients can request a follow-up chat" on public.chat_requests;
create policy "Past patients can request a follow-up chat"
  on public.chat_requests for insert to authenticated
  with check (
    patient_id = auth.uid()
    and status = 'pending'
    and public.has_consulted(auth.uid(), doctor_id)
    and doctor_id not in (select s.doctor_id from public.get_suspended_doctors() s)
  );

-- 4. One hold per patient -------------------------------------------------------
-- Same as in 0009, plus: booking a slot releases the patient's earlier hold, so
-- one person can't block a doctor's whole day by clicking "Book" on every slot.
-- (If they still pay for the released one, recordPaymentResult confirms it,
-- as long as nobody else has taken that slot in the meantime.)
create or replace function public.hold_slot(p_slot_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_slot       public.availability_slots;
  v_doctor     public.doctors;
  v_amount     integer;
  v_check_id   uuid;
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

  -- Release this patient's other holds: one slot at a time.
  update public.bookings
  set status = 'expired'
  where patient_id = auth.uid()
    and status = 'pending_payment';

  if v_doctor.fee_type = 'per_session' then
    v_amount := v_doctor.fee_kes;
  else
    -- Hourly rate times the slot length, rounded up to a whole shilling.
    v_amount := ceil(v_doctor.fee_kes * extract(epoch from (v_slot.ends_at - v_slot.starts_at)) / 3600);
  end if;

  select c.id into v_check_id
  from public.symptom_checks c
  where c.patient_id = auth.uid()
    and c.created_at > now() - interval '24 hours'
    and not exists (
      select 1 from public.bookings b
      where b.patient_id = auth.uid() and b.status = 'confirmed' and b.created_at > c.created_at
    )
  order by c.created_at desc
  limit 1;

  insert into public.bookings (patient_id, slot_id, amount_kes, symptom_check_id)
  values (auth.uid(), p_slot_id, v_amount, v_check_id)
  returning id into v_booking_id;

  return v_booking_id;
exception
  when unique_violation then
    raise exception 'Someone else is booking this slot. Please pick another one.';
end;
$$;
