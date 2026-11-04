import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PatientFile from "@/components/PatientFile";
import PrescriptionView from "@/components/PrescriptionView";
import { requireUser } from "@/lib/auth";
import { loadConsultation } from "@/lib/consultations";
import { canJoinCall } from "@/lib/livekit";
import { formatSlot } from "@/lib/time";
import PrescriptionForm from "@/app/(dashboard)/doctor/consultations/[id]/prescription/PrescriptionForm";
import VideoCall from "./VideoCall";

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
  const displayName = isDoctor ? `Dr. ${doctorName}` : patientName;
  // The LiveKit token itself is only made when someone presses Join (see actions.ts).
  const canJoin = await canJoinCall(consultation);
  const serverUrl = process.env.LIVEKIT_URL;
  const back = isDoctor ? "/doctor/consultations" : `/patient/bookings/${consultation.id}`;

  const call = canJoin ? (
    serverUrl ? (
      <VideoCall bookingId={consultation.id} serverUrl={serverUrl} displayName={displayName} />
    ) : (
      <p className="notice bad">We couldn&apos;t start the video call. Please reload the page in a moment.</p>
    )
  ) : consultation.callWindow === "early" ? (
    <p className="notice ok">The call opens 15 minutes before the start time. Come back then. This page will let you join.</p>
  ) : (
    <p className="notice ok">
      {consultation.prescription ? "The consultation is complete and the call has ended." : "This consultation has ended."}{" "}
      {isPatient && <Link href={back}>See your prescription and rate the consultation</Link>}
    </p>
  );

  return (
    <>
      <Link href={back} className="back">
        ← Back
      </Link>
      <div className="eyebrow">Video consultation</div>
      <h1>{isDoctor ? patientName : `Dr. ${doctorName}`}</h1>
      <p className="sub">
        {formatSlot(consultation.slot.starts_at, consultation.slot.ends_at)} (Kenyan time)
        {consultation.done && consultation.prescription && " · Consultation complete"}
      </p>

      {isDoctor ? (
        // Next to the call, the doctor has the patient's file (also before the
        // call opens) and writes the prescription without leaving the call.
        <div className="consult-layout">
          <div className="consult-call">{call}</div>
          <aside className="consult-side" aria-label="Patient file and prescription">
            <PatientFile consultation={consultation} />
            <h2 id="rx-title" className="section-title">
              Prescription
            </h2>
            {consultation.prescription ? (
              <>
                <p className="notice ok">
                  Issued. This consultation is complete. The call stays open until you have both left.
                </p>
                <PrescriptionView supabase={supabase} prescriptionId={consultation.prescription.id} newTab />
              </>
            ) : consultation.callWindow === "early" ? (
              <p className="empty">You can write the prescription once the consultation has started.</p>
            ) : (
              <>
                <p className="empty">Issuing the prescription completes the consultation. It can&apos;t be changed afterwards.</p>
                <PrescriptionForm bookingId={consultation.id} />
              </>
            )}
          </aside>
        </div>
      ) : (
        <>
          {call}
          {canJoin && !consultation.prescription && (
            <p className="empty">Your prescription will appear on your booking page once the doctor issues it.</p>
          )}
        </>
      )}
    </>
  );
}
