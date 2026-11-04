-- AfyaLink database, part 8: the prescription completes the consultation (2026-11-04).
-- Run this in the Supabase SQL Editor after 0001–0007.
--
-- A consultation is over once the doctor issues the prescription, or, if
-- there's none, once its time slot has ended (the same rule as
-- isConsultationOver in lib/consultations.ts). "Over" isn't stored: it's
-- worked out from the slot's end time and whether a prescription exists.

-- Reviews are allowed once the consultation is over (was: only after the slot ended).
create or replace function public.booking_has_ended(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.availability_slots s on s.id = b.slot_id
    where b.id = p_booking_id
      and b.status = 'confirmed'
      and (s.ends_at < now() or exists (select 1 from public.prescriptions p where p.booking_id = b.id))
  );
$$;

-- Same as in 0004, except that "consultations completed" also counts
-- consultations with a prescription whose time slot hasn't ended yet.
create or replace function public.admin_analytics(p_days integer default 14)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'Africa/Nairobi')::date;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only admins can see analytics.';
  end if;

  select jsonb_build_object(
    'patients',          (select count(*) from public.patients),
    'doctors_verified',  (select count(*) from public.doctors where verification_status = 'verified'),
    'doctors_pending',   (select count(*) from public.doctors where verification_status = 'pending'),
    'consultations',     (select count(*) from public.bookings where status = 'confirmed'),
    'consultations_done', (
      select count(*) from public.bookings b
      join public.availability_slots s on s.id = b.slot_id
      where b.status = 'confirmed'
        and (s.ends_at < now() or exists (select 1 from public.prescriptions p where p.booking_id = b.id))
    ),
    'revenue_kes',       (select coalesce(sum(amount_kes), 0) from public.bookings where status = 'confirmed'),
    'symptom_checks',    (select count(*) from public.symptom_checks),
    'red_flags',         (select count(*) from public.symptom_checks where red_flag_triggered),
    'prescriptions',     (select count(*) from public.prescriptions),
    'average_rating',    (select round(avg(rating), 1) from public.reviews),
    'review_count',      (select count(*) from public.reviews),

    -- Paid consultations per day (Kenyan time) for the last p_days days,
    -- including days with zero.
    'bookings_per_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'count', coalesce(c.n, 0)) order by d.day), '[]'::jsonb)
      from (select (today - g)::date as day from generate_series(0, p_days - 1) as g) d
      left join (
        select (confirmed_at at time zone 'Africa/Nairobi')::date as day, count(*) as n
        from public.bookings
        where status = 'confirmed' and confirmed_at is not null
        group by 1
      ) c on c.day = d.day
    ),

    -- Paid consultations per specialty, most first.
    'by_specialty', (
      select coalesce(jsonb_agg(jsonb_build_object('label', x.label, 'count', x.n) order by x.n desc, x.label), '[]'::jsonb)
      from (
        select sp.label, count(*) as n
        from public.bookings b
        join public.availability_slots s on s.id = b.slot_id
        join public.doctors d on d.id = s.doctor_id
        join public.specialties sp on sp.id = d.specialty_id
        where b.status = 'confirmed'
        group by sp.label
      ) x
    ),

    -- Symptom checks per urgency level (counts only).
    'urgency', (
      select coalesce(jsonb_object_agg(u.urgency, u.n), '{}'::jsonb)
      from (select urgency::text, count(*) as n from public.symptom_checks group by urgency) u
    )
  ) into result;

  return result;
end;
$$;
