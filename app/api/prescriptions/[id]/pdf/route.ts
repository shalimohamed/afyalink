import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Every "Download PDF" button points here. It checks the user may see the
// prescription, records the patient's first download (so the dashboard guide
// stops reminding them), then sends the browser to a 10-minute download link.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  // Row-level security: only the booking's patient and doctor get a row back.
  const { data: prescription } = await supabase
    .from("prescriptions")
    .select("id, pdf_path, booking_id, bookings(patient_id)")
    .eq("id", id)
    .maybeSingle<{ id: string; pdf_path: string | null; booking_id: string; bookings: { patient_id: string } | null }>();
  if (!prescription?.pdf_path) return new NextResponse("Prescription not found", { status: 404 });

  const { data: signed } = await supabase.storage
    .from("prescriptions")
    .createSignedUrl(prescription.pdf_path, 600, { download: "AfyaLink-prescription.pdf" });
  if (!signed?.signedUrl) return new NextResponse("Couldn't prepare the download. Please try again.", { status: 500 });

  // Only the patient's download counts (not the doctor checking it). Patients
  // can't write to prescriptions, so the server records it with the service role.
  if (prescription.bookings?.patient_id === user.id) {
    const { error } = await createAdminClient()
      .from("prescriptions")
      .update({ downloaded_at: new Date().toISOString() })
      .eq("id", prescription.id)
      .is("downloaded_at", null);
    if (error) console.error("Recording prescription download failed (run migration 0005?):", error.message);
  }

  return NextResponse.redirect(signed.signedUrl);
}
