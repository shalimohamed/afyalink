import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanionMessage } from "@/components/companion/Companion";
import { loadPatientBookings } from "@/lib/bookings";
import { loadChats } from "@/lib/chats";
import { TIME_ZONE } from "@/lib/time";

// Health tips. Daktari shows only TIPS_AT_ONCE of them, and a different set
// every TIP_INTERVAL_HOURS, so returning patients see something new.
const HEALTH_TIPS = [
  "Aim for about 8 glasses of water a day, and more when it's hot or you're unwell.",
  "Sleeping under a treated mosquito net is one of the best ways to prevent malaria.",
  "Wash your hands with soap for 20 seconds, especially before eating and after the toilet.",
  "With diarrhoea, sip ORS (oral rehydration salts). See a doctor if it lasts more than 2 days or there's blood.",
  "Feeling stressed? A 10-minute walk and talking to someone you trust both really help.",
  "Chest pain, trouble breathing or heavy bleeding? Don't wait for an appointment. Call 999 or 112.",
  "Finish the full course of antibiotics your doctor prescribes, even if you feel better sooner.",
  "Adults need 7 to 9 hours of sleep. A regular bedtime makes a big difference.",
  "Eat a rainbow: sukuma wiki, carrots, tomatoes and fruit give you vitamins your body needs.",
  "Boil or treat drinking water when you're not sure it's clean, especially in the rainy season.",
  "Get your blood pressure checked at least once a year. High blood pressure often has no symptoms.",
  "30 minutes of brisk walking most days lowers your risk of diabetes and heart disease.",
  "Cut down on added salt and sugar. Check the labels on packaged foods and drinks.",
  "Wear sunscreen or a hat in strong sun. Skin can burn even on cloudy days.",
  "Keep your vaccinations up to date, and make sure children's clinic cards are complete.",
  "Brush your teeth twice a day with fluoride toothpaste and see a dentist once a year.",
  "Take breaks from your phone screen: every 20 minutes, look at something far away for 20 seconds.",
  "Smoking and shisha harm your lungs and heart. Free help to quit is available. Ask your doctor.",
];
const TIPS_AT_ONCE = 3;
const TIP_INTERVAL_HOURS = 3;

// "skipped": a step this round didn't need (no symptom check before booking,
// or no prescription issued). It counts as finished.
export type JourneyState = "done" | "skipped" | "todo";
export type JourneyStep = { key: string; label: string; state: JourneyState; href: string };
export type Journey = { steps: JourneyStep[]; complete: boolean; visible: boolean };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const timeFmt = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, weekday: "long" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" });

// "Habari za asubuhi" (morning), "za mchana" (afternoon), "za jioni" (evening).
function swahiliGreeting(now: number) {
  const hour = Number(hourFmt.format(new Date(now)));
  if (hour < 12) return "Habari za asubuhi";
  if (hour < 16) return "Habari za mchana";
  return "Habari za jioni";
}

