"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";

// Patient asks a doctor they've consulted before for a free follow-up chat.
export async function requestChat(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireRole("patient");
  const doctorId = String(formData.get("doctorId") ?? "");

  // RLS only allows this if the patient has a paid booking with this doctor.
  const { data, error } = await supabase
    .from("chat_requests")
    .insert({ patient_id: profile.id, doctor_id: doctorId })
    .select("id")
    .single<{ id: string }>();
  if (error?.code === "23505") return { error: "You already have a request waiting for this doctor." };
  if (error?.code === "42501") return { error: "You can only chat with doctors you've had a paid consultation with." };
  if (error || !data) {
    console.error("Chat request failed:", error);
    return { error: "We couldn't send the request. Please try again." };
  }

  redirect(`/chat/${data.id}`);
}

// Doctor accepts (opens the chat for 3 hours) or rejects a request.
export async function answerChat(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole("doctor");
  const chatId = String(formData.get("chatId") ?? "");
  const accept = formData.get("decision") === "accept";

  const { error } = await supabase.rpc("respond_chat_request", { p_request_id: chatId, p_accept: accept });
  if (error) return { error: error.message };

  revalidatePath("/chat");
  revalidatePath(`/chat/${chatId}`);
  return {};
}
