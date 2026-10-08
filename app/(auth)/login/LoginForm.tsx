"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { errors: {} };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const e = state.errors;

  return (
    <div className="auth-card narrow">
      <div className="eyebrow">Welcome back</div>
      <h1>Log in</h1>
      <p className="sub">Patients, doctors and admins all log in here.</p>

      <form action={formAction} className="form" noValidate>
        {state.message && (
          <p className={`notice ${state.ok ? "ok" : "bad"}`} role="status">
            {state.message}
          </p>
        )}

        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" defaultValue={state.values?.email} aria-invalid={!!e.email} required />
          {e.email && <small className="err">{e.email}</small>}
        </label>

        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" aria-invalid={!!e.password} required />
          {e.password && <small className="err">{e.password}</small>}
        </label>

        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="switch">
        New to AfyaLink? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
