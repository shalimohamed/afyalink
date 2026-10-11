"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { normalizeKenyanPhone } from "@/lib/phone";

// Patient updates their details. Date of birth and sex appear on prescriptions;
// the phone is pre-filled when paying with M-Pesa.
export async function updateDetails(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireRole("patient");
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const sex = String(formData.get("sex") ?? "").trim();
  const phoneInput = String(formData.get("phone") ?? "").trim();

  if (dateOfBirth && (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || new Date(dateOfBirth) > new Date() || dateOfBirth < "1900-01-01")) {
    return { error: "Enter a valid date of birth." };
  }
  if (sex && !["female", "male", "other"].includes(sex)) return { error: "Choose an option for sex." };
  const phone = phoneInput ? normalizeKenyanPhone(phoneInput) : null;
  if (phoneInput && !phone) return { error: "Enter a Kenyan mobile number, e.g. 0712 345 678." };

  // Each update is limited by RLS to the patient's own row, and by column
  // permissions to these fields only.
  const [patientUpdate, profileUpdate] = await Promise.all([
    supabase.from("patients").update({ date_of_birth: dateOfBirth || null, sex: sex || null }).eq("id", profile.id),
    supabase.from("profiles").update({ phone }).eq("id", profile.id),
  ]);
  if (patientUpdate.error || profileUpdate.error) {
    console.error("Updating details failed:", patientUpdate.error ?? profileUpdate.error);
    return { error: "We couldn't save your details. Please try again." };
  }

  revalidatePath("/patient/history");
  return {};
}
