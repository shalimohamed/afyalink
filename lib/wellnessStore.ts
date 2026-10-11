// The daily wellness check-in, saved only in this browser (localStorage).
// Shared by the check-in card and Daktari's reminders. Nothing here is sent
// to our servers, so it isn't medical data we have to protect.

export type Wellness = {
  day: string; // YYYY-MM-DD (Kenyan date) this record is for
  mood: number | null; // 0 = very low … 4 = great
  water: number;
  streak: number;
  lastCheckIn: string | null;
  yesterdayMood?: number | null; // kept when a new day starts
};

const KEY = "afyalink-wellness";

let memoryCopy: string | null = null; // used if storage is blocked (private mode)
const listeners = new Set<() => void>();

export function readWellness(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memoryCopy;
  }
}

export function writeWellness(value: Wellness) {
  memoryCopy = JSON.stringify(value);
  try {
    window.localStorage.setItem(KEY, memoryCopy);
  } catch {
    // storage blocked: keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

export function subscribeWellness(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function yesterdayOf(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Today's state. A new day starts with no mood and no water, keeps the streak
// if they checked in yesterday, and remembers yesterday's mood.
export function parseWellness(raw: string | null, today: string): Wellness {
  let saved: Wellness | null = null;
  try {
    saved = raw ? (JSON.parse(raw) as Wellness) : null;
  } catch {
    saved = null;
  }
  if (!saved) return { day: today, mood: null, water: 0, streak: 0, lastCheckIn: null, yesterdayMood: null };
  if (saved.day === today) return saved;
  const wasYesterday = saved.day === yesterdayOf(today);
  const streakAlive = saved.lastCheckIn === yesterdayOf(today) || saved.lastCheckIn === today;
  return {
    day: today,
    mood: null,
    water: 0,
    streak: streakAlive ? saved.streak : 0,
    lastCheckIn: saved.lastCheckIn,
    yesterdayMood: wasYesterday ? saved.mood : null,
  };
}
