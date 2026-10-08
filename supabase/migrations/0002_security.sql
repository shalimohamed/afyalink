-- AfyaLink database, part 2 of 2: security.
-- Row-level security (RLS) on every table, the signup trigger, the functions
-- the app calls, storage buckets and realtime. Run after 0001_tables.sql.
--
-- How RLS works: once it's enabled on a table, nobody can see or change any
-- row unless a policy allows it. Policies use auth.uid(), the ID of the
-- logged-in user, which Supabase reads from their login token. The server's
-- service-role key skips RLS; we only use it for trusted jobs like the M-Pesa
-- callback.

-- ===========================================================================
-- 1. Helper functions used inside policies
-- "security definer" means the function runs with the owner's rights, so it
-- can look up other tables without triggering their policies (otherwise two
-- tables whose policies check each other would loop forever).
-- ===========================================================================

create function public.my_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.my_role() = 'admin', false);
$$;

create function public.booking_patient_id(p_booking_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select patient_id from public.bookings where id = p_booking_id;
$$;

-- A booking doesn't store doctor_id (that would break 3NF, since the slot
-- already says who the doctor is), so we look it up through the slot.
create function public.booking_doctor_id(p_booking_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select s.doctor_id
  from public.bookings b
  join public.availability_slots s on s.id = b.slot_id
  where b.id = p_booking_id;
$$;

-- True when the patient paid for a consultation with the doctor at some point.
create function public.has_consulted(p_patient_id uuid, p_doctor_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.availability_slots s on s.id = b.slot_id
    where b.patient_id = p_patient_id
      and s.doctor_id = p_doctor_id
      and b.status = 'confirmed'
  );
$$;

-- True when the logged-in doctor treats this patient (booking or chat request).
create function public.is_my_patient(p_patient_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_consulted(p_patient_id, auth.uid())
      or exists (
        select 1 from public.chat_requests
        where patient_id = p_patient_id and doctor_id = auth.uid()
      );
$$;

create function public.slot_booked_by_me(p_slot_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.bookings
    where slot_id = p_slot_id and patient_id = auth.uid()
  );
$$;

-- A slot is taken while it has a confirmed booking or a payment hold that
-- is less than 5 minutes old.
create function public.slot_is_taken(p_slot_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.bookings
    where slot_id = p_slot_id
      and (status = 'confirmed'
           or (status = 'pending_payment' and created_at > now() - interval '5 minutes'))
  );
$$;

-- Reviews are allowed once a paid consultation's time slot is over.
create function public.booking_has_ended(p_booking_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.availability_slots s on s.id = b.slot_id
    where b.id = p_booking_id and b.status = 'confirmed' and s.ends_at < now()
  );
$$;

-- An accepted chat stays open for 3 hours after the doctor accepts.
create function public.chat_is_open(p_chat_request_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.chat_requests
    where id = p_chat_request_id
      and status = 'accepted'
      and now() < responded_at + interval '3 hours'
  );
$$;

-- ===========================================================================
-- 2. Signup: create the profile automatically when someone registers.
-- The register page sends full_name, phone, role and the doctor fields as
-- "user metadata". Nobody can make themselves an admin this way: any role
-- other than 'doctor' becomes 'patient'.
-- ===========================================================================

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new_role public.user_role := case when meta ->> 'role' = 'doctor' then 'doctor' else 'patient' end;
begin
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, new_role, coalesce(meta ->> 'full_name', new.email), meta ->> 'phone');

  if new_role = 'doctor' then
    insert into public.doctors (id, specialty_id, registration_number, fee_type, fee_kes)
    values (
      new.id,
      meta ->> 'specialty',
      meta ->> 'registration_number',
      (meta ->> 'fee_type')::public.fee_type,
      (meta ->> 'fee_kes')::integer
    );
  else
    insert into public.patients (id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- 3. Functions the app calls (through supabase.rpc). They do the checks
-- in the database, so a user can't skip them by calling the API directly.
-- ===========================================================================

-- Patient starts paying for a slot: hold it for 5 minutes. Returns the
-- booking ID. The price is worked out here, never sent by the browser.
create function public.hold_slot(p_slot_id uuid)
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
  if v_doctor.verification_status <> 'verified' then
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

-- Free future slots of a verified doctor. Patients can't see other patients'
-- bookings, so this function does the "is it taken?" check for them.
create function public.get_available_slots(p_doctor_id uuid)
returns setof public.availability_slots
language sql stable security definer set search_path = ''
as $$
  select s.*
  from public.availability_slots s
  join public.doctors d on d.id = s.doctor_id
  where s.doctor_id = p_doctor_id
    and d.verification_status = 'verified'
    and s.starts_at > now()
    and not public.slot_is_taken(s.id)
  order by s.starts_at;
$$;

-- Average rating per doctor. Calculated when asked, never stored, because a
-- stored average would be a second copy of data the reviews already hold.
create function public.get_doctor_ratings()
returns table (doctor_id uuid, average_rating numeric, review_count bigint)
language sql stable security definer set search_path = ''
as $$
  select s.doctor_id, round(avg(r.rating), 1), count(*)
  from public.reviews r
  join public.bookings b on b.id = r.booking_id
  join public.availability_slots s on s.id = b.slot_id
  group by s.doctor_id;
$$;

-- A doctor's reviews for their public profile, without the patients' names.
create function public.get_doctor_reviews(p_doctor_id uuid)
returns table (rating smallint, comment text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.rating, r.comment, r.created_at
  from public.reviews r
  join public.bookings b on b.id = r.booking_id
  join public.availability_slots s on s.id = b.slot_id
  where s.doctor_id = p_doctor_id
  order by r.created_at desc
  limit 50;
$$;

-- Admin verifies or rejects a doctor.
create function public.review_doctor(p_doctor_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can verify doctors.';
  end if;
  if p_approve and not exists (
    select 1 from public.doctors where id = p_doctor_id and licence_path is not null
  ) then
    raise exception 'This doctor has not uploaded a licence yet.';
  end if;

  update public.doctors
  set verification_status = (case when p_approve then 'verified' else 'rejected' end)::public.verification_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = case when p_approve then null else p_reason end
  where id = p_doctor_id;

  if not found then
    raise exception 'Doctor not found.';
  end if;
end;
$$;

-- Doctor accepts or rejects a follow-up chat request. Accepting opens the
-- chat for 3 hours from now.
create function public.respond_chat_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.chat_requests
  set status = (case when p_accept then 'accepted' else 'rejected' end)::public.chat_status,
      responded_at = now()
  where id = p_request_id
    and doctor_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Chat request not found, or it was already answered.';
  end if;
end;
$$;

-- ===========================================================================
-- 4. Table permissions. Logged-out visitors ("anon") can only read the
-- specialty list. Logged-in users ("authenticated") can read tables (RLS then
-- filters the rows) but can only change the columns listed here. Bookings and
-- payments can't be written directly at all: bookings go through hold_slot()
-- and payments are written by the server after M-Pesa replies.
-- ===========================================================================

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

grant select on public.specialties to anon;
grant select on all tables in schema public to authenticated;

grant update (full_name, phone)                     on public.profiles to authenticated;
grant update (date_of_birth, sex)                   on public.patients to authenticated;
grant update (bio, fee_type, fee_kes, licence_path) on public.doctors to authenticated;
grant insert, update (starts_at, ends_at), delete   on public.availability_slots to authenticated;
grant insert                                        on public.symptom_checks to authenticated;
grant insert                                        on public.symptom_check_conditions to authenticated;
grant insert, update (diagnosis, notes, pdf_path)   on public.prescriptions to authenticated;
grant insert, update, delete                        on public.prescription_items to authenticated;
grant insert                                        on public.reviews to authenticated;
grant insert                                        on public.chat_requests to authenticated;
grant insert                                        on public.messages to authenticated;

-- Functions: only logged-in users can call them.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- ===========================================================================
-- 5. Row-level security policies
-- ===========================================================================

alter table public.specialties              enable row level security;
alter table public.profiles                 enable row level security;
alter table public.patients                 enable row level security;
alter table public.doctors                  enable row level security;
alter table public.availability_slots       enable row level security;
alter table public.bookings                 enable row level security;
alter table public.payments                 enable row level security;
alter table public.symptom_checks           enable row level security;
alter table public.symptom_check_conditions enable row level security;
alter table public.prescriptions            enable row level security;
alter table public.prescription_items       enable row level security;
alter table public.reviews                  enable row level security;
alter table public.chat_requests            enable row level security;
alter table public.messages                 enable row level security;

-- specialties ---------------------------------------------------------------
create policy "Anyone can read specialties"
  on public.specialties for select to anon, authenticated
  using (true);

-- profiles ------------------------------------------------------------------
create policy "Users see their own profile, verified doctors, and their patients"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.doctors d where d.id = profiles.id and d.verification_status = 'verified')
    or public.is_my_patient(id)
  );

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid());

-- patients ------------------------------------------------------------------
create policy "Patients see themselves; doctors see their patients"
  on public.patients for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.is_my_patient(id));

