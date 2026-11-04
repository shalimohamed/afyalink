import type { SupabaseClient } from "@supabase/supabase-js";
import type { Urgency } from "@/lib/symptoms/types";

const OPENS_BEFORE_MS = 15 * 60 * 1000; // same as lib/livekit.ts
const CLOSES_AFTER_MS = 30 * 60 * 1000;

type Row = {
  id: string;
  status: string;
  amount_kes: number;
  patient_id: string;
  symptom_check_id?: string | null; // added by migration 0009
  slot: {
    starts_at: string;
    ends_at: string;
    doctor_id: string;
    doctor: { registration_number: string; specialties: { label: string }; profile: { full_name: string } } | null;
  };
  patient: {
    date_of_birth: string | null;
    sex: string | null;
    blood_group?: string | null; // added by migration 0009
    profile: { full_name: string; phone: string | null };
  } | null;
  prescriptions: { id: string; pdf_path: string | null; created_at: string } | { id: string; pdf_path: string | null; created_at: string }[] | null;
};

// The symptom check the patient did just before booking (see hold_slot() in
// migration 0009). Its doctor can read it once the booking is paid.
export type SharedCheck = {
  id: string;
  symptoms: string;
  urgency: Urgency;
  red_flag_triggered: boolean;
  created_at: string;
  specialties: { label: string } | null;
  symptom_check_conditions: { rank: number; condition_name: string }[];
};

// "early": the room isn't open yet. "open": you can join. "ended": the room has closed.
// (Once the prescription is issued, lib/livekit.ts canJoinCall() also checks
// whether anyone is still in the call.)
export type CallWindow = "early" | "open" | "ended";

export type Consultation = Omit<Row, "prescriptions"> & {
  callWindow: CallWindow;
  done: boolean;
  prescription: { id: string; pdf_path: string | null; created_at: string } | null;
  symptomCheck: SharedCheck | null;
};

// A consultation is over once the doctor issues the prescription, or, if
// there's none (e.g. counselling), once its time slot has ended. The video
// call is separate: it stays open until both people have left.
export function isConsultationOver(endsAt: string, hasPrescription: boolean, now = Date.now()) {
  return hasPrescription || new Date(endsAt).getTime() < now;
}

// "*" (every booking column) and "patients(*)" also pick up the columns added
// by migration 0009, and still work before it has been run.
const SELECT =
  "*, " +
  "slot:availability_slots(starts_at, ends_at, doctor_id, " +
  "doctor:doctors(registration_number, specialties(label), profile:profiles!doctors_id_fkey(full_name))), " +
  "patient:patients(*, profile:profiles(full_name, phone)), " +
  "prescriptions(id, pdf_path, created_at)";

const CHECK_SELECT = "id, symptoms, urgency, red_flag_triggered, created_at, specialties(label), symptom_check_conditions(rank, condition_name)";

// Row-level security only returns a check to its patient, and to the doctor
// of the paid booking it was shared with.
async function loadSharedChecks(supabase: SupabaseClient, rows: Row[]) {
  const ids = rows.flatMap((r) => (r.symptom_check_id ? [r.symptom_check_id] : []));
  if (ids.length === 0) return new Map<string, SharedCheck>();
  const { data } = await supabase.from("symptom_checks").select(CHECK_SELECT).in("id", ids);
  return new Map(((data ?? []) as unknown as SharedCheck[]).map((c) => [c.id, c]));
}

function shape(row: Row, now: number, checks: Map<string, SharedCheck>): Consultation {
  const start = new Date(row.slot.starts_at).getTime();
  const end = new Date(row.slot.ends_at).getTime();
  const callWindow: CallWindow = now < start - OPENS_BEFORE_MS ? "early" : now > end + CLOSES_AFTER_MS ? "ended" : "open";
  // One prescription per booking; the API may return it as an object or a one-item list.
  const prescription = Array.isArray(row.prescriptions) ? (row.prescriptions[0] ?? null) : row.prescriptions;
  return {
    ...row,
    callWindow,
    prescription,
    done: isConsultationOver(row.slot.ends_at, Boolean(prescription), now),
    symptomCheck: (row.symptom_check_id && checks.get(row.symptom_check_id)) || null,
  };
}

// One paid consultation. Row-level security only returns it to its patient
// and its doctor (and admins).
export async function loadConsultation(supabase: SupabaseClient, bookingId: string): Promise<Consultation | null> {
  const now = Date.now();
  const { data } = await supabase.from("bookings").select(SELECT).eq("id", bookingId).eq("status", "confirmed").maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row;
  return shape(row, now, await loadSharedChecks(supabase, [row]));
}

// All paid consultations of the logged-in doctor, soonest first.
export async function loadDoctorConsultations(supabase: SupabaseClient): Promise<Consultation[]> {
  const now = Date.now();
  const { data } = await supabase.from("bookings").select(SELECT).eq("status", "confirmed");
  const rows = (data ?? []) as unknown as Row[];
  const checks = await loadSharedChecks(supabase, rows);
  return rows.map((row) => shape(row, now, checks)).sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
}
