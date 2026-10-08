"use server";

import { redirect } from "next/navigation";
import { HOME_FOR_ROLE } from "@/lib/auth";
import { licenceError, saveLicence } from "@/lib/licence";
import { normalizeKenyanPhone } from "@/lib/phone";
import { SPECIALTY_VALUES } from "@/lib/specialties";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = {
  ok?: boolean;
  message?: string;
  errors: Record<string, string>;
  // What the user typed (never the password), so the form can refill after an error.
  values?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const licenceProblem = licenceError(formData.get("licence"));
    if (licenceProblem) errors.licence = licenceProblem;

    if (values.feeType !== "per_session" && values.feeType !== "per_hour") errors.feeType = "Choose how you charge.";
    const fee = Number(values.fee);
    if (!Number.isInteger(fee) || fee < 100 || fee > 50000) errors.fee = "Enter a whole amount between KES 100 and 50,000.";
  }

  if (Object.keys(errors).length > 0) return { errors, values };

  // Create the account. The details in `data` become "user metadata", and the
  // handle_new_user trigger in the database copies them into profiles and
  // patients/doctors. A role other than "doctor" always becomes "patient".
  const isDoctor = values.role === "doctor";
  const regNumber = values.regNumber.toUpperCase();

  if (isDoctor) {
    // Patients can't see unverified doctors, so this check uses the service-role client.
    const { data: taken } = await createAdminClient()
      .from("doctors")
      .select("id")
      .eq("registration_number", regNumber)
      .maybeSingle();
    if (taken) return { errors: { regNumber: "This registration number is already registered." }, values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password,
    options: {
      data: {
        role: values.role,
        full_name: values.fullName,
        phone,
        ...(isDoctor && {
          specialty: values.specialty,
          registration_number: regNumber,
          fee_type: values.feeType,
          fee_kes: Number(values.fee),
        }),
      },
    },
  });

  // With email confirmation on, Supabase doesn't say "already registered" (so
  // nobody can test which emails have accounts). It returns a user with no
  // identities instead.
  if (error?.code === "user_already_exists" || (data.user && data.user.identities?.length === 0)) {
    return { errors: { email: "An account with this email already exists. Try logging in." }, values };
  }
  if (error?.code === "weak_password") {
    return { errors: { password: "Choose a stronger password." }, values };
  }
  if (error || !data.user) {
    console.error("signUp failed:", error);
    return { errors: {}, values, message: "We couldn't create your account. Please try again." };
  }

  if (isDoctor) {
    const uploaded = await saveLicence(data.user.id, formData.get("licence") as File);
    if (!uploaded) {
      return {
        ok: true,
        errors: {},
        message: "Your account was created, but the certificate upload failed. Log in and upload it from your dashboard.",
      };
    }
  }

  // No session means Supabase sent a confirmation email first.
  if (!data.session) {
    return {
      ok: true,
      errors: {},
      message: "Account created. Check your email for a confirmation link, then log in.",
    };
  }

  redirect(HOME_FOR_ROLE[isDoctor ? "doctor" : "patient"]);
}
