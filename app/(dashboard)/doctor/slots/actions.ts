"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { NAIROBI_OFFSET, SLOT_LENGTHS } from "@/lib/time";

export type SlotFormState = { error?: string; message?: string };

// Which days to create the slot on, counted from the chosen date.
const REPEAT_DAYS: Record<string, number[]> = {
  once: [0],
  next5days: [0, 1, 2, 3, 4],
  weekly4: [0, 7, 14, 21],
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function addSlots(_prev: SlotFormState, formData: FormData): Promise<SlotFormState> {
  const { supabase, profile } = await requireRole("doctor");

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const minutes = Number(formData.get("minutes"));
  const repeat = REPEAT_DAYS[String(formData.get("repeat"))];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Choose a date." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Choose a start time." };
  if (Number(time.slice(3)) % 5 !== 0) return { error: "Start times go in 5-minute steps, e.g. 10:05 or 10:10." };
  if (!SLOT_LENGTHS.includes(minutes)) return { error: "Choose how long the consultation is." };
  if (!repeat) return { error: "Choose how often to repeat it." };

  // The doctor types Kenyan time, so we attach +03:00 before converting.
  const first = new Date(`${date}T${time}:00${NAIROBI_OFFSET}`);
  if (Number.isNaN(first.getTime())) return { error: "That date or time isn't valid." };
  if (first.getTime() <= Date.now()) return { error: "Choose a time in the future." };
  if (first.getTime() > Date.now() + 90 * DAY_MS) return { error: "You can add slots up to 3 months ahead." };

  const rows = repeat.map((days) => {
    const start = new Date(first.getTime() + days * DAY_MS);
    return {
      doctor_id: profile.id,
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + minutes * 60 * 1000).toISOString(),
    };
  });

  // Row-level security makes sure doctor_id is the logged-in doctor.
  const { error } = await supabase.from("availability_slots").insert(rows);
  if (error?.code === "23P01") {
    return { error: "This overlaps a slot you already have. Nothing was added." };
  }
  if (error) {
    console.error("Adding slots failed:", error);
    return { error: "We couldn't add the slot. Please try again." };
  }

  revalidatePath("/doctor/slots");
  return { message: rows.length === 1 ? "Slot added." : `${rows.length} slots added.` };
}

export async function deleteSlot(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole("doctor");
  const slotId = String(formData.get("slotId") ?? "");

  // RLS only lets a doctor delete their own slots while nobody has booked or
  // is paying for them. If it blocks the delete, no rows come back.
  const { data, error } = await supabase.from("availability_slots").delete().eq("id", slotId).select("id");
  if (error?.code === "23503") {
    return { error: "A patient tried to book this slot before, so it's kept for the records." };
  }
  if (error) return { error: "We couldn't delete the slot. Please try again." };
  if (!data?.length) return { error: "This slot is booked or being paid for, so it can't be deleted." };

  revalidatePath("/doctor/slots");
  return {};
}
