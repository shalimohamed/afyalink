"use server";

export type LoginState = {
  ok?: boolean;
  message?: string;
  errors: Record<string, string>;
  values?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const errors: Record<string, string> = {};

  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  if (Object.keys(errors).length > 0) return { errors, values: { email } };

  // TODO(Phase 1): sign in with Supabase Auth, then redirect to the right
  // dashboard for the user's role (patient, doctor or admin).
  return {
    ok: true,
    errors: {},
    values: { email },
    message: "Your details look good. Logging in comes next, once Supabase is connected.",
  };
}
