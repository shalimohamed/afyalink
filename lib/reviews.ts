import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  patient: { id: string; name: string };
  doctor: { id: string; name: string };
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  booking: {
    patient: { id: string; profile: { full_name: string } };
    slot: { doctor_id: string; doctor: { profile: { full_name: string } } };
  };
};

// Reviews for the admin pages, newest first, with who wrote them and about
// whom. Admins can read every review under row-level security. A review
// reaches its doctor through the booking's slot (bookings have no doctor_id),
// and "!inner" drops the reviews that don't match a doctor filter.
export async function loadReviews(supabase: SupabaseClient, doctorId?: string): Promise<AdminReview[]> {
  let query = supabase
    .from("reviews")
    .select(
      "id, rating, comment, created_at, " +
        "booking:bookings!inner(patient:patients(id, profile:profiles(full_name)), " +
        "slot:availability_slots!inner(doctor_id, doctor:doctors(profile:profiles!doctors_id_fkey(full_name))))",
    );
  if (doctorId) query = query.eq("booking.slot.doctor_id", doctorId);
  const { data } = await query.order("created_at", { ascending: false });

  return ((data ?? []) as unknown as ReviewRow[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    patient: { id: r.booking.patient.id, name: r.booking.patient.profile.full_name },
    doctor: { id: r.booking.slot.doctor_id, name: r.booking.slot.doctor.profile.full_name },
  }));
}

export function averageRating(reviews: { rating: number }[]) {
  return reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
}
