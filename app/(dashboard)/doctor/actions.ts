"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { licenceError, saveLicence } from "@/lib/licence";

// Doctor uploads (or replaces) their registration certificate. If they were
// rejected, this puts them back in the admin's queue.
export async function uploadLicence(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { profile } = await requireRole("doctor");

  const file = formData.get("licence");
  const problem = licenceError(file);
  if (problem) return { error: problem };

  const saved = await saveLicence(profile.id, file as File);
  if (!saved) return { error: "The upload failed. Please try again." };

  revalidatePath("/doctor");
  return {};
}
