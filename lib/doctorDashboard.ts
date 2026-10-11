import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanionMessage } from "@/components/companion/Companion";
import { loadDoctorConsultations } from "@/lib/consultations";
import { NAIROBI_OFFSET, TIME_ZONE } from "@/lib/time";

const HOLD_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DOCTOR_TIPS = [
  "Write the prescription right after the call, while the details are fresh.",
  "A quiet room and light facing you make a video consultation feel more personal.",
  "Patients can rate you after each consultation. A warm goodbye goes a long way.",
  "Keep your availability a week ahead so patients can plan their visit.",
];

export type TimelineSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  state: "free" | "paying" | "booked";
  patientName: string | null;
  bookingId: string | null;
};

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  bookings: { id: string; status: string; created_at: string; patient: { profile: { full_name: string } | null } | null }[];
};

const timeFmt = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = new Intl.DateTimeFormat("en-KE", { timeZone: "UTC", weekday: "short" });
const nairobiDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);

function relative(iso: string, now: number) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} minutes`;
  if (nairobiDay(new Date(iso)) === nairobiDay(new Date(now))) return `today at ${timeFmt.format(new Date(iso))}`;
  return `on ${new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, weekday: "long" }).format(new Date(iso))} at ${timeFmt.format(new Date(iso))}`;
}

export async function loadDoctorDashboard(
  supabase: SupabaseClient,
  doctorId: string,
  status: string,
  pendingChats: number,
) {
  const now = Date.now();
  const today = nairobiDay(new Date(now));
  const dayStart = new Date(`${today}T00:00:00${NAIROBI_OFFSET}`);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  // This week, Monday to Sunday (Kenyan time).
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const monday = new Date(new Date(`${today}T00:00:00Z`).getTime() - ((dow + 6) % 7) * DAY_MS).toISOString().slice(0, 10);

  const [{ data: slotData }, consultations, { count: upcomingSlots }] = await Promise.all([
    supabase
      .from("availability_slots")
      .select("id, starts_at, ends_at, bookings(id, status, created_at, patient:patients(profile:profiles(full_name)))")
      .eq("doctor_id", doctorId)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at"),
    loadDoctorConsultations(supabase),
    supabase
      .from("availability_slots")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", doctorId)
      .gte("starts_at", new Date(now).toISOString()),
  ]);

  // Today's slots, each marked free / patient paying / booked.
  const todaySlots: TimelineSlot[] = ((slotData ?? []) as unknown as SlotRow[]).map((s) => {
    const confirmed = s.bookings.find((b) => b.status === "confirmed");
    const paying = s.bookings.find((b) => b.status === "pending_payment" && now - new Date(b.created_at).getTime() < HOLD_MS);
    return {
      id: s.id,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      state: confirmed ? "booked" : paying ? "paying" : "free",
      patientName: confirmed?.patient?.profile?.full_name ?? null,
      bookingId: confirmed?.id ?? null,
    };
  });

  // Earnings per day this week, from paid consultations.
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(new Date(`${monday}T00:00:00Z`).getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { day, label: weekdayFmt.format(new Date(`${day}T00:00:00Z`)), kes: 0, count: 0 };
  });
  for (const c of consultations) {
    const entry = week.find((w) => w.day === nairobiDay(new Date(c.slot.starts_at)));
    if (entry) {
      entry.kes += c.amount_kes;
      entry.count += 1;
    }
  }

  const upcoming = consultations.filter((c) => c.callWindow !== "ended");
  const next = upcoming[0] ?? null;
  const needPrescription = consultations.filter((c) => c.callWindow === "ended" && !c.prescription);

  // The patient figure's messages: what needs the doctor now, then tips.
  const messages: CompanionMessage[] = [];
  if (status !== "verified") {
    messages.push({ text: "Your registration is still being reviewed. Patients will be able to book you once an admin verifies you." });
  }
  if (next) {
    messages.push({
      text: `Your next patient, ${next.patient?.profile.full_name ?? "a patient"}, is booked ${relative(next.slot.starts_at, now)}.`,
      href: next.callWindow === "open" ? `/consultation/${next.id}` : "/doctor/consultations",
      cta: next.callWindow === "open" ? "Join call" : "See consultations",
    });
  } else {
    messages.push({ text: "No consultations booked yet. Patients book the free slots you publish.", href: "/doctor/slots", cta: "Add availability" });
  }
  if (pendingChats > 0) {
    messages.push({ text: `${pendingChats} past patient${pendingChats === 1 ? " is" : "s are"} waiting for your answer to a follow-up chat.`, href: "/chat", cta: "Open chats" });
  }
  if (needPrescription.length > 0) {
    messages.push({
      text: `You haven't written a prescription for ${needPrescription[0].patient?.profile.full_name ?? "a recent patient"} yet.`,
      href: `/doctor/consultations/${needPrescription[0].id}/prescription`,
      cta: "Write prescription",
    });
  }
  if (!upcomingSlots) {
    messages.push({ text: "You have no free slots coming up. Add some so new patients can find you.", href: "/doctor/slots", cta: "Add slots" });
  }
  for (const tip of DOCTOR_TIPS) messages.push({ text: `Tip: ${tip}` });

  return {
    messages,
    todaySlots,
    dayStart: dayStart.toISOString(),
    week,
    next: next
      ? {
          id: next.id,
          patientName: next.patient?.profile.full_name ?? "Patient",
          startsAt: next.slot.starts_at,
          endsAt: next.slot.ends_at,
        }
      : null,
  };
}
