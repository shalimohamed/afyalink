"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { queryStkPush, stkPush } from "@/lib/mpesa";
import { recordPaymentResult } from "@/lib/payments";
import { normalizeKenyanPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

const HOLD_MS = 5 * 60 * 1000; // same 5 minutes as in the database functions

// Patient clicks "Book" on a slot: hold it for 5 minutes and go to payment.
export async function holdSlot(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole("patient");
  const slotId = String(formData.get("slotId") ?? "");

  // hold_slot() checks the slot is free and the doctor verified, works out
  // the price and locks the slot, all inside the database.
  const { data: bookingId, error } = await supabase.rpc("hold_slot", { p_slot_id: slotId });
  if (error) return { error: error.message };

  redirect(`/patient/bookings/${bookingId}`);
}

type BookingForPayment = { id: string; status: string; amount_kes: number; created_at: string };

async function loadHeldBooking(bookingId: string) {
  const { supabase } = await requireRole("patient");
  // RLS: patients can only load their own bookings.
  const { data } = await supabase
    .from("bookings")
    .select("id, status, amount_kes, created_at")
    .eq("id", bookingId)
    .maybeSingle<BookingForPayment>();
  return data;
}

// Patient enters their M-Pesa number: send the PIN prompt to their phone.
export async function startPayment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const phone = normalizeKenyanPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter a Safaricom number, e.g. 0712 345 678." };

  const booking = await loadHeldBooking(bookingId);
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "pending_payment" || Date.now() - new Date(booking.created_at).getTime() > HOLD_MS) {
    return { error: "Your 5-minute hold has run out. Please pick the slot again." };
  }

  const admin = createAdminClient();
  const { data: recent } = await admin
    .from("payments")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("status", "pending")
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if (recent?.length) return { error: "We've just sent a prompt to your phone. Please check it, or wait a minute to try again." };

  let push;
  try {
    push = await stkPush({ phone, amount: booking.amount_kes, reference: "AfyaLink" });
  } catch (error) {
    console.error("STK push failed:", error);
    return { error: "We couldn't reach M-Pesa. Please try again." };
  }

  const { error } = await admin.from("payments").insert({
    booking_id: booking.id,
    phone,
    checkout_request_id: push.checkoutRequestId,
    merchant_request_id: push.merchantRequestId,
  });
  if (error) console.error("Saving payment failed:", error);

  revalidatePath(`/patient/bookings/${booking.id}`);
  return {};
}

// "Check payment status": asks Safaricom directly, for when the callback is
// slow or can't reach us (e.g. ngrok isn't running).
export async function checkPayment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const booking = await loadHeldBooking(bookingId);
  if (!booking) return { error: "Booking not found." };

  const admin = createAdminClient();
  const { data: pending } = await admin
    .from("payments")
    .select("checkout_request_id")
    .eq("booking_id", booking.id)
    .eq("status", "pending");

  for (const payment of pending ?? []) {
    const result = await queryStkPush(payment.checkout_request_id);
    if (result.status !== "pending") {
      await recordPaymentResult({
        checkoutRequestId: payment.checkout_request_id,
        success: result.status === "success",
        resultCode: result.resultCode,
        resultDesc: result.resultDesc,
      });
    }
  }

  revalidatePath(`/patient/bookings/${booking.id}`);
  return {};
}
