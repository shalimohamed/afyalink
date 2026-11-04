import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewList from "@/components/ReviewList";
import { requireRole } from "@/lib/auth";
import { averageRating, loadReviews } from "@/lib/reviews";

export const metadata: Metadata = { title: "Doctor reviews · AfyaLink" };

// Evidence for the admin before suspending someone: every review of one doctor
// and who wrote it, so an abusive comment can be traced to the patient.
export default async function DoctorReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("admin");

  const { data: doctor } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .eq("role", "doctor")
    .maybeSingle<{ full_name: string }>();
  if (!doctor) notFound();

  const reviews = await loadReviews(supabase, id);
  const average = averageRating(reviews);

  return (
    <>
      <Link href="/admin/reviews" className="back">
        ← All reviews
      </Link>
      <div className="eyebrow">Reviews</div>
      <h1>Dr. {doctor.full_name}</h1>
      <p className="sub">
        {average !== null ? `★ ${average.toFixed(1)} from ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}` : "No reviews yet."}
      </p>
      <ReviewList reviews={reviews} />
    </>
  );
}
