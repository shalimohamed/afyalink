import type { SupabaseClient } from "@supabase/supabase-js";

export type DoctorSummary = {
  id: string;
  fullName: string;
  specialtyId: string;
  specialtyLabel: string;
  feeType: "per_session" | "per_hour";
  feeKes: number;
  bio: string | null;
  averageRating: number | null;
  reviewCount: number;
};

type DoctorRow = {
  id: string;
  specialty_id: string;
  fee_type: "per_session" | "per_hour";
  fee_kes: number;
  bio: string | null;
  profile: { full_name: string };
  specialties: { label: string };
};

// Verified doctors, optionally only one specialty, with their average rating.
// Unverified doctors are never returned: the query asks for verified ones, and
// row-level security hides unverified doctors from patients anyway.
export async function getVerifiedDoctors(supabase: SupabaseClient, specialtyId?: string): Promise<DoctorSummary[]> {
  let query = supabase
    .from("doctors")
    .select("id, specialty_id, fee_type, fee_kes, bio, profile:profiles!doctors_id_fkey(full_name), specialties(label)")
    .eq("verification_status", "verified");
  if (specialtyId) query = query.eq("specialty_id", specialtyId);

  const [{ data }, { data: ratings }] = await Promise.all([query, supabase.rpc("get_doctor_ratings")]);
  const ratingByDoctor = new Map(
    ((ratings ?? []) as { doctor_id: string; average_rating: number; review_count: number }[]).map((r) => [r.doctor_id, r]),
  );

  return ((data ?? []) as unknown as DoctorRow[])
    .map((d) => {
      const rating = ratingByDoctor.get(d.id);
      return {
        id: d.id,
        fullName: d.profile.full_name,
        specialtyId: d.specialty_id,
        specialtyLabel: d.specialties.label,
        feeType: d.fee_type,
        feeKes: d.fee_kes,
        bio: d.bio,
        averageRating: rating ? Number(rating.average_rating) : null,
        reviewCount: rating ? Number(rating.review_count) : 0,
      };
    })
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
}
