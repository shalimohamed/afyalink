"use server";

import { redirect } from "next/navigation";
import { HOME_FOR_ROLE, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

  // Supabase checks the password and, if it's right, the server client saves
  // the login session in cookies.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.code === "email_not_confirmed") {
    return { errors: {}, values: { email }, message: "Please confirm your email first. Check your inbox for the link." };
  }
  if (error || !data.user) {
    // Same message for a wrong email or a wrong password, so nobody can find
    // out which emails have accounts.
    return { errors: {}, values: { email }, message: "Wrong email or password." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single<{ role: Role }>();
  redirect(HOME_FOR_ROLE[profile?.role ?? "patient"]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
