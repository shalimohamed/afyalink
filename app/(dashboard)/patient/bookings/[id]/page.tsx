import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import PrescriptionView from "@/components/PrescriptionView";
import { requireRole } from "@/lib/auth";
import { loadPatientBookings } from "@/lib/bookings";
import { loadConsultation } from "@/lib/consultations";
import { formatKes, formatSlot } from "@/lib/time";
import { requestChat } from "@/app/(dashboard)/chat/actions";
import { checkPayment } from "../actions";
import HoldTimer from "./HoldTimer";
import PaymentWatcher from "./PaymentWatcher";
import PayForm from "./PayForm";

export const metadata: Metadata = { title: "Your booking · AfyaLink" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("patient");
  const [booking] = await loadPatientBookings(supabase, id);
  if (!booking) notFound();
  // Paid bookings: call times, prescription.
  const consultation = booking.status === "confirmed" ? await loadConsultation(supabase, booking.id) : null;

  const doctorName = booking.slot.doctor?.profile.full_name;
  const payment = booking.latestPayment;
  const waitingForPin = booking.state === "held" && payment?.status === "pending";
  // 2547XXXXXXXX → 07XXXXXXXX for the form
  const defaultPhone = profile.phone ? "0" + profile.phone.slice(3) : "";

  return (
    <>
      <Link href="/patient/bookings" className="back">
        ← My consultations
      </Link>
      <div className="eyebrow">Video consultation</div>
      <h1>{doctorName ? `Dr. ${doctorName}` : "Your booking"}</h1>
      <p className="sub">
        {booking.slot.doctor?.specialties.label} · {formatSlot(booking.slot.starts_at, booking.slot.ends_at)} (Kenyan
        time) · {formatKes(booking.amount_kes)}
      </p>

      {booking.state === "held" && (
        <>
          <div className="item-actions">
            <HoldTimer expiresAt={booking.holdExpiresAt} />
          </div>

          {waitingForPin ? (
            <>
              <PaymentWatcher />
              <p className="notice ok" role="status">
                <strong>Check your phone.</strong> Enter your M-Pesa PIN to pay {formatKes(booking.amount_kes)}. This
                page updates by itself once M-Pesa confirms.
              </p>
              <ActionButton
                action={checkPayment}
                fields={{ bookingId: booking.id }}
                label="I've paid: check status"
                pendingLabel="Checking with M-Pesa…"
              />
            </>
          ) : (
            <>
              {payment?.status === "failed" && (
                <p className="notice bad">
                  The payment didn&apos;t go through{payment.result_desc ? `: ${payment.result_desc}` : "."} You can try
                  again.
                </p>
              )}
              <PayForm
                bookingId={booking.id}
                defaultPhone={defaultPhone}
                label={`Pay ${formatKes(booking.amount_kes)} with M-Pesa`}
              />
            </>
          )}
        </>
      )}

      {booking.state === "expired" && (
        <p className="notice bad">
          Your 5-minute hold ran out before the payment was confirmed, so the slot was released.{" "}
          <Link href={`/patient/doctors/${booking.slot.doctor_id}`}>Choose a time again</Link>.
        </p>
      )}

      {consultation && (
        <>
          <div className="notice ok">
            <strong>{booking.state === "upcoming" ? "Your consultation is booked. 🎉" : "This consultation has ended."}</strong>{" "}
            {payment?.mpesa_receipt && <>M-Pesa receipt: <code>{payment.mpesa_receipt}</code>. </>}
            {consultation.callWindow === "early" && "You can join the video call from 15 minutes before the start time."}
          </div>
          {consultation.callWindow === "open" && (
            <Link href={`/consultation/${booking.id}`} className="btn btn-primary">
              Join video call
            </Link>
          )}

          {consultation.prescription && (
            <>
              <h2 className="section-title">Your prescription</h2>
              <PrescriptionView supabase={supabase} prescriptionId={consultation.prescription.id} />
            </>
          )}

          <h2 className="section-title">Questions afterwards?</h2>
          <p className="empty">Send the doctor a free follow-up chat request. If they accept, you can chat for 3 hours.</p>
          <ActionButton
            action={requestChat}
            fields={{ doctorId: booking.slot.doctor_id }}
            label="Request a follow-up chat"
            pendingLabel="Sending…"
          />
        </>
      )}

      {booking.state === "cancelled" && <p className="notice bad">This booking was cancelled.</p>}
    </>
  );
}
