import type { SupabaseClient } from "@supabase/supabase-js";
import { isConsultationOver } from "@/lib/consultations";

const HOLD_MS = 5 * 60 * 1000;

type BookingRow = {
  id: string;
  status: "pending_payment" | "confirmed" | "expired" | "cancelled";
  amount_kes: number;
  created_at: string;
  confirmed_at: string | null;
  slot: {
    starts_at: string;
    ends_at: string;
    doctor_id: string;
    doctor: { specialties: { label: string }; profile: { full_name: string } } | null;
  };
  payments: { status: "pending" | "success" | "failed"; created_at: string; mpesa_receipt: string | null; result_desc: string | null }[];
  prescriptions: { id: string } | { id: string }[] | null;
};

// What the patient sees: "held" (paying now), "expired", "upcoming", "past"
// or "cancelled". Worked out from the stored status, the clock and whether
// the doctor has issued the prescription (which completes the consultation).
export type BookingState = "held" | "expired" | "upcoming" | "past" | "cancelled";

export type PatientBooking = BookingRow & {
  state: BookingState;
  holdExpiresAt: string;
  latestPayment: BookingRow["payments"][number] | null;
};

// The logged-in patient's bookings (RLS only returns their own), newest first.
export async function loadPatientBookings(supabase: SupabaseClient, bookingId?: string): Promise<PatientBooking[]> {
  const now = Date.now();
  let query = supabase
    .from("bookings")
    .select(
      "id, status, amount_kes, created_at, confirmed_at, " +
        "slot:availability_slots(starts_at, ends_at, doctor_id, " +
        "doctor:doctors(specialties(label), profile:profiles!doctors_id_fkey(full_name))), " +
        "payments(status, created_at, mpesa_receipt, result_desc), prescriptions(id)",
    )
    .order("created_at", { ascending: false });
  if (bookingId) query = query.eq("id", bookingId);
  const { data } = await query;

  return ((data ?? []) as unknown as BookingRow[]).map((b) => {
    const holdExpiresAt = new Date(new Date(b.created_at).getTime() + HOLD_MS);
    let state: BookingState;
    const prescribed = Array.isArray(b.prescriptions) ? b.prescriptions.length > 0 : Boolean(b.prescriptions);
    if (b.status === "confirmed") state = isConsultationOver(b.slot.ends_at, prescribed, now) ? "past" : "upcoming";
    else if (b.status === "cancelled") state = "cancelled";
    else if (b.status === "pending_payment" && holdExpiresAt.getTime() > now) state = "held";
    else state = "expired";

    const payments = [...b.payments].sort((x, y) => y.created_at.localeCompare(x.created_at));
    return { ...b, state, holdExpiresAt: holdExpiresAt.toISOString(), latestPayment: payments[0] ?? null };
  });
}