create policy "Patients update their own details"
  on public.patients for update to authenticated
  using (id = auth.uid());

-- doctors -------------------------------------------------------------------
-- Unverified doctors are hidden from everyone except themselves and admins.
create policy "Verified doctors are visible"
  on public.doctors for select to authenticated
  using (verification_status = 'verified' or id = auth.uid() or public.is_admin());

create policy "Doctors update their own profile"
  on public.doctors for update to authenticated
  using (id = auth.uid());

-- availability_slots --------------------------------------------------------
create policy "Slots of verified doctors are visible"
  on public.availability_slots for select to authenticated
  using (
    doctor_id = auth.uid()
    or public.is_admin()
    or public.slot_booked_by_me(id)
    or exists (select 1 from public.doctors d where d.id = doctor_id and d.verification_status = 'verified')
  );

create policy "Doctors add their own future slots"
  on public.availability_slots for insert to authenticated
  with check (doctor_id = auth.uid() and starts_at > now());

create policy "Doctors change their own slots while free"
  on public.availability_slots for update to authenticated
  using (doctor_id = auth.uid() and not public.slot_is_taken(id))
  with check (doctor_id = auth.uid() and starts_at > now());

create policy "Doctors delete their own slots while free"
  on public.availability_slots for delete to authenticated
  using (doctor_id = auth.uid() and not public.slot_is_taken(id));

