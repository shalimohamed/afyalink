"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";

// Approve or reject a doctor. The review_doctor() database function checks
// again that the caller is an admin, so this can't be skipped by calling the
// API directly.
export async function reviewDoctor(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole("admin");
  const doctorId = String(formData.get("doctorId") ?? "");
  const approve = formData.get("decision") === "approve";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!approve && reason.length < 5) {
    return { error: "Tell the doctor why (at least 5 characters)." };
  }

  const { error } = await supabase.rpc("review_doctor", {
    p_doctor_id: doctorId,
    p_approve: approve,
    p_reason: approve ? null : reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/doctors");
  revalidatePath("/admin");
  return {};
}
