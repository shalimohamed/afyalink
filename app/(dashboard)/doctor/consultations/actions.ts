"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { loadConsultation } from "@/lib/consultations";
import { renderPrescriptionPdf } from "@/lib/prescriptionPdf";

export type PrescriptionFormState = { error?: string };

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Doctor issues the prescription for a paid consultation.
export async function issuePrescription(_prev: PrescriptionFormState, formData: FormData): Promise<PrescriptionFormState> {
  const { supabase } = await requireRole("doctor");
  const bookingId = text(formData, "bookingId");
  const diagnosis = text(formData, "diagnosis");
  const notes = text(formData, "notes");

  // The form sends one value per row for each column, in the same order.
  const column = (name: string) => formData.getAll(name).map((v) => String(v).trim());
  const [medicines, dosages, frequencies, durations, instructions] = ["medicine", "dosage", "frequency", "duration", "instructions"].map(column);
  const items = medicines
    .map((medicine, i) => ({
      medicine_name: medicine,
      dosage: dosages[i] ?? "",
      frequency: frequencies[i] ?? "",
      duration: durations[i] ?? "",
      instructions: instructions[i] || null,
    }))
    .filter((item) => item.medicine_name); // skip empty rows

  if (diagnosis.length < 3) return { error: "Write the diagnosis." };
  if (items.length === 0) return { error: "Add at least one medicine." };
  if (items.some((item) => !item.dosage || !item.frequency || !item.duration)) {
    return { error: "Every medicine needs a dosage, how often and for how long." };
  }

  // RLS only allows this for the booking's own doctor, and only once it's paid.
  const { data: prescription, error } = await supabase
    .from("prescriptions")
    .insert({ booking_id: bookingId, diagnosis, notes: notes || null })
    .select("id")
    .single<{ id: string }>();
  if (error?.code === "23505") return { error: "A prescription was already issued for this consultation." };
  if (error || !prescription) {
    console.error("Saving prescription failed:", error);
    return { error: "We couldn't save the prescription. Please try again." };
  }

  const { error: itemsError } = await supabase
    .from("prescription_items")
    .insert(items.map((item) => ({ ...item, prescription_id: prescription.id })));
  if (itemsError) console.error("Saving prescription items failed:", itemsError);

  await storePrescriptionPdf(supabase, bookingId);
  redirect(`/doctor/consultations/${bookingId}/prescription`);
}

// "Create PDF" button, in case creating the PDF failed the first time.
export async function createPrescriptionPdf(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole("doctor");
  const bookingId = text(formData, "bookingId");
  const ok = await storePrescriptionPdf(supabase, bookingId);
  revalidatePath(`/doctor/consultations/${bookingId}/prescription`);
  return ok ? {} : { error: "Creating the PDF failed. Please try again." };
}

// Builds the PDF and saves it to the private 'prescriptions' bucket as
// prescriptions/<prescription id>/prescription-<time>.pdf. It runs as the
// doctor, so storage policies decide whether the upload is allowed.
async function storePrescriptionPdf(supabase: SupabaseClient, bookingId: string): Promise<boolean> {
  const consultation = await loadConsultation(supabase, bookingId);
  const prescription = consultation?.prescription;
  if (!consultation || !prescription || !consultation.slot.doctor || !consultation.patient) return false;

  const { data: full } = await supabase
    .from("prescriptions")
    .select("diagnosis, notes, prescription_items(medicine_name, dosage, frequency, duration, instructions)")
    .eq("id", prescription.id)
    .single<{
      diagnosis: string;
      notes: string | null;
      prescription_items: { medicine_name: string; dosage: string; frequency: string; duration: string; instructions: string | null }[];
    }>();
  if (!full) return false;

  try {
    const pdf = await renderPrescriptionPdf({
      prescriptionId: prescription.id,
      issuedAt: prescription.created_at,
      consultationAt: consultation.slot.starts_at,
      doctor: {
        name: consultation.slot.doctor.profile.full_name,
        specialty: consultation.slot.doctor.specialties.label,
        registrationNumber: consultation.slot.doctor.registration_number,
      },
      patient: {
        name: consultation.patient.profile.full_name,
        dateOfBirth: consultation.patient.date_of_birth,
        sex: consultation.patient.sex,
      },
      diagnosis: full.diagnosis,
      notes: full.notes,
      items: full.prescription_items,
    });

    const path = `${prescription.id}/prescription-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("prescriptions")
      .upload(path, pdf, { contentType: "application/pdf" });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase.from("prescriptions").update({ pdf_path: path }).eq("id", prescription.id);
    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error("Creating prescription PDF failed:", error);
    return false;
  }
}
