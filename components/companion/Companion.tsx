"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { nairobiToday } from "@/lib/time";
import { parseWellness, readWellness, subscribeWellness } from "@/lib/wellnessStore";
import type { FigureVariant } from "./Figure3D";

// Three.js is large, so the 3D figure is loaded separately, after the rest of
// the dashboard, and only in the browser.
const Figure3D = dynamic(() => import("./Figure3D"), {
  ssr: false,
  loading: () => <div className="figure-fallback figure-loading" aria-hidden="true" />,
});

export type CompanionMessage = { text: string; href?: string; cta?: string; kind?: "tip" };

// Reminders from the daily check-in, which is stored only in this browser.
function wellnessMessages(raw: string | null): CompanionMessage[] {
  const today = nairobiToday();
  const w = parseWellness(raw, today);
  const list: CompanionMessage[] = [];
  if (w.yesterdayMood !== null && w.yesterdayMood !== undefined && w.yesterdayMood <= 1) {
    list.push({
      text: "Yesterday you were feeling low. How are you today? Talking to a counsellor can really help.",
      href: "/patient/doctors?specialty=psychology",
      cta: "Find a counsellor",
    });
  }
  if (w.mood === null) {
    list.push({ text: "You haven't done today's check-in yet. How are you feeling? It takes 5 seconds.", href: "#checkin", cta: "Check in" });
  } else if (w.streak >= 3) {
    list.push({ text: `🔥 ${w.streak}-day check-in streak! Keep it going.` });
  }
  return list;
}

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// A 3D character with a speech bubble. Tapping it (or "Next") waves and shows
// the next message: first the important ones (e.g. your next consultation),
// then tips.
export default function Companion({
  variant,
  name,
  messages: serverMessages,
  wellness = false,
}: {
  variant: FigureVariant;
  name: string;
  messages: CompanionMessage[];
  wellness?: boolean; // add the daily check-in reminders (patient dashboard)
}) {
  const [index, setIndex] = useState(0);
  const [waveKey, setWaveKey] = useState(0);
  const calm = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE_MOTION).matches, () => false);
  const wellnessRaw = useSyncExternalStore(subscribeWellness, readWellness, () => null);

  // Check-in reminders go just before the health tips.
  const messages = useMemo(() => {
    if (!wellness) return serverMessages;
    const extra = wellnessMessages(wellnessRaw);
    const firstTip = serverMessages.findIndex((m) => m.kind === "tip");
    const at = firstTip === -1 ? serverMessages.length : firstTip;
    return [...serverMessages.slice(0, at), ...extra, ...serverMessages.slice(at)];
  }, [serverMessages, wellness, wellnessRaw]);
  const message = messages[index % messages.length];

  const next = () => {
    setIndex((i) => i + 1);
    setWaveKey((k) => k + 1);
  };

  return (
    <div className="companion">
      <button type="button" className="figure-stage" onClick={next} aria-label={`Tap ${name} for the next message`}>
        <Figure3D variant={variant} waveKey={waveKey} calm={calm} />
      </button>
      <div className="speech" aria-live="polite">
        <small className="label">{name}</small>
        <p key={index}>{message.text}</p>
        <div className="speech-actions">
          {message.href && (
            <Link href={message.href} className="btn btn-primary">
              {message.cta ?? "Open"}
            </Link>
          )}
          {messages.length > 1 && (
            <button type="button" className="btn btn-ghost" onClick={next}>
              Next {index % messages.length + 1}/{messages.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
