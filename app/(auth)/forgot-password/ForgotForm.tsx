"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "./actions";

const initialState: ForgotState = {};

export default function ForgotForm({ linkFailed = false }: { linkFailed?: boolean }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <div className="auth-card narrow">
      <div className="eyebrow">Forgot your password?</div>
      <h1>Reset your password</h1>
      <p className="sub">Enter your email and we&apos;ll send you a link to choose a new password.</p>

      {linkFailed && !state.sentTo && (
        <p className="notice bad" role="alert">
          That link has expired, was already used, or was opened in a different browser. Please ask for a new one.
        </p>
      )}

      {state.sentTo ? (
        <p className="notice ok" role="status">
          If <strong>{state.sentTo}</strong> has an AfyaLink account, we&apos;ve emailed it a link. Open it on this device,
          in this browser. It works once and expires after an hour.
        </p>
      ) : (
        <form action={formAction} className="form" noValidate>
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" defaultValue={state.email} aria-invalid={!!state.error} required />
            {state.error && <small className="err">{state.error}</small>}
          </label>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="switch">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
