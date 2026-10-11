import type { SupabaseClient } from "@supabase/supabase-js";

const OPENS_BEFORE_MS = 15 * 60 * 1000; // same as lib/livekit.ts
const CLOSES_AFTER_MS = 30 * 60 * 1000;

type Row = {
  id: string;
  status: string;
  amount_kes: number;
  patient_id: string;
  slot: {
    starts_at: string;
    ends_at: string;
    doctor_id: string;
    doctor: { registration_number: string; specialties: { label: string }; profile: { full_name: string } } | null;
  };
  patient: { date_of_birth: string | null; sex: string | null; profile: { full_name: string; phone: string | null } } | null;
  prescriptions: { id: string; pdf_path: string | null; created_at: string } | { id: string; pdf_path: string | null; created_at: string }[] | null;
};

// "early": the room isn't open yet. "open": you can join. "ended": the room has closed.
export type CallWindow = "early" | "open" | "ended";

export type Consultation = Omit<Row, "prescriptions"> & {
  callWindow: CallWindow;
  prescription: { id: string; pdf_path: string | null; created_at: string } | null;
};

const SELECT =
  "id, status, amount_kes, patient_id, " +
  "slot:availability_slots(starts_at, ends_at, doctor_id, " +
  "doctor:doctors(registration_number, specialties(label), profile:profiles!doctors_id_fkey(full_name))), " +
  "patient:patients(date_of_birth, sex, profile:profiles(full_name, phone)), " +
  "prescriptions(id, pdf_path, created_at)";

function shape(row: Row, now: number): Consultation {
  const start = new Date(row.slot.starts_at).getTime();
  const end = new Date(row.slot.ends_at).getTime();
  const callWindow: CallWindow = now < start - OPENS_BEFORE_MS ? "early" : now > end + CLOSES_AFTER_MS ? "ended" : "open";
  // One prescription per booking; the API may return it as an object or a one-item list.
  const prescription = Array.isArray(row.prescriptions) ? (row.prescriptions[0] ?? null) : row.prescriptions;
  return { ...row, callWindow, prescription };
}

// One paid consultation. Row-level security only returns it to its patient
// and its doctor (and admins).
export async function loadConsultation(supabase: SupabaseClient, bookingId: string): Promise<Consultation | null> {
  const now = Date.now();
  const { data } = await supabase.from("bookings").select(SELECT).eq("id", bookingId).eq("status", "confirmed").maybeSingle();
  return data ? shape(data as unknown as Row, now) : null;
}

// All paid consultations of the logged-in doctor, soonest first.
export async function loadDoctorConsultations(supabase: SupabaseClient): Promise<Consultation[]> {
  const now = Date.now();
  const { data } = await supabase.from("bookings").select(SELECT).eq("status", "confirmed");
  return ((data ?? []) as unknown as Row[])
    .map((row) => shape(row, now))
    .sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
}
