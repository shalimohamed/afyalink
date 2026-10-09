import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadConsultation } from "@/lib/consultations";
import { createMeetingToken } from "@/lib/daily";
import { formatSlot } from "@/lib/time";
import { ensureVideoRoom } from "@/lib/videoRoom";

export const metadata: Metadata = { title: "Video consultation · AfyaLink" };

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const consultation = await loadConsultation(supabase, id);
  if (!consultation) notFound();

  // Only this booking's patient and doctor can join the call.
  const isDoctor = profile.id === consultation.slot.doctor_id;
  const isPatient = profile.id === consultation.patient_id;
  if (!isDoctor && !isPatient) notFound();

  const doctorName = consultation.slot.doctor?.profile.full_name ?? "";
  const patientName = consultation.patient?.profile.full_name ?? "";

  // The room and the personal entry token are made on the server, so the
  // Daily API key never reaches the browser.
  let callUrl: string | null = null;
  if (consultation.callWindow === "open") {
    const roomUrl = await ensureVideoRoom(consultation.id);
    if (roomUrl) {
      try {
        const token = await createMeetingToken({
          roomUrl,
          userName: isDoctor ? `Dr. ${doctorName}` : patientName,
          isOwner: isDoctor,
          endsAt: consultation.slot.ends_at,
        });
        callUrl = `${roomUrl}?t=${token}`;
      } catch (error) {
        console.error(error);
      }
    }
  }

  const back = isDoctor ? "/doctor/consultations" : `/patient/bookings/${consultation.id}`;

  return (
    <>
      <Link href={back} className="back">
        ← Back
      </Link>
      <div className="eyebrow">Video consultation</div>
      <h1>{isDoctor ? patientName : `Dr. ${doctorName}`}</h1>
      <p className="sub">{formatSlot(consultation.slot.starts_at, consultation.slot.ends_at)} (Kenyan time)</p>

      {consultation.callWindow === "early" && (
        <p className="notice ok">The call opens 15 minutes before the start time. Come back then. This page will let you join.</p>
      )}
      {consultation.callWindow === "ended" && <p className="notice ok">This consultation has ended.</p>}
      {consultation.callWindow === "open" &&
        (callUrl ? (
          <iframe
            className="video-frame"
            src={callUrl}
            title="Video consultation"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
          />
        ) : (
          <p className="notice bad">We couldn&apos;t start the video call. Please reload the page in a moment.</p>
        ))}

      {isDoctor && (
        <Link href={`/doctor/consultations/${consultation.id}/prescription`} className="btn btn-ghost">
          {consultation.prescription ? "View prescription" : "Write prescription"}
        </Link>
      )}
    </>
  );
}
