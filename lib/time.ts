// All times are shown in Kenyan time (EAT, UTC+3, no daylight saving),
// whatever time zone the server or browser is in.
export const TIME_ZONE = "Africa/Nairobi";
export const NAIROBI_OFFSET = "+03:00";

// Consultation lengths a doctor can choose, in minutes.
export const SLOT_LENGTHS = [30, 45, 60, 90, 120];

const dayFormat = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });

// "Mon, 14 Oct · 10:00–10:30"
export function formatSlot(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  return `${dayFormat.format(start)} · ${timeFormat.format(start)}–${timeFormat.format(new Date(endsAt))}`;
}

export function formatDate(iso: string) {
  return dayFormat.format(new Date(iso));
}

// "10:00"
export function formatClock(iso: string) {
  return timeFormat.format(new Date(iso));
}

// Slots grouped by day ("Mon, 14 Oct"), keeping their order. Shorter to
// scroll through on a phone than one row per slot.
export function groupByDay<T extends { starts_at: string }>(items: T[]) {
  const days: { day: string; items: T[] }[] = [];
  for (const item of items) {
    const day = formatDate(item.starts_at);
    if (days.at(-1)?.day === day) days.at(-1)!.items.push(item);
    else days.push({ day, items: [item] });
  }
  return days;
}

// "Mon, 14 Oct 10:05"
export function formatTime(iso: string) {
  const date = new Date(iso);
  return `${dayFormat.format(date)} ${timeFormat.format(date)}`;
}

// Today's date in Nairobi as YYYY-MM-DD (the format <input type="date"> uses).
export function nairobiToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

// Price of one slot. Mirrors the calculation in the hold_slot() database
// function, which is the one that actually charges the patient.
export function slotPrice(feeType: "per_session" | "per_hour", feeKes: number, minutes: number) {
  return feeType === "per_session" ? feeKes : Math.ceil((feeKes * minutes) / 60);
}

// Age in whole years from a date of birth (YYYY-MM-DD), on today's date in Nairobi.
export function ageInYears(dateOfBirth: string) {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const [ty, tm, td] = nairobiToday().split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

export function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
