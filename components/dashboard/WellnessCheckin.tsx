"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { nairobiToday } from "@/lib/time";
import { parseWellness, readWellness, subscribeWellness, writeWellness as write } from "@/lib/wellnessStore";

// Daily mood + water check-in with a streak. Saved only in this browser
// (see lib/wellnessStore.ts). If storage is blocked (private mode), it still
// works for this visit.

const WATER_GOAL = 8;
const MOODS = [
  { emoji: "😞", label: "Very low" },
  { emoji: "😕", label: "Low" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😄", label: "Great" },
];

export default function WellnessCheckin() {
  const raw = useSyncExternalStore(subscribeWellness, readWellness, () => null);
  const today = nairobiToday();
  const state = parseWellness(raw, today);
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
    <section className="wellness" id="checkin" aria-label="Daily wellness check-in">
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