// "in 45 minutes", "today at 14:00", "tomorrow at 09:00", "on Monday, 14 Oct at 11:00"
function relativeTime(iso: string, now: number) {
  const date = new Date(iso);
  const minutes = Math.round((date.getTime() - now) / MINUTE);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
  if (day(date) === day(new Date(now))) return `today at ${timeFmt.format(date)}`;
  if (day(date) === day(new Date(now + DAY))) return `tomorrow at ${timeFmt.format(date)}`;
  return `on ${dayFmt.format(date)} at ${timeFmt.format(date)}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type RxRow = { booking_id: string; created_at: string; downloaded_at: string | null };
type CheckRow = {
  id: string;
  created_at: string;
  symptoms: string;
  urgency: "routine" | "within_24_hours" | "emergency";
  red_flag_triggered: boolean;
  specialties: { label: string } | null;
};

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

const nairobiDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);

// The care journey follows ONE round of care at a time. A round starts with a
// new symptom check or a new booking, and is complete once the consultation
// has happened and the patient has rated it. A completed round stays on the
// dashboard until midnight that day, then hides until a new round starts.
function buildJourney(
  bookings: Awaited<ReturnType<typeof loadPatientBookings>>, // newest first
  latestCheck: { created_at: string } | null,
  prescribed: Set<string>, // booking ids with a prescription
  reviewedAt: Map<string, string>, // booking id → when it was rated
  now: number,
): Journey {
  const active = bookings.filter((b) => b.status !== "cancelled");
  const latest = active[0] ?? null;
  // A symptom check newer than the latest booking starts a new round.
  const booking = latestCheck && (!latest || latestCheck.created_at > latest.created_at) ? null : latest;
  // That check belongs to this booking's round unless a paid booking came between them.
  const checkInRound = Boolean(
    latestCheck &&
      (!booking ||
        (latestCheck.created_at <= booking.created_at &&
          !active.some((b) => b.id !== booking.id && b.status === "confirmed" && b.created_at > latestCheck.created_at && b.created_at < booking.created_at))),
  );

  const reviewed = booking ? reviewedAt.get(booking.id) : undefined;
  const consulted = booking?.state === "past";
  const bookingPage = booking ? `/patient/bookings/${booking.id}` : "/patient/bookings";
  const steps: JourneyStep[] = [
    { key: "check", label: "Check symptoms", state: checkInRound ? "done" : booking ? "skipped" : "todo", href: "/patient/check" },
    { key: "book", label: "Book a doctor", state: booking ? "done" : "todo", href: "/patient/doctors" },
    { key: "pay", label: "Pay with M-Pesa", state: booking?.status === "confirmed" ? "done" : "todo", href: bookingPage },
    { key: "consult", label: "Video consultation", state: consulted ? "done" : "todo", href: bookingPage },
    { key: "rx", label: "Get prescription", state: booking && prescribed.has(booking.id) ? "done" : reviewed ? "skipped" : "todo", href: bookingPage },
    { key: "review", label: "Rate your doctor", state: reviewed ? "done" : "todo", href: bookingPage },
  ];

  const complete = Boolean(consulted && reviewed);
  const visible = !complete || nairobiDay(new Date(reviewed!)) === nairobiDay(new Date(now));
  return { steps, complete, visible };
}

export async function loadPatientDashboard(
  supabase: SupabaseClient,
  user: { id: string; firstName: string; phone: string | null },
) {
  const now = Date.now();
  const [bookings, chats, checks, { data: prescriptions }, { data: reviews }, { data: details }] = await Promise.all([
    loadPatientBookings(supabase),
    loadChats(supabase, user.id),
    supabase
      .from("symptom_checks")
      .select("id, created_at, symptoms, urgency, red_flag_triggered, specialties(label)")
      .order("created_at", { ascending: false })
      .limit(1),
    loadPrescriptions(supabase),
    supabase.from("reviews").select("booking_id, created_at"),
    supabase.from("patients").select("date_of_birth").eq("id", user.id).maybeSingle<{ date_of_birth: string | null }>(),
  ]);

  const doctorOf = (b: (typeof bookings)[number]) => (b.slot.doctor ? `Dr. ${b.slot.doctor.profile.full_name}` : "your doctor");
  const upcoming = bookings
    .filter((b) => b.state === "upcoming")
    .sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
  const past = bookings.filter((b) => b.state === "past");
  const reviewed = new Set((reviews ?? []).map((r) => r.booking_id));
  const next = upcoming[0] ?? null;
  const latestCheck = ((checks.data ?? []) as unknown as CheckRow[])[0] ?? null;

  // The patient's progress through their current round of care.
  const journey = buildJourney(
    bookings,
    latestCheck,
    new Set((prescriptions ?? []).map((p) => p.booking_id)),
    new Map((reviews ?? []).map((r) => [r.booking_id as string, r.created_at as string])),
    now,
  );

  // Daktari's messages: what matters right now first, then tips.
  const messages: CompanionMessage[] = [];
  const hello = `${swahiliGreeting(now)}, ${user.firstName}!`;

  // 1. Greeting, with the next consultation or a nudge to get started.
  if (next) {
    messages.push({
      text: `${hello} I'm Daktari. Your video consultation with ${doctorOf(next)} is ${relativeTime(next.slot.starts_at, now)}.`,
      href: `/patient/bookings/${next.id}`,
      cta: "View booking",
    });
  } else {
    messages.push({
      text: `${hello} I'm Daktari, your AfyaLink guide. Not feeling well? Tap where it hurts on the body map, or describe your symptoms.`,
      href: "/patient/check",
      cta: "Check symptoms",
    });
  }

  // 2. The video call is open, or about to open (it opens 15 minutes early).
  if (next) {
    const start = new Date(next.slot.starts_at).getTime();
    const end = new Date(next.slot.ends_at).getTime();
    if (now >= start - 15 * MINUTE && now <= end + 30 * MINUTE) {
      messages.push({ text: `Your video call with ${doctorOf(next)} is open now. Join whenever you're ready.`, href: `/consultation/${next.id}`, cta: "Join call" });
    } else if (start - now <= HOUR) {
      const opensIn = Math.max(1, Math.round((start - 15 * MINUTE - now) / MINUTE));
      messages.push({
        text: `Your call with ${doctorOf(next)} opens in ${plural(opensIn, "minute")}. Find a quiet spot and check your camera and microphone.`,
        href: `/patient/bookings/${next.id}`,
        cta: "View booking",
      });
    }
  }

  // 3. A slot held for payment: time left, or a failed payment to retry.
  const held = bookings.find((b) => b.state === "held");
  if (held) {
    const minutesLeft = Math.max(1, Math.ceil((new Date(held.holdExpiresAt).getTime() - now) / MINUTE));
    const payment = held.latestPayment;
    messages.push({
      text:
        payment?.status === "failed"
          ? `Your M-Pesa payment for ${doctorOf(held)} didn't go through. You still have ${plural(minutesLeft, "minute")} to try again.`
          : payment?.status === "pending"
            ? `Check your phone: M-Pesa is waiting for your PIN to pay ${doctorOf(held)}.`
            : `You have ${plural(minutesLeft, "minute")} left to pay for your slot with ${doctorOf(held)}.`,
      href: `/patient/bookings/${held.id}`,
      cta: payment?.status === "pending" ? "View payment" : "Pay now",
    });
  }

  // 4. Chats: closing soon, something new, or declined.
  for (const chat of chats) {
    const doctor = `Dr. ${chat.doctor?.profile.full_name ?? ""}`.trim();
    if (chat.state === "open" && chat.closesAt) {
      const minutesLeft = Math.round((new Date(chat.closesAt).getTime() - now) / MINUTE);
      const until = timeFmt.format(new Date(chat.closesAt));
      if (minutesLeft <= 30) {
        messages.push({ text: `Your chat with ${doctor} closes in ${plural(Math.max(1, minutesLeft), "minute")}. Ask anything you still need now.`, href: `/chat/${chat.id}`, cta: "Open chat" });
      } else if (chat.needsAttention) {
        messages.push({
          text: chat.unread ? `${doctor} sent you a message. Your chat is open until ${until}.` : `${doctor} accepted your chat. It's open until ${until}.`,
          href: `/chat/${chat.id}`,
          cta: "Open chat",
        });
      }
    } else if (chat.state === "rejected" && chat.needsAttention && chat.responded_at && now - new Date(chat.responded_at).getTime() < 7 * DAY) {
      messages.push({ text: `${doctor} can't take a follow-up chat right now. A short video consultation is the best way to talk.`, href: `/patient/doctors/${chat.doctor_id}`, cta: "Book" });
    }
  }

  // 5. A prescription not downloaded yet.
  const newRx = (prescriptions ?? []).find((p) => !p.downloaded_at);
  const rxBooking = newRx ? bookings.find((b) => b.id === newRx.booking_id) : undefined;
  if (rxBooking) {
    messages.push({ text: `Your prescription from ${doctorOf(rxBooking)} is ready to download.`, href: `/patient/bookings/${rxBooking.id}`, cta: "See prescription" });
  }

  // 6. A finished consultation not rated yet.
  const toReview = past.find((b) => !reviewed.has(b.id));
  if (toReview) {
    messages.push({ text: `How was your consultation with ${doctorOf(toReview)}? Your rating helps other patients.`, href: `/patient/bookings/${toReview.id}`, cta: "Rate it" });
  }

  // 7. Check in 2–7 days after a consultation, unless they've already asked the
  //    doctor a follow-up question since then.
  const recentVisit = past.find((b) => {
    const since = now - new Date(b.slot.ends_at).getTime();
    const askedSince = chats.some((c) => c.doctor_id === b.slot.doctor_id && c.created_at > b.slot.ends_at);
    return since >= 2 * DAY && since <= 7 * DAY && !askedSince;
  });
  if (recentVisit) {
    messages.push({
      text: `How are you feeling since your visit with ${doctorOf(recentVisit)} on ${weekdayFmt.format(new Date(recentVisit.slot.starts_at))}? You can send them a free follow-up question.`,
      href: `/patient/bookings/${recentVisit.id}`,
      cta: "Ask a question",
    });
  }

  // 8. Follow up on the latest symptom check.
  if (latestCheck) {
    const age = now - new Date(latestCheck.created_at).getTime();
    const emergency = latestCheck.red_flag_triggered || latestCheck.urgency === "emergency";
    const bookedSince = bookings.some((b) => b.created_at > latestCheck.created_at);
    if (emergency && age < 7 * DAY) {
      messages.push({ text: "We hope you got help at the hospital. When you're feeling better, a follow-up video consultation can help with your recovery.", href: "/patient/doctors", cta: "Find a doctor" });
    } else if (!emergency && !bookedSince && age < 3 * DAY) {
      const snippet = latestCheck.symptoms.length > 50 ? `${latestCheck.symptoms.slice(0, 50)}…` : latestCheck.symptoms;
      const when = age < DAY ? "Earlier today" : `On ${weekdayFmt.format(new Date(latestCheck.created_at))}`;
      messages.push({
        text: `${when} you checked “${snippet}”. Still unwell? ${latestCheck.specialties ? `A ${latestCheck.specialties.label.toLowerCase()}` : "A doctor"} can see you by video.`,
        href: `/patient/check/${latestCheck.id}`,
        cta: "See doctors",
      });
    }
  }

  // 9. Missing details (common after signing up with Google).
  const missing = [!user.phone && "M-Pesa number", !details?.date_of_birth && "date of birth"].filter(Boolean);
  if (missing.length) {
    messages.push({ text: `Add your ${missing.join(" and ")} so payments and prescriptions go smoothly.`, href: "/patient/history", cta: "Add details" });
  }

  // 10. Three health tips, a different three every few hours.
  const setCount = Math.ceil(HEALTH_TIPS.length / TIPS_AT_ONCE);
  const set = Math.floor(now / (TIP_INTERVAL_HOURS * HOUR)) % setCount;
  for (const tip of HEALTH_TIPS.slice(set * TIPS_AT_ONCE, set * TIPS_AT_ONCE + TIPS_AT_ONCE)) {
    messages.push({ text: `Health tip: ${tip}`, kind: "tip" });
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
