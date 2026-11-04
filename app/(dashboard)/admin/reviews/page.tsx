import type { Metadata } from "next";
import Link from "next/link";
import BarList from "@/components/charts/BarList";
import ReviewList from "@/components/ReviewList";
import { requireRole } from "@/lib/auth";
import { averageRating, loadReviews } from "@/lib/reviews";

export const metadata: Metadata = { title: "Reviews · AfyaLink" };

const FILTERS = [
  { value: "all", label: "All", matches: () => true },
  { value: "low", label: "1–2 ★", matches: (rating: number) => rating <= 2 },
  { value: "mid", label: "3 ★", matches: (rating: number) => rating === 3 },
  { value: "high", label: "4–5 ★", matches: (rating: number) => rating >= 4 },
];

const STAR_COLOR: Record<number, string> = {
  5: "var(--chart-good)",
  4: "var(--chart-good)",
  3: "var(--chart-warn)",
  2: "var(--chart-bad)",
  1: "var(--chart-bad)",
};

// Every review on the platform, so the admin can spot doctors with poor
// ratings and patients who leave abusive comments.
export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ stars?: string }> }) {
  const { supabase } = await requireRole("admin");
  const { stars = "all" } = await searchParams;
  const filter = FILTERS.find((f) => f.value === stars) ?? FILTERS[0];

  const reviews = await loadReviews(supabase);
  const shown = reviews.filter((r) => filter.matches(r.rating));
  const average = averageRating(reviews);

  return (
    <>
      <Link href="/admin" className="back">
        ← Overview
      </Link>
      <div className="eyebrow">Admin</div>
      <h1>Reviews</h1>
      <p className="sub">
        {average !== null
          ? `★ ${average.toFixed(1)} from ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}. `
          : "No reviews yet. "}
        Tap a doctor to see only their reviews, or a patient to find them in the user list.
      </p>

      {reviews.length > 0 && (
        <BarList
          title="Reviews by rating"
          unit="reviews"
          empty="No reviews yet."
          bars={[5, 4, 3, 2, 1].map((n) => ({
            key: String(n),
            label: `${n} ★`,
            value: reviews.filter((r) => r.rating === n).length,
            color: STAR_COLOR[n],
          }))}
        />
      )}

      <nav className="chips" aria-label="Filter by rating">
        {FILTERS.map((f) => (
          <Link key={f.value} href={`/admin/reviews?stars=${f.value}`} className="chip" aria-current={filter.value === f.value ? "page" : undefined}>
            {f.label}
          </Link>
        ))}
      </nav>

      {reviews.length > 0 && shown.length === 0 && <p className="empty">No reviews with this rating.</p>}
      <ReviewList reviews={shown} showDoctor />
    </>
  );
}
