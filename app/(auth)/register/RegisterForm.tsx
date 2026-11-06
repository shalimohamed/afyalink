"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import GoogleButton from "@/components/GoogleButton";
import { SPECIALTIES } from "@/lib/specialties";
import { register, type RegisterState } from "./actions";

type Role = "patient" | "doctor";

const initialState: RegisterState = { errors: {} };

export default function RegisterForm({ initialRole }: { initialRole: Role }) {
  // useActionState runs the server action and gives back whatever it returned
  // (errors or a success message), plus `pending` while it's running.
  const [state, formAction, pending] = useActionState(register, initialState);
  const [role, setRole] = useState<Role>(initialRole);
  const [feeType, setFeeType] = useState(state.values?.feeType || "per_session");
  const v = state.values ?? {};
  const e = state.errors;

  return (
    <div className="auth-card">
      <div className="eyebrow">Create an account</div>
      <h1>{role === "doctor" ? "Join as a doctor" : "Get started"}</h1>
      <p className="sub">
        {role === "doctor"
          ? "Our team checks your registration before patients can book you."
          : "Check your symptoms, book a verified doctor and pay with M-Pesa."}
      </p>

      <div className="seg" role="group" aria-label="I am a">
        <button type="button" aria-pressed={role === "patient"} onClick={() => setRole("patient")}>
          I&apos;m a patient
        </button>
        <button type="button" aria-pressed={role === "doctor"} onClick={() => setRole("doctor")}>
          I&apos;m a doctor
        </button>
      </div>

      {role === "patient" ? (
        <>
          <div className="google-gap" />
          <GoogleButton label="Sign up with Google" />
          <div className="divider">or with email</div>
        </>
      ) : (
        <p className="notice ok google-gap">
          Doctors register with this form so we can check your registration certificate. Google sign-up is for
          patients.
        </p>
      )}

      <form action={formAction} className="form" noValidate>
        <input type="hidden" name="role" value={role} />

        {state.message && (
          <p className={`notice ${state.ok ? "ok" : "bad"}`} role="status">
            {state.message}
          </p>
        )}

        <Field label="Full name" error={e.fullName}>
          <input name="fullName" autoComplete="name" defaultValue={v.fullName} aria-invalid={!!e.fullName} required />
        </Field>

        <div className="row2">
          <Field label="Email" error={e.email}>
            <input name="email" type="email" autoComplete="email" defaultValue={v.email} aria-invalid={!!e.email} required />
          </Field>
          <Field label="M-Pesa phone number" error={e.phone} hint={e.phone ? undefined : "e.g. 0712 345 678"}>
            <input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v.phone} aria-invalid={!!e.phone} required />
          </Field>
        </div>

        <div className="row2">
          <Field label="Password" error={e.password} hint={e.password ? undefined : "At least 8 characters"}>
            <input name="password" type="password" autoComplete="new-password" aria-invalid={!!e.password} required />
          </Field>
          <Field label="Confirm password" error={e.confirmPassword}>
            <input name="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!e.confirmPassword} required />
          </Field>
        </div>

        {role === "doctor" && (
          <fieldset className="fieldset">
            <legend>Professional details</legend>

            <Field label="Specialty" error={e.specialty}>
              <select name="specialty" defaultValue={v.specialty ?? ""} aria-invalid={!!e.specialty} required>
                <option value="" disabled>
                  Choose one
                </option>
                {SPECIALTIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Registration number"
              error={e.regNumber}
              hint={e.regNumber ? undefined : "Your KMPDC number (or your board number if you're a psychologist)"}
            >
              <input name="regNumber" defaultValue={v.regNumber} aria-invalid={!!e.regNumber} required />
            </Field>

            <Field label="Registration certificate" error={e.licence} hint={e.licence ? undefined : "PDF, JPG or PNG, up to 4 MB"}>
              <input name="licence" type="file" accept=".pdf,.jpg,.jpeg,.png" aria-invalid={!!e.licence} required />
            </Field>

            <div className="field">
              <span id="feeTypeLabel">How do you charge?</span>
              <div className="radios" role="radiogroup" aria-labelledby="feeTypeLabel">
                <label className="radio">
                  <input type="radio" name="feeType" value="per_session" checked={feeType === "per_session"} onChange={() => setFeeType("per_session")} />
                  Per session
                </label>
                <label className="radio">
                  <input type="radio" name="feeType" value="per_hour" checked={feeType === "per_hour"} onChange={() => setFeeType("per_hour")} />
                  Per hour
                </label>
              </div>
              {e.feeType && <small className="err">{e.feeType}</small>}
            </div>

            <Field
              label={feeType === "per_hour" ? "Fee per hour (KES)" : "Fee per session (KES)"}
              error={e.fee}
              hint={e.fee ? undefined : feeType === "per_hour" ? "Patients pay this rate × the length of your slot." : "Patients pay this for each booked slot."}
            >
              <input name="fee" type="number" inputMode="numeric" min={100} max={50000} step={50} defaultValue={v.fee} aria-invalid={!!e.fee} required />
            </Field>
          </fieldset>
        )}

        <p className="empty">
          By creating an account, you agree to how AfyaLink handles your data, as set out in the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="switch">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
      {error && <small className="err">{error}</small>}
    </label>
  );
}
