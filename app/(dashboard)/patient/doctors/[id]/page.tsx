import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { getVerifiedDoctors } from "@/lib/doctors";
import { formatDate, formatKes, formatSlot, slotPrice } from "@/lib/time";
import { holdSlot } from "../../bookings/actions";

export const metadata: Metadata = { title: "Book a doctor · AfyaLink" };

type Slot = { id: string; starts_at: string; ends_at: string };
type Review = { rating: number; comment: string | null; created_at: string };

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("patient");

  // getVerifiedDoctors only returns verified doctors, so an unverified or
  // unknown ID shows "not found".
  const [doctor] = await getVerifiedDoctors(supabase, { doctorId: id });
  if (!doctor) notFound();

  const [{ data: slotData }, { data: reviewData }] = await Promise.all([
    supabase.rpc("get_available_slots", { p_doctor_id: id }),
    supabase.rpc("get_doctor_reviews", { p_doctor_id: id }),
  ]);
  const slots = (slotData ?? []) as Slot[];
  const reviews = (reviewData ?? []) as Review[];

  return (
    <>
      <Link href="/patient/doctors" className="back">
        ← All doctors
      </Link>
      <div className="eyebrow">{doctor.specialtyLabel}</div>
      <h1>Dr. {doctor.fullName}</h1>
      <p className="sub">
        {doctor.averageRating ? `★ ${doctor.averageRating.toFixed(1)} from ${doctor.reviewCount} reviews` : "New on AfyaLink"} ·{" "}
        {formatKes(doctor.feeKes)} {doctor.feeType === "per_hour" ? "per hour" : "per session"} · video consultation
      </p>
      {doctor.bio && <p>{doctor.bio}</p>}

      <h2 className="section-title">Available times (Kenyan time)</h2>
      <p className="empty">Booking a slot holds it for 5 minutes while you pay with M-Pesa.</p>
      {slots.length === 0 && <p className="empty">No free slots right now. Please check again later.</p>}
      <ul className="list">
        {slots.map((slot) => {
          const minutes = (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000;
          return (
            <li key={slot.id} className="item">
              <div className="item-main">
                <b>{formatSlot(slot.starts_at, slot.ends_at)}</b>
                <span>{formatKes(slotPrice(doctor.feeType, doctor.feeKes, minutes))}</span>
              </div>
              <ActionButton
                action={holdSlot}
                fields={{ slotId: slot.id }}
                label="Book"
                pendingLabel="Holding…"
                className="btn btn-primary"
              />
            </li>
          );
        })}
      </ul>

      {reviews.length > 0 && (
        <>
          <h2 className="section-title">What patients say</h2>
          <ul className="list">
            {reviews.map((r, i) => (
              <li key={i} className="item">
                <div className="item-main">
                  <b aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}</b>
                  {r.comment && <span>{r.comment}</span>}
                </div>
                <span className="empty">{formatDate(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
