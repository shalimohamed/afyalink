import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { getVerifiedDoctors } from "@/lib/doctors";
import { loadCurrentCheck } from "@/lib/symptoms/current";
import { formatClock, formatDate, formatKes, formatTime, groupByDay, slotPrice } from "@/lib/time";
import { holdSlot } from "../../bookings/actions";

export const metadata: Metadata = { title: "Book a doctor · AfyaLink" };

type Slot = { id: string; starts_at: string; ends_at: string };
type Review = { rating: number; comment: string | null; created_at: string };

export default async function DoctorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("patient");

  // getVerifiedDoctors only returns verified, unsuspended doctors, so any other
  // ID shows "not found".
  const [doctor] = await getVerifiedDoctors(supabase, { doctorId: id });
  if (!doctor) notFound();

  const [{ data: slotData }, { data: reviewData }, currentCheck] = await Promise.all([
    supabase.rpc("get_available_slots", { p_doctor_id: id }),
    supabase.rpc("get_doctor_reviews", { p_doctor_id: id }),
    loadCurrentCheck(supabase),
  ]);
  const slots = (slotData ?? []) as Slot[];
  const reviews = (reviewData ?? []) as Review[];
  const minutesOf = (slot: Slot) => (new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime()) / 60000;
  // Usually every slot is the same length (and price), so say it once.
  const lengths = [...new Set(slots.map(minutesOf))];
  const oneLength = lengths.length === 1 ? lengths[0] : null;

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
      <p className="empty">
        {oneLength !== null &&
          `Each consultation is ${oneLength} minutes and costs ${formatKes(slotPrice(doctor.feeType, doctor.feeKes, oneLength))}. `}
        Tap a time to hold it for 5 minutes while you pay with M-Pesa.
      </p>
      {currentCheck && (
        // Tell the patient what the doctor will see, before they book.
        <p className="notice ok">
          Once you&apos;ve paid, Dr. {doctor.fullName} will see the symptoms you checked on {formatTime(currentCheck.created_at)}{" "}
          (“{currentCheck.symptoms.length > 80 ? `${currentCheck.symptoms.slice(0, 80)}…` : currentCheck.symptoms}”), your age, sex
          and blood group, so they can prepare. They won&apos;t see your other symptom checks.
        </p>
      )}
      {slots.length === 0 && <p className="empty">No free slots right now. Please check again later.</p>}
      <div className="slot-days">
        {groupByDay(slots).map(({ day, items }) => (
          <section key={day} className="slot-day" aria-label={day}>
            <h3>{day}</h3>
            <div className="time-chips">
              {items.map((slot) => {
                const minutes = minutesOf(slot);
                return (
                  <ActionButton
                    key={slot.id}
                    action={holdSlot}
                    fields={{ slotId: slot.id }}
                    label={
                      oneLength !== null
                        ? formatClock(slot.starts_at)
                        : `${formatClock(slot.starts_at)} · ${minutes} min · ${formatKes(slotPrice(doctor.feeType, doctor.feeKes, minutes))}`
                    }
                    pendingLabel="Holding…"
                    className="btn btn-primary"
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

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
