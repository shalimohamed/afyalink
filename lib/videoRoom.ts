import "server-only";
import { createRoom } from "@/lib/daily";
import { createAdminClient } from "@/lib/supabase/admin";

// Makes sure a confirmed booking has a video room, and returns its URL.
// Called right after payment is confirmed, and again when someone opens the
// consultation page (in case Daily was unreachable the first time).
export async function ensureVideoRoom(bookingId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("status, video_room_url, slot:availability_slots(starts_at, ends_at)")
    .eq("id", bookingId)
    .maybeSingle<{ status: string; video_room_url: string | null; slot: { starts_at: string; ends_at: string } }>();
  if (!booking || booking.status !== "confirmed") return null;
  if (booking.video_room_url) return booking.video_room_url;

  try {
    const url = await createRoom(bookingId, booking.slot.starts_at, booking.slot.ends_at);
    await admin.from("bookings").update({ video_room_url: url }).eq("id", bookingId);
    return url;
  } catch (error) {
    console.error("Creating video room failed:", error);
    return null;
  }
}