-- bookings (no insert/update policies: use hold_slot() and the M-Pesa callback)
create policy "Patients and doctors see their own bookings"
  on public.bookings for select to authenticated
  using (
    patient_id = auth.uid()
    or public.booking_doctor_id(id) = auth.uid()
    or public.is_admin()
  );

-- payments (written only by the server) -------------------------------------
create policy "Patients see their own payments"
  on public.payments for select to authenticated
  using (public.booking_patient_id(booking_id) = auth.uid() or public.is_admin());

-- symptom_checks: private to the patient, not even admins ---------------------
create policy "Patients see their own symptom checks"
  on public.symptom_checks for select to authenticated
  using (patient_id = auth.uid());

create policy "Patients save their own symptom checks"
  on public.symptom_checks for insert to authenticated
  with check (patient_id = auth.uid());

create policy "Patients see conditions of their own checks"
  on public.symptom_check_conditions for select to authenticated
  using (exists (select 1 from public.symptom_checks c where c.id = symptom_check_id));

create policy "Patients save conditions of their own checks"
  on public.symptom_check_conditions for insert to authenticated
  with check (exists (
    select 1 from public.symptom_checks c
    where c.id = symptom_check_id and c.patient_id = auth.uid()
  ));

-- prescriptions: only the patient and doctor of that booking ------------------
create policy "Patient and doctor see the prescription"
  on public.prescriptions for select to authenticated
  using (
    public.booking_patient_id(booking_id) = auth.uid()
    or public.booking_doctor_id(booking_id) = auth.uid()
  );

create policy "Doctor writes a prescription for a paid booking"
  on public.prescriptions for insert to authenticated
  with check (
    public.booking_doctor_id(booking_id) = auth.uid()
    and exists (select 1 from public.bookings b where b.id = booking_id and b.status = 'confirmed')
  );

create policy "Doctor edits their prescription"
  on public.prescriptions for update to authenticated
  using (public.booking_doctor_id(booking_id) = auth.uid());

create policy "Patient and doctor see prescription items"
  on public.prescription_items for select to authenticated
  using (exists (select 1 from public.prescriptions p where p.id = prescription_id));

create policy "Doctor manages prescription items"
  on public.prescription_items for all to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and public.booking_doctor_id(p.booking_id) = auth.uid()
  ))
  with check (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and public.booking_doctor_id(p.booking_id) = auth.uid()
  ));

-- reviews (public listing goes through get_doctor_reviews()) ------------------
create policy "Patient, doctor and admin see a booking's review"
  on public.reviews for select to authenticated
  using (
    public.booking_patient_id(booking_id) = auth.uid()
    or public.booking_doctor_id(booking_id) = auth.uid()
    or public.is_admin()
  );

create policy "Patient reviews a finished consultation"
  on public.reviews for insert to authenticated
  with check (
    public.booking_patient_id(booking_id) = auth.uid()
    and public.booking_has_ended(booking_id)
  );

-- chat_requests (doctors answer through respond_chat_request()) ---------------
create policy "Patient and doctor see their chat requests"
  on public.chat_requests for select to authenticated
  using (patient_id = auth.uid() or doctor_id = auth.uid());

create policy "Past patients can request a follow-up chat"
  on public.chat_requests for insert to authenticated
  with check (
    patient_id = auth.uid()
    and status = 'pending'
    and public.has_consulted(auth.uid(), doctor_id)
  );

-- messages ------------------------------------------------------------------
create policy "Chat members see the messages"
  on public.messages for select to authenticated
  using (exists (select 1 from public.chat_requests c where c.id = chat_request_id));

create policy "Chat members send messages while the chat is open"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.chat_requests c where c.id = chat_request_id)
    and public.chat_is_open(chat_request_id)
  );

-- ===========================================================================
-- 6. File storage (private buckets)
-- Licences:      licences/<doctor id>/<file name>
-- Prescriptions: prescriptions/<prescription id>/<file name>.pdf
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('licences', 'licences', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png']),
  ('prescriptions', 'prescriptions', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "Doctors upload their own licence"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'licences' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Doctors and admins read licences"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'licences'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "Doctors upload prescription PDFs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'prescriptions'
    and exists (
      select 1 from public.prescriptions p
      where p.id::text = (storage.foldername(name))[1]
        and public.booking_doctor_id(p.booking_id) = auth.uid()
    )
  );

-- If you can see the prescription row, you can download its PDF.
create policy "Patient and doctor read the prescription PDF"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'prescriptions'
    and exists (select 1 from public.prescriptions p where p.pdf_path = storage.objects.name)
  );

-- ===========================================================================
-- 7. Realtime: push new chat messages and request updates to the browser.
-- Realtime respects the RLS policies above.
-- ===========================================================================

alter publication supabase_realtime add table public.chat_requests, public.messages;
