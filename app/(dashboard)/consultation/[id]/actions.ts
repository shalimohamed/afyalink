"use server";

import { requireUser } from "@/lib/auth";
import { loadConsultation } from "@/lib/consultations";
import { canJoinCall, createVideoToken } from "@/lib/livekit";

export type CallTokenResult = { token?: string; ended?: string; error?: string };

// Called when the patient or doctor presses "Join" (or "Rejoin"). The access
// token is made here, at that moment, so every join is checked again: after
// the prescription, only while the other person is still in the call.
export async function getCallToken(bookingId: string): Promise<CallTokenResult> {
  const { supabase, profile } = await requireUser();
  const consultation = await loadConsultation(supabase, bookingId);
  const isDoctor = profile.id === consultation?.slot.doctor_id;
  if (!consultation || (!isDoctor && profile.id !== consultation.patient_id)) return { error: "Consultation not found." };

  if (!(await canJoinCall(consultation))) {
    return {
      ended: consultation.prescription
        ? "The consultation is complete and the call has ended."
        : consultation.callWindow === "early"
          ? "The call isn't open yet. It opens 15 minutes before the start time."
          : "This consultation has ended.",
    };
  }

  try {
    const name = isDoctor ? `Dr. ${consultation.slot.doctor?.profile.full_name ?? ""}` : (consultation.patient?.profile.full_name ?? "Patient");
    const token = await createVideoToken({ bookingId, userId: profile.id, displayName: name, isDoctor, endsAt: consultation.slot.ends_at });
    return { token };
  } catch (error) {
    console.error("Creating video token failed:", error);
    return { error: "We couldn't start the video call. Please try again in a moment." };
  }
}
