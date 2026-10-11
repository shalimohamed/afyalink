import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanionMessage } from "@/components/companion/Companion";
import { loadPatientBookings } from "@/lib/bookings";
import { loadChats } from "@/lib/chats";
import { TIME_ZONE } from "@/lib/time";

const HEALTH_TIPS = [
  "Aim for about 8 glasses of water a day, and more when it's hot or you're unwell.",
  "Sleeping under a treated mosquito net is one of the best ways to prevent malaria.",
  "Wash your hands with soap for 20 seconds, especially before eating and after the toilet.",
  "With diarrhoea, sip ORS (oral rehydration salts). See a doctor if it lasts more than 2 days or there's blood.",
  "Feeling stressed? A 10-minute walk and talking to someone you trust both really help.",
  "Chest pain, trouble breathing or heavy bleeding? Don't wait for an appointment. Call 999 or 112.",
];

export type JourneyStep = { key: string; label: string; done: boolean; href: string };

const timeFmt = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "short" });

// "in 45 minutes", "today at 14:00", "tomorrow at 09:00", "on Monday, 14 Oct at 11:00"
function relativeTime(iso: string, now: number) {
  const date = new Date(iso);
  const minutes = Math.round((date.getTime() - now) / 60000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
  const today = day(new Date(now));
  const tomorrow = day(new Date(now + 86400000));
  if (day(date) === today) return `today at ${timeFmt.format(date)}`;
  if (day(date) === tomorrow) return `tomorrow at ${timeFmt.format(date)}`;
  return `on ${dayFmt.format(date)} at ${timeFmt.format(date)}`;
}

type RxRow = { booking_id: string; created_at: string; downloaded_at: string | null };

// The patient's prescriptions, newest first, with when each was downloaded.
// If migration 0005 (downloaded_at) hasn't been run yet, fall back to treating
// them as already downloaded, so the dashboard still works.
async function loadPrescriptions(supabase: SupabaseClient): Promise<{ data: RxRow[] }> {
  const withDownloads = await supabase
    .from("prescriptions")
    .select("booking_id, created_at, downloaded_at")
    .order("created_at", { ascending: false });
  if (!withDownloads.error) return { data: (withDownloads.data ?? []) as RxRow[] };

  const { data } = await supabase.from("prescriptions").select("booking_id, created_at").order("created_at", { ascending: false });
  return { data: ((data ?? []) as Omit<RxRow, "downloaded_at">[]).map((p) => ({ ...p, downloaded_at: p.created_at })) };
}

export async function loadPatientDashboard(supabase: SupabaseClient, firstName: string) {
  const now = Date.now();
  const [bookings, chats, { count: checkCount }, { data: prescriptions }, { data: reviews }] = await Promise.all([
    loadPatientBookings(supabase),
    loadChats(supabase),
    supabase.from("symptom_checks").select("id", { count: "exact", head: true }),
    loadPrescriptions(supabase),
    supabase.from("reviews").select("booking_id"),
  ]);

  const doctorOf = (b: (typeof bookings)[number]) => (b.slot.doctor ? `Dr. ${b.slot.doctor.profile.full_name}` : "your doctor");
  const upcoming = bookings
    .filter((b) => b.state === "upcoming")
    .sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
  const past = bookings.filter((b) => b.state === "past");
  const reviewed = new Set((reviews ?? []).map((r) => r.booking_id));
  const next = upcoming[0] ?? null;

  // The patient's progress through AfyaLink, in order.
  const journey: JourneyStep[] = [
    { key: "check", label: "Check symptoms", done: (checkCount ?? 0) > 0, href: "/patient/check" },
    { key: "book", label: "Book a doctor", done: bookings.length > 0, href: "/patient/doctors" },
    { key: "pay", label: "Pay with M-Pesa", done: bookings.some((b) => b.status === "confirmed"), href: "/patient/bookings" },
    { key: "consult", label: "Video consultation", done: past.length > 0, href: next ? `/patient/bookings/${next.id}` : "/patient/bookings" },
    { key: "rx", label: "Get prescription", done: (prescriptions ?? []).length > 0, href: "/patient/history" },
    { key: "review", label: "Rate your doctor", done: reviewed.size > 0, href: past[0] ? `/patient/bookings/${past[0].id}` : "/patient/bookings" },
  ];

  // Daktari's messages: what matters right now first, then tips.
  const messages: CompanionMessage[] = [];
  if (next) {
    messages.push({
      text: `Habari, ${firstName}! I'm Daktari. Your video consultation with ${doctorOf(next)} is ${relativeTime(next.slot.starts_at, now)}.`,
      href: `/patient/bookings/${next.id}`,
      cta: "View booking",
    });
  } else {
    messages.push({
      text: `Habari, ${firstName}! I'm Daktari, your AfyaLink guide. Not feeling well? Tap where it hurts on the body map, or describe your symptoms.`,
      href: "/patient/check",
      cta: "Check symptoms",
    });
  }
  // Only remind about a prescription the patient hasn't downloaded yet.
  const newRx = (prescriptions ?? []).find((p) => !p.downloaded_at);
  if (newRx) {
    const booking = bookings.find((b) => b.id === newRx.booking_id);
    if (booking) {
      messages.push({ text: `Your prescription from ${doctorOf(booking)} is ready to download.`, href: `/patient/bookings/${booking.id}`, cta: "See prescription" });
    }
  }
  const toReview = past.find((b) => !reviewed.has(b.id));
  if (toReview) {
    messages.push({ text: `How was your consultation with ${doctorOf(toReview)}? Your rating helps other patients.`, href: `/patient/bookings/${toReview.id}`, cta: "Rate it" });
  }
  const openChat = chats.find((c) => c.state === "open");
  if (openChat?.closesAt) {
    messages.push({
      text: `Dr. ${openChat.doctor?.profile.full_name} accepted your chat. It's open until ${timeFmt.format(new Date(openChat.closesAt))}.`,
      href: `/chat/${openChat.id}`,
      cta: "Open chat",
    });
  }
  // Start the tips at a different one each day.
  const dayNumber = Math.floor(now / 86400000);
  for (let i = 0; i < HEALTH_TIPS.length; i++) {
    messages.push({ text: `Health tip: ${HEALTH_TIPS[(dayNumber + i) % HEALTH_TIPS.length]}` });
  }

  return {
    messages,
    journey,
    next: next
      ? {
          id: next.id,
          doctorName: doctorOf(next),
          specialty: next.slot.doctor?.specialties.label ?? "",
          startsAt: next.slot.starts_at,
          endsAt: next.slot.ends_at,
        }
      : null,
  };
}
