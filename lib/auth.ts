import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "patient" | "doctor" | "admin";

export const HOME_FOR_ROLE: Record<Role, string> = {
  patient: "/patient",
  doctor: "/doctor",
  admin: "/admin",
};

// (The phone number isn't here: only lib/phone.ts loadPhones() can read it.)
export type Profile = { id: string; role: Role; full_name: string };

// Loads the logged-in user's profile, or sends logged-out users to /login.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  return { supabase, user, profile };
}

// Same, for a page that only one role may open. Users with a different role
// go to their own dashboard.
export async function requireRole(role: Role) {
  const session = await requireUser();
  if (session.profile.role !== role) redirect(HOME_FOR_ROLE[session.profile.role]);
  return session;
}
