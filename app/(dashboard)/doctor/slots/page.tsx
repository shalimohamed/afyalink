import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { formatSlot, nairobiToday } from "@/lib/time";
import { deleteSlot } from "./actions";
import SlotForm from "./SlotForm";

export const metadata: Metadata = { title: "My availability · AfyaLink" };

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  bookings: { status: string; created_at: string }[];
};

const HOLD_MS = 5 * 60 * 1000; // a payment hold lasts 5 minutes

// The doctor's upcoming slots, each marked free / paying / booked using the
// same rule as slot_is_taken() in the database.
async function loadUpcomingSlots(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"], doctorId: string) {
  const now = Date.now();
  // bookings(...) brings each slot's bookings along, like a SQL join.
  const { data } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, bookings(status, created_at)")
    .eq("doctor_id", doctorId)
    .gte("ends_at", new Date(now).toISOString())
    .order("starts_at");

  return ((data ?? []) as SlotRow[]).map((slot) => {
    let state: "free" | "paying" | "booked" = "free";
    if (slot.bookings.some((b) => b.status === "confirmed")) state = "booked";
    else if (slot.bookings.some((b) => b.status === "pending_payment" && now - new Date(b.created_at).getTime() < HOLD_MS)) {
      state = "paying";
    }
    return { ...slot, state };
  });
}

export default async function SlotsPage() {
  const { supabase, profile } = await requireRole("doctor");

  const [{ data: doctor }, slots] = await Promise.all([
    supabase
      .from("doctors")
      .select("fee_type, fee_kes, verification_status")
      .eq("id", profile.id)
      .single<{ fee_type: "per_session" | "per_hour"; fee_kes: number; verification_status: string }>(),
    loadUpcomingSlots(supabase, profile.id),
  ]);

  return (
    <>
      <Link href="/doctor" className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Doctor</div>
      <h1>My availability</h1>
      <p className="sub">
        Each slot you publish is a time you agree to see a patient. It&apos;s booked as soon as a patient pays.
      </p>

      {doctor?.verification_status !== "verified" && (
        <p className="notice ok">
          You can add slots now, but patients will only see them after an admin verifies your registration.
        </p>
      )}

      {doctor && <SlotForm today={nairobiToday()} feeType={doctor.fee_type} feeKes={doctor.fee_kes} />}

      <h2 className="section-title">Upcoming slots ({slots.length})</h2>
      {slots.length === 0 && <p className="empty">You haven&apos;t added any upcoming slots yet.</p>}
      <ul className="list">
        {slots.map((slot) => (
          <li key={slot.id} className="item">
            <div className="item-main">
              <b>{formatSlot(slot.starts_at, slot.ends_at)}</b>
            </div>
            {slot.state === "free" ? (
              <div className="item-actions">
                <span className="tag free">Free</span>
                <ActionButton action={deleteSlot} fields={{ slotId: slot.id }} label="Delete" pendingLabel="Deleting…" />
              </div>
            ) : (
              <span className={`tag ${slot.state}`}>{slot.state === "booked" ? "Booked" : "Patient is paying"}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
