"use server";

import { normalizeKenyanPhone } from "@/lib/phone";
import { SPECIALTY_VALUES } from "@/lib/specialties";

export type RegisterState = {
  ok?: boolean;
  message?: string;
  errors: Record<string, string>;
  // What the user typed (never the password), so the form can refill after an error.
  values?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LICENCE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_LICENCE_BYTES = 4 * 1024 * 1024; // 4 MB. Vercel rejects request bodies over 4.5 MB.

// A server action runs on the server when the form is submitted. Anyone can
// send any data to it, so every rule is checked here, not in the browser.
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const values = {
    role: text("role") === "doctor" ? "doctor" : "patient",
    fullName: text("fullName"),
    email: text("email").toLowerCase(),
    phone: text("phone"),
    specialty: text("specialty"),
    regNumber: text("regNumber"),
    feeType: text("feeType"),
    fee: text("fee"),
  };
  const errors: Record<string, string> = {};

  if (values.fullName.length < 3) errors.fullName = "Enter your full name.";
  if (!EMAIL_RE.test(values.email)) errors.email = "Enter a valid email address.";
  const phone = normalizeKenyanPhone(values.phone);
  if (!phone) errors.phone = "Enter a Kenyan mobile number, e.g. 0712 345 678.";

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password !== String(formData.get("confirmPassword") ?? "")) {
    errors.confirmPassword = "Passwords don't match.";
  }

  if (values.role === "doctor") {
    if (!SPECIALTY_VALUES.includes(values.specialty)) errors.specialty = "Choose your specialty.";
    if (!/^[A-Za-z0-9/ -]{3,20}$/.test(values.regNumber)) errors.regNumber = "Enter your registration number.";

    const licence = formData.get("licence");
    if (!(licence instanceof File) || licence.size === 0) errors.licence = "Upload your registration certificate.";
    else if (!LICENCE_TYPES.includes(licence.type)) errors.licence = "Upload a PDF, JPG or PNG file.";
    else if (licence.size > MAX_LICENCE_BYTES) errors.licence = "The file must be 4 MB or smaller.";

    if (values.feeType !== "per_session" && values.feeType !== "per_hour") errors.feeType = "Choose how you charge.";
    const fee = Number(values.fee);
    if (!Number.isInteger(fee) || fee < 100 || fee > 50000) errors.fee = "Enter a whole amount between KES 100 and 50,000.";
  }

  if (Object.keys(errors).length > 0) return { errors, values };

  // TODO(Phase 1): create the account in Supabase Auth, save the profile (role, phone,
  // and for doctors: specialty, fee, verified = false) and upload the licence to Storage.
  return {
    ok: true,
    errors: {},
    values,
    message: "Your details look good. Saving accounts comes next, once Supabase is connected.",
  };
}
