"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { FigureVariant } from "./Figure3D";

// Three.js is large, so the 3D figure is loaded separately, after the rest of
// the dashboard, and only in the browser.
const Figure3D = dynamic(() => import("./Figure3D"), {
  ssr: false,
  loading: () => <div className="figure-fallback figure-loading" aria-hidden="true" />,
});

export type CompanionMessage = { text: string; href?: string; cta?: string };

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
  messages,
}: {
  variant: FigureVariant;
  name: string;
  messages: CompanionMessage[];
}) {
  const [index, setIndex] = useState(0);
  const [waveKey, setWaveKey] = useState(0);
  const calm = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE_MOTION).matches, () => false);
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
