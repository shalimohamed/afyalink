-- AfyaLink database, part 1 of 2: tables (normalised to 3NF).
-- Run this whole file in the Supabase SQL Editor, then run 0002_security.sql.
-- The design reasons are explained in docs/database.md.

-- Needed for the "no overlapping slots" rule on availability_slots.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Fixed lists of allowed values (enums)
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('patient', 'doctor', 'admin');
create type public.fee_type as enum ('per_session', 'per_hour');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'expired', 'cancelled');
create type public.payment_status as enum ('pending', 'success', 'failed');
create type public.urgency_level as enum ('routine', 'within_24_hours', 'emergency');
create type public.chat_status as enum ('pending', 'accepted', 'rejected');

-- ---------------------------------------------------------------------------
-- Lookup table: medical specialties (same values as lib/specialties.ts)
-- ---------------------------------------------------------------------------
create table public.specialties (
  id    text primary key,          -- e.g. 'dermatology'
  label text not null unique       -- e.g. 'Dermatologist'
);

insert into public.specialties (id, label) values
  ('general_practice', 'General practitioner'),
  ('dermatology',      'Dermatologist'),
  ('psychiatry',       'Psychiatrist'),
  ('psychology',       'Counselling psychologist'),
  ('paediatrics',      'Paediatrician'),
  ('gynaecology',      'Obstetrician / gynaecologist'),
  ('ent',              'Ear, nose & throat specialist');

-- ---------------------------------------------------------------------------
-- Users. Supabase keeps the email and password in auth.users.
-- profiles holds what every user has; patients and doctors hold what only
-- that role has (a "supertype / subtype" design).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null default 'patient',
  full_name  text not null check (char_length(full_name) between 3 and 100),
  phone      text check (phone ~ '^254[17][0-9]{8}$'),  -- M-Pesa format; empty for admins
  created_at timestamptz not null default now()
);

create table public.patients (
  id            uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date check (date_of_birth <= current_date),
  sex           text check (sex in ('female', 'male', 'other'))
);

create table public.doctors (
  id                  uuid primary key references public.profiles (id) on delete cascade,
  specialty_id        text not null references public.specialties (id),
  registration_number text not null unique,               -- KMPDC number
  licence_path        text,                               -- file in the 'licences' storage bucket
  fee_type            public.fee_type not null,
  fee_kes             integer not null check (fee_kes between 100 and 50000),
  bio                 text,
  verification_status public.verification_status not null default 'pending',
  reviewed_by         uuid references public.profiles (id),  -- the admin who verified or rejected
  reviewed_at         timestamptz,
  rejection_reason    text
);

-- ---------------------------------------------------------------------------
-- Doctor availability: one row per slot
-- ---------------------------------------------------------------------------
create table public.availability_slots (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references public.doctors (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at between interval '15 minutes' and interval '3 hours'),
  -- A doctor can't publish two slots that overlap in time.
  exclude using gist (doctor_id with =, tstzrange(starts_at, ends_at) with &&)
);

-- ---------------------------------------------------------------------------
-- Bookings and payments
-- ---------------------------------------------------------------------------
create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.patients (id),
  slot_id         uuid not null references public.availability_slots (id),
  status          public.booking_status not null default 'pending_payment',
  amount_kes      integer not null check (amount_kes > 0),  -- price at the time of booking
  video_room_url  text,                                     -- Daily.co room, set once paid
  created_at      timestamptz not null default now(),       -- the 5-minute hold starts here
  confirmed_at    timestamptz
);

-- At most one active booking per slot. Expired and cancelled bookings don't
-- count, so the slot becomes free again.
create unique index bookings_one_active_per_slot
  on public.bookings (slot_id)
  where status in ('pending_payment', 'confirmed');

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings (id),
  phone               text not null check (phone ~ '^254[17][0-9]{8}$'),  -- number that paid
  checkout_request_id text not null unique,     -- Daraja's ID for this STK push
  merchant_request_id text,
  status              public.payment_status not null default 'pending',
  mpesa_receipt       text unique,              -- e.g. 'QJK3XY12AB', only on success
  result_code         integer,
  result_desc         text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

-- ---------------------------------------------------------------------------
-- Symptom checker results (part of the patient's medical history)
-- ---------------------------------------------------------------------------
create table public.symptom_checks (
  id                     uuid primary key default gen_random_uuid(),
  patient_id             uuid not null references public.patients (id) on delete cascade,
  symptoms               text not null check (char_length(symptoms) between 3 and 2000),
  red_flag_triggered     boolean not null default false,
  urgency                public.urgency_level not null,
  suggested_specialty_id text references public.specialties (id),  -- empty if a red flag stopped the check
  created_at             timestamptz not null default now()
);

-- One row per possible condition (1NF: no lists stored in one cell).
create table public.symptom_check_conditions (
  id               uuid primary key default gen_random_uuid(),
  symptom_check_id uuid not null references public.symptom_checks (id) on delete cascade,
  rank             smallint not null check (rank between 1 and 10),  -- 1 = most likely
  condition_name   text not null,
  explanation      text,
  unique (symptom_check_id, rank)
);

-- ---------------------------------------------------------------------------
-- Prescriptions (one per consultation, with one row per medicine)
-- ---------------------------------------------------------------------------
create table public.prescriptions (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id),
  diagnosis  text not null,
  notes      text,
  pdf_path   text,                           -- file in the 'prescriptions' storage bucket
  created_at timestamptz not null default now()
);

create table public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medicine_name   text not null,
  dosage          text not null,             -- e.g. '500 mg'
  frequency       text not null,             -- e.g. 'Twice a day'
  duration        text not null,             -- e.g. '5 days'
  instructions    text                       -- e.g. 'After meals'
);

-- ---------------------------------------------------------------------------
-- Ratings and reviews (one per booking)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id),
  rating     smallint not null check (rating between 1 and 5),
  comment    text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Free follow-up chat. Each accepted request opens a 3-hour window that
-- starts at responded_at.
-- ---------------------------------------------------------------------------
create table public.chat_requests (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  doctor_id    uuid not null references public.doctors (id) on delete cascade,
  status       public.chat_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check ((status = 'pending') = (responded_at is null))
);

-- A patient can only have one waiting request per doctor.
create unique index chat_requests_one_pending
  on public.chat_requests (patient_id, doctor_id)
  where status = 'pending';

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  chat_request_id uuid not null references public.chat_requests (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes on foreign keys we search by
-- ---------------------------------------------------------------------------
create index on public.doctors (specialty_id, verification_status);
create index on public.availability_slots (doctor_id, starts_at);
create index on public.bookings (patient_id);
create index on public.payments (booking_id);
create index on public.symptom_checks (patient_id, created_at desc);
create index on public.symptom_check_conditions (symptom_check_id);
create index on public.prescription_items (prescription_id);
create index on public.chat_requests (doctor_id, status);
create index on public.messages (chat_request_id, created_at);
