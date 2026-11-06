"use client";

import Link from "next/link";
import { useActionState } from "react";
import GoogleButton from "@/components/GoogleButton";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { errors: {} };

export default function LoginForm({ googleFailed = false }: { googleFailed?: boolean }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const e = state.errors;

  return (
    <div className="auth-card narrow">
      <div className="eyebrow">Welcome back</div>
      <h1>Log in</h1>
      <p className="sub">Patients, doctors and admins all log in here.</p>

      {googleFailed && (
        <p className="notice bad" role="alert">
          Google sign-in didn&apos;t work. Please try again, or log in with your email.
        </p>
      )}
      <GoogleButton />
      <div className="divider">or with email</div>

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
        <Link href="/forgot-password" className="field-link">
          Forgot your password?
        </Link>

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
