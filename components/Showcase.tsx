"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import patientCall from "@/public/images/patient-call.jpg";
import doctorCall from "@/public/images/doctor-call.jpg";
import payment from "@/public/images/payment.jpg";
import patientWave from "@/public/images/patient-wave.jpg";

type Slide = {
  src: StaticImageData;
  alt: string;
  position: string; // which part of the photo stays visible when it's cropped
  eyebrow: string;
  title: string;
  text: string;
  showPinPrompt?: boolean;
};

const SLIDES: Slide[] = [
  {
    src: patientCall,
    alt: "A woman smiling during a video call on her phone at home",
    position: "50% 45%",
    eyebrow: "Video consultations",
    title: "See a doctor without leaving home",
    text: "Meet your doctor on a video call from your phone. No matatu, no queue, no waiting room.",
  },
  {
    src: doctorCall,
    alt: "A smiling doctor with a stethoscope waving on a video call",
    position: "50% 30%",
    eyebrow: "Verified doctors",
    title: "Real doctors, checked by our team",
    text: "Every doctor uploads their KMPDC registration, and we review it before they can take a single booking.",
  },
  {
    src: payment,
    alt: "A woman smiling and pointing at her phone",
    position: "50% 30%",
    eyebrow: "M-Pesa payments",
    title: "Pay with M-Pesa in seconds",
    text: "Confirm the prompt on your phone with your PIN. Your booking is confirmed as soon as the payment goes through. No cards needed.",
    showPinPrompt: true,
  },
  {
    src: patientWave,
    alt: "A young woman waving at her phone during a video call",
    position: "50% 15%",
    eyebrow: "Follow-ups",
    title: "Questions after your visit?",
    text: "Send your doctor a follow-up message. If they accept, you can chat for free for the next three hours.",
  },
];

const INTERVAL_MS = 5000;

// Browsers may break a line after the hyphen in "M-Pesa". This keeps it on one line.
function keepMPesaTogether(text: string) {
  const [before, after] = text.split("M-Pesa");
  if (after === undefined) return text;
  return (
    <>
      {before}
      <span className="nowrap">M-Pesa</span>
      {after}
    </>
  );
}

// Reads the "reduce motion" setting from the user's device, and keeps it in sync if it changes.
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReduceMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCE_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export default function Showcase() {
  const [index, setIndex] = useState(0);
  // null = the user hasn't pressed pause/play, so follow their device's motion setting.
  const [paused, setPaused] = useState<boolean | null>(null);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    () => window.matchMedia(REDUCE_MOTION).matches,
    () => false,
  );
  const playing = paused === null ? !reduceMotion : !paused;
  const count = SLIDES.length;

  // Move to the next slide after 5 seconds. Because `index` is a dependency,
  // any click that changes the slide restarts the countdown too.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [playing, index, count]);

  return (
    <section className="showcase" role="region" aria-roledescription="carousel" aria-label="How AfyaLink works for you">
      <div className="show-photo">
        {SLIDES.map((s, i) => (
          <div key={s.title} className="slide" data-active={i === index} aria-hidden={i !== index}>
            <Image
              src={s.src}
              alt={s.alt}
              fill
              sizes="(max-width: 900px) 100vw, 600px"
              placeholder="blur"
              style={{ objectPosition: s.position }}
            />
            {s.showPinPrompt && (
              // Our own drawing of the STK Push prompt, not Safaricom's branding.
              <div className="pin-prompt" aria-hidden="true">
                <small>M-PESA</small>
                <b>Pay KES 1,500 to AfyaLink?</b>
                <span>Enter PIN ••••</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="show-text">
        {/* All slides' words sit in the same grid cell, so the box keeps the height of the longest one. */}
        <div className="show-words" aria-live={playing ? "off" : "polite"}>
          {SLIDES.map((s, i) => (
            <div key={s.title} className="slide-words" data-active={i === index} aria-hidden={i !== index}>
              <div className="eyebrow">
                {String(i + 1).padStart(2, "0")} / {String(count).padStart(2, "0")} · {s.eyebrow}
              </div>
              <h2>{keepMPesaTogether(s.title)}</h2>
              <p>{s.text}</p>
            </div>
          ))}
        </div>

        <div className="show-controls">
          <button type="button" className="arrow" aria-label="Previous slide" onClick={() => setIndex((index - 1 + count) % count)}>
            ←
          </button>
          <div className="dots">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className="dot"
                aria-label={`Show slide ${i + 1}: ${s.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button type="button" className="arrow" aria-label="Next slide" onClick={() => setIndex((index + 1) % count)}>
            →
          </button>
          <button
            type="button"
            className="arrow toggle"
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            onClick={() => setPaused(playing)}
          >
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
      </div>
    </section>
  );
}
