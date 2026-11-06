import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { loadPatientBookings, type BookingState } from "@/lib/bookings";
import { formatKes, formatSlot } from "@/lib/time";

export const metadata: Metadata = { title: "My consultations · AfyaLink" };

const STATE_LABEL: Record<BookingState, string> = {
  held: "Waiting for payment",
  upcoming: "Booked",
  past: "Completed",
  expired: "Not paid",
  cancelled: "Cancelled",
  unavailable: "Doctor unavailable",
};
const STATE_TAG: Record<BookingState, string> = {
  held: "paying",
  upcoming: "booked",
  past: "free",
  expired: "rejected",
  cancelled: "rejected",
  unavailable: "rejected",
};

export default async function BookingsPage() {
  const { supabase } = await requireRole("patient");
  const bookings = await loadPatientBookings(supabase);

  return (
    <>
      <Link href="/patient" className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Patient</div>
      <h1>My consultations</h1>

      {bookings.length === 0 && (
        <p className="empty">
          No consultations yet. <Link href="/patient/doctors">Find a doctor</Link> or{" "}
          <Link href="/patient/check">check your symptoms</Link>.
        </p>
      )}
      <ul className="list">
        {bookings.map((b) => (
          <li key={b.id} className="item">
            <div className="item-main">
              <b>
                <Link href={`/patient/bookings/${b.id}`}>
                  {b.slot.doctor ? `Dr. ${b.slot.doctor.profile.full_name}` : "Doctor"}
                </Link>
              </b>
              <span>
                {formatSlot(b.slot.starts_at, b.slot.ends_at)} · {formatKes(b.amount_kes)}
              </span>
            </div>
            <span className={`tag ${STATE_TAG[b.state]}`}>{STATE_LABEL[b.state]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
