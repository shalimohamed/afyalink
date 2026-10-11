import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentResult = {
  checkoutRequestId: string;
  success: boolean;
  resultCode?: number;
  resultDesc?: string;
  receipt?: string;
  amount?: number;
};

// Saves what M-Pesa reported for one STK push and, if it was paid, confirms
// the booking. This is the ONLY place a booking becomes "confirmed", and only
// with a result from Safaricom, never because the browser says so.
// It uses the service-role client because payments and bookings can't be
// written by users. Safe to call twice for the same payment: the second call
// does nothing.
export async function recordPaymentResult(result: PaymentResult) {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, booking_id, status, bookings(amount_kes)")
    .eq("checkout_request_id", result.checkoutRequestId)
    .maybeSingle<{ id: string; booking_id: string; status: string; bookings: { amount_kes: number } }>();
  if (!payment) {
    console.error("Payment result for an unknown CheckoutRequestID:", result.checkoutRequestId);
    return;
  }
  if (payment.status !== "pending") return; // already recorded

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: result.success ? "success" : "failed",
      result_code: result.resultCode ?? null,
      result_desc: result.resultDesc ?? null,
      mpesa_receipt: result.receipt ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("status", "pending");
  if (paymentError) {
    console.error("Saving payment result failed:", paymentError);
    return;
  }
  if (!result.success) return;

  // Paid amount must match the booking's price.
  if (result.amount !== undefined && Math.round(result.amount) !== payment.bookings.amount_kes) {
    console.error(`Amount mismatch on booking ${payment.booking_id}: paid ${result.amount}, expected ${payment.bookings.amount_kes}`);
    return;
  }

  // Confirm the booking. If the 5-minute hold ran out while the patient was
  // paying, we still confirm it unless someone else has taken the slot since.
  // In that case the "one active booking per slot" index refuses the update.
  const { error: bookingError } = await admin
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", payment.booking_id)
    .in("status", ["pending_payment", "expired"]);
  if (bookingError?.code === "23505") {
    console.error(`Booking ${payment.booking_id} was paid after its slot was taken by someone else. Refund needed.`);
  } else if (bookingError) {
    console.error("Confirming booking failed:", bookingError);
  }
  // No video setup needed here: the LiveKit room is created automatically
  // when the patient or doctor first joins (see lib/livekit.ts).
}
