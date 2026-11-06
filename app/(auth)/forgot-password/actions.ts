"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotState = { error?: string; sentTo?: string; email?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Forgot your password?": Supabase emails a one-time link. It leads to
// /auth/callback, which logs the user in and sends them to /reset-password to
// choose a new one. The link only works in the browser that asked for it,
// because that browser holds the matching secret (the PKCE "code verifier").
export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", email };

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? `http://${requestHeaders.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error?.code === "over_email_send_rate_limit") {
    return { error: "Too many emails have been sent. Please try again in an hour.", email };
  }
  if (error) console.error("Sending the password reset email failed:", error);

  // The same answer whether or not the email has an account, so nobody can use
  // this form to find out who is registered.
  return { sentTo: email };
}
