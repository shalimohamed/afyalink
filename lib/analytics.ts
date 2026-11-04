import type { SupabaseClient } from "@supabase/supabase-js";
import { nairobiToday } from "@/lib/time";

// The admin dashboard, its AI overview and the PDF report all use these
// numbers. They are aggregated only (counts, sums, averages): no names,
// symptoms or other details of any one patient.

export const ANALYTICS_DAYS = 14;

// What admin_analytics() returns (supabase/migrations/0004_admin_analytics.sql).
export type Analytics = {
  patients: number;
  doctors_verified: number;
  doctors_pending: number;
  consultations: number;
  consultations_done: number;
  revenue_kes: number;
  symptom_checks: number;
  red_flags: number;
  prescriptions: number;
  average_rating: number | null;
  review_count: number;
  bookings_per_day: { day: string; count: number }[];
  by_specialty: { label: string; count: number }[];
  urgency: Partial<Record<"routine" | "within_24_hours" | "emergency", number>>;
};

// Extra counts for the last ANALYTICS_DAYS days, worked out here from tables
// admins may read under row-level security.
export type Period = {
  days: number;
  paidLast7Days: number;
  paidPrevious7Days: number;
  revenueKes: number;
  paymentsSucceeded: number;
  paymentsFailed: number;
  unpaidHolds: number; // bookings whose 5-minute hold ran out without payment
  reviewsByStars: Record<"1" | "2" | "3" | "4" | "5", number>; // all time
};

export type Report = { analytics: Analytics; period: Period };

const HOLD_MS = 5 * 60 * 1000;

// Returns null if admin_analytics() is missing (migration 0004 not run).
export async function loadReport(supabase: SupabaseClient): Promise<Report | null> {
  // Midnight in Nairobi at the start of the period (Kenya has no daylight saving).
  const since = new Date(new Date(`${nairobiToday()}T00:00:00+03:00`).getTime() - (ANALYTICS_DAYS - 1) * 86_400_000).toISOString();

  const [{ data, error }, { data: paid }, { data: started }, { data: payments }, { data: reviews }] = await Promise.all([
    supabase.rpc("admin_analytics", { p_days: ANALYTICS_DAYS }),
    supabase.from("bookings").select("amount_kes").eq("status", "confirmed").gte("confirmed_at", since),
    supabase.from("bookings").select("status, created_at").gte("created_at", since),
    supabase.from("payments").select("status").gte("created_at", since),
    supabase.from("reviews").select("rating"),
  ]);
  if (error || !data) return null;

  const analytics = data as Analytics;
  const perDay = analytics.bookings_per_day.map((d) => Number(d.count));
  const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

  const reviewsByStars: Period["reviewsByStars"] = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of (reviews ?? []) as { rating: number }[]) reviewsByStars[String(r.rating) as keyof typeof reviewsByStars]++;

  const now = Date.now();
  const unpaidHolds = ((started ?? []) as { status: string; created_at: string }[]).filter(
    (b) => b.status === "expired" || (b.status === "pending_payment" && now - new Date(b.created_at).getTime() > HOLD_MS),
  ).length;
  const paymentStatuses = ((payments ?? []) as { status: string }[]).map((p) => p.status);

  return {
    analytics,
    period: {
      days: ANALYTICS_DAYS,
      paidLast7Days: sum(perDay.slice(-7)),
      paidPrevious7Days: sum(perDay.slice(-14, -7)),
      revenueKes: sum(((paid ?? []) as { amount_kes: number }[]).map((b) => b.amount_kes)),
      paymentsSucceeded: paymentStatuses.filter((s) => s === "success").length,
      paymentsFailed: paymentStatuses.filter((s) => s === "failed").length,
      unpaidHolds,
      reviewsByStars,
    },
  };
}
