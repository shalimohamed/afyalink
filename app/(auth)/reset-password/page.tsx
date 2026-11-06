import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password · AfyaLink" };

// Reached from the reset email, through /auth/callback, which has just logged
// the user in. Without that login, the link didn't work: ask for a new one.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=link");

  return <ResetForm email={user.email ?? "your account"} />;
}
