"use server";

import { redirect } from "next/navigation";
import { HOME_FOR_ROLE, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { errors: Record<string, string>; message?: string };

// Saves the new password. The reset link has already logged the user in (see
// app/auth/callback/route.ts), so Supabase knows whose password this is.
export async function setNewPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { errors: { password: "Use at least 8 characters." } };
  if (password !== String(formData.get("confirmPassword") ?? "")) {
    return { errors: { confirmPassword: "Passwords don't match." } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=link");

  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password") return { errors: { password: "Choose a different password from your old one." } };
  if (error?.code === "weak_password") return { errors: { password: "Choose a stronger password." } };
  if (error) {
    console.error("Changing the password failed:", error);
    return { errors: {}, message: "We couldn't change your password. Please try again." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single<{ role: Role }>();
  redirect(HOME_FOR_ROLE[profile?.role ?? "patient"]);
}
