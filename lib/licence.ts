import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const LICENCE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_LICENCE_BYTES = 4 * 1024 * 1024; // 4 MB. Vercel rejects request bodies over 4.5 MB.

// Returns an error message, or null if the file is a usable certificate.
export function licenceError(licence: FormDataEntryValue | null): string | null {
  if (!(licence instanceof File) || licence.size === 0) return "Upload your registration certificate.";
  if (!LICENCE_TYPES.includes(licence.type)) return "Upload a PDF, JPG or PNG file.";
  if (licence.size > MAX_LICENCE_BYTES) return "The file must be 4 MB or smaller.";
  return null;
}

// Saves the certificate to the private 'licences' bucket as
// licences/<doctor id>/licence.<ext> and records the path on the doctor. A new
// upload after a rejection puts the doctor back in the verification queue.
// Uses the service-role client because, at signup with email confirmation on,
// the doctor isn't logged in yet. Callers must check who the doctor is first.
export async function saveLicence(doctorId: string, file: File): Promise<boolean> {
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const path = `${doctorId}/licence.${ext}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from("licences")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    console.error("Licence upload failed:", uploadError);
    return false;
  }

  const { error: updateError } = await admin
    .from("doctors")
    .update({
      licence_path: path,
      verification_status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
    })
    .eq("id", doctorId)
    .neq("verification_status", "verified");
  if (updateError) {
    console.error("Saving licence path failed:", updateError);
    return false;
  }
  return true;
}
