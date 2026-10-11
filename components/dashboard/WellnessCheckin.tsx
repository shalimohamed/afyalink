"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { nairobiToday } from "@/lib/time";

// Daily mood + water check-in with a streak. Saved only in this browser
// (localStorage): nothing is sent to our servers, so it isn't medical data
// we have to protect. If storage is blocked (private mode), it still works
// for this visit.

type Wellness = { day: string; mood: number | null; water: number; streak: number; lastCheckIn: string | null };

const KEY = "afyalink-wellness";
const WATER_GOAL = 8;
const MOODS = [
  { emoji: "😞", label: "Very low" },
  { emoji: "😕", label: "Low" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😄", label: "Great" },
];

// A tiny store around localStorage that React can subscribe to.
let memoryCopy: string | null = null;
const listeners = new Set<() => void>();
function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memoryCopy;
  }
}
function write(value: Wellness) {
  memoryCopy = JSON.stringify(value);
  try {
    window.localStorage.setItem(KEY, memoryCopy);
  } catch {
    // storage blocked: keep the in-memory copy
  }
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function yesterdayOf(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Today's state; a new day starts with no mood and no water, keeping the streak.
function parse(raw: string | null, today: string): Wellness {
  let saved: Wellness | null = null;
  try {
    saved = raw ? (JSON.parse(raw) as Wellness) : null;
  } catch {
    saved = null;
  }
  if (!saved) return { day: today, mood: null, water: 0, streak: 0, lastCheckIn: null };
  if (saved.day === today) return saved;
  const streakAlive = saved.lastCheckIn === yesterdayOf(today) || saved.lastCheckIn === today;
  return { day: today, mood: null, water: 0, streak: streakAlive ? saved.streak : 0, lastCheckIn: saved.lastCheckIn };
}

export default function WellnessCheckin() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const today = nairobiToday();
  const state = parse(raw, today);
  const [celebrate, setCelebrate] = useState(0);

  const setMood = (mood: number) => {
    const firstCheckInToday = state.lastCheckIn !== today;
    write({ ...state, mood, streak: firstCheckInToday ? state.streak + 1 : state.streak, lastCheckIn: today });
  };
  const setWater = (glasses: number) => {
    const water = glasses === state.water ? glasses - 1 : glasses; // tapping the last full glass empties it
    write({ ...state, water });
    if (water === WATER_GOAL && state.water < WATER_GOAL) setCelebrate((c) => c + 1);
  };

  const mood = state.mood === null ? null : MOODS[state.mood];

  return (
    <section className="wellness" aria-label="Daily wellness check-in">
      <div className="journey-head">
        <b>Daily check-in</b>
        <span className="streak" title="Days in a row you've checked in">
          🔥 {state.streak}-day streak
        </span>
      </div>

      <div className="wellness-block">
        <span className="wellness-q">How are you feeling today?</span>
        <div className="moods" role="radiogroup" aria-label="Mood">
          {MOODS.map((m, i) => (
            <button
              key={m.label}
              type="button"
              role="radio"
              aria-checked={state.mood === i}
              aria-label={m.label}
              title={m.label}
              className="mood"
              onClick={() => setMood(i)}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        {mood && state.mood !== null && (
          <p className="wellness-note">
            {state.mood <= 1 ? (
              <>
                Sorry you&apos;re feeling {mood.label.toLowerCase()}. Talking helps.{" "}
                <Link href="/patient/doctors?specialty=psychology">Our counselling psychologists</Link> are a tap away.
              </>
            ) : state.mood === 2 ? (
              "Thanks for checking in. Small things like a walk or a good night's sleep can lift your day."
            ) : (
              "Glad to hear it! Keep it up. 💚"
            )}
          </p>
        )}
      </div>

      <div className="wellness-block">
        <span className="wellness-q">
          Water today: {state.water}/{WATER_GOAL} glasses
        </span>
        <div className="glasses" role="group" aria-label="Glasses of water">
          {Array.from({ length: WATER_GOAL }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`glass ${i < state.water ? "full" : ""}`}
              aria-label={`${i + 1} glass${i ? "es" : ""}`}
              aria-pressed={i < state.water}
              onClick={() => setWater(i + 1)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        {state.water >= WATER_GOAL && <p className="wellness-note">Hydration goal reached! 💧</p>}
      </div>

      {celebrate > 0 && (
        <div key={celebrate} className="confetti" aria-hidden="true" onAnimationEnd={() => setCelebrate(0)}>
          {Array.from({ length: 24 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      )}
    </section>
  );
}
