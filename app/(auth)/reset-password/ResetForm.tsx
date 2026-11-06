"use client";

import { useActionState } from "react";
import { setNewPassword, type ResetState } from "./actions";

const initialState: ResetState = { errors: {} };

export default function ResetForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(setNewPassword, initialState);
  const e = state.errors;

  return (
    <div className="auth-card narrow">
      <div className="eyebrow">Reset your password</div>
      <h1>Choose a new password</h1>
      <p className="sub">For {email}.</p>

      <form action={formAction} className="form" noValidate>
        {state.message && (
          <p className="notice bad" role="alert">
            {state.message}
          </p>
        )}
        <label className="field">
          <span>New password</span>
          <input name="password" type="password" autoComplete="new-password" aria-invalid={!!e.password} required />
          {e.password ? <small className="err">{e.password}</small> : <small>At least 8 characters.</small>}
        </label>
        <label className="field">
          <span>Repeat the new password</span>
          <input name="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!e.confirmPassword} required />
          {e.confirmPassword && <small className="err">{e.confirmPassword}</small>}
        </label>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </div>
  );
}
