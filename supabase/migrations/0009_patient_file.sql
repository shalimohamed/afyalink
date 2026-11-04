-- AfyaLink database, part 9: the patient file (2026-11-04).
-- Run this in the Supabase SQL Editor after 0001–0008.
--
-- 1. Patients can record their blood group.
-- 2. A booking remembers the symptom check the patient did just before it,
--    and only the doctor of that paid booking can read that one check. They
--    never see the patient's other symptom checks, and admins still see none.

-- 1. Blood group (empty = not known) -----------------------------------------
alter table public.patients add column if not exists blood_group text
  check (blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'));

-- Patients may change it, like their date of birth and sex (column permission).
grant update (blood_group) on public.patients to authenticated;

-- 2. The symptom check shared with a booking ----------------------------------
-- A fact about the booking ("which check its doctor may read"), so it lives on
-- the booking. Set only by hold_slot() below, never by the browser.
alter table public.bookings add column if not exists symptom_check_id uuid
  references public.symptom_checks (id) on delete set null;
create index if not exists bookings_symptom_check_id_idx on public.bookings (symptom_check_id);

-- True when the logged-in doctor has a PAID booking that this check was shared with.
create or replace function public.check_shared_with_me(p_check_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.availability_slots s on s.id = b.slot_id
    where b.symptom_check_id = p_check_id
      and b.status = 'confirmed'
      and s.doctor_id = auth.uid()
  );
$$;

revoke execute on function public.check_shared_with_me(uuid) from public, anon;
grant execute on function public.check_shared_with_me(uuid) to authenticated;

-- The conditions of the check follow automatically: their policy shows the
-- conditions of every check the user is allowed to see.
drop policy if exists "Doctors see the symptom check shared with their booking" on public.symptom_checks;
create policy "Doctors see the symptom check shared with their booking"
  on public.symptom_checks for select to authenticated
  using (public.check_shared_with_me(id));

-- Same as in 0007, plus: the patient's CURRENT symptom check is attached to
-- the booking. That's their latest check, if it's from the last 24 hours and
-- they haven't paid for a booking since it (then it belongs to that one).
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
