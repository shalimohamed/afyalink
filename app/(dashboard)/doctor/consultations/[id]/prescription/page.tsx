import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionButton from "@/components/ActionButton";
import PrescriptionView from "@/components/PrescriptionView";
import { requireRole } from "@/lib/auth";
import { loadConsultation } from "@/lib/consultations";
import { formatSlot } from "@/lib/time";
import { createPrescriptionPdf } from "../../actions";
import PrescriptionForm from "./PrescriptionForm";

export const metadata: Metadata = { title: "Prescription · AfyaLink" };

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("doctor");
  const consultation = await loadConsultation(supabase, id);
  if (!consultation || consultation.slot.doctor_id !== profile.id) notFound();

  return (
    <>
      <Link href="/doctor/consultations" className="back">
        ← Consultations
      </Link>
      <div className="eyebrow">Prescription</div>
      <h1>{consultation.patient?.profile.full_name}</h1>
      <p className="sub">Consultation on {formatSlot(consultation.slot.starts_at, consultation.slot.ends_at)}</p>

      {consultation.prescription ? (
        <>
          <PrescriptionView supabase={supabase} prescriptionId={consultation.prescription.id} />
          {!consultation.prescription.pdf_path && (
            <ActionButton action={createPrescriptionPdf} fields={{ bookingId: consultation.id }} label="Create PDF" pendingLabel="Creating…" />
          )}
        </>
      ) : (
        <>
          <p className="notice ok">Once issued, the prescription can&apos;t be changed. The patient can download it as a PDF.</p>
          <PrescriptionForm bookingId={consultation.id} />
        </>
      )}
    </>
  );
}
