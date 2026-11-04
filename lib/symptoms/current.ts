import type { SupabaseClient } from "@supabase/supabase-js";

const CURRENT_MS = 24 * 60 * 60 * 1000;

// The logged-in patient's CURRENT symptom check: the one a new booking would
// share with its doctor. Same rule as hold_slot() in migration 0009: the latest
// check from the last 24 hours, unless they've paid for a booking since then.
export async function loadCurrentCheck(supabase: SupabaseClient) {
  const { data: check } = await supabase
    .from("symptom_checks")
    .select("symptoms, created_at")
    .gte("created_at", new Date(Date.now() - CURRENT_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ symptoms: string; created_at: string }>();
  if (!check) return null;

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed")
    .gt("created_at", check.created_at);
  return count ? null : check;
}
