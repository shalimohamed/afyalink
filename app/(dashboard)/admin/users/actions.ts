"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Suspend or reactivate an account. A suspended ("banned") user can't log in
// or renew their session; any session they already have runs out within an hour.
export async function setSuspended(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireRole("admin");
  const userId = String(formData.get("userId") ?? "");
  const suspend = formData.get("suspend") === "true";

  if (userId === profile.id) return { error: "You can't suspend your own account." };
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
  if (!target) return { error: "User not found." };
  if (target.role === "admin") return { error: "Admin accounts can't be suspended here." };

  // Changing someone's login needs the service-role key (Supabase Auth admin API).
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: suspend ? "876000h" : "none", // ~100 years, or lift the ban
  });
  if (error) {
    console.error("Changing suspension failed:", error);
    return { error: "We couldn't update this account. Please try again." };
  }

  revalidatePath("/admin/users");
  return {};
}
