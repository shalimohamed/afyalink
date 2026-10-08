import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "patient" | "doctor" | "admin";

export const HOME_FOR_ROLE: Record<Role, string> = {
  patient: "/patient",
  doctor: "/doctor",
  admin: "/admin",
};

export type Profile = { id: string; role: Role; full_name: string; phone: string | null };

// Loads the logged-in user's profile for a dashboard page. Logged-out users go
// to /login; users with a different role go to their own dashboard.
export async function requireRole(role: Role) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(HOME_FOR_ROLE[profile.role]);

  return { supabase, user, profile };
}
