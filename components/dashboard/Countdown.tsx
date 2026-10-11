"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const OPENS_BEFORE_MS = 15 * 60 * 1000; // same as the video call rules
const CLOSES_AFTER_MS = 30 * 60 * 1000;

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

// A live countdown to a consultation. It shows days/hours/minutes/seconds,
// then a "Join video call" button once the call is open.
export default function Countdown({
  title,
  who,
  detail,
  startsAt,
  endsAt,
  joinHref,
  viewHref,
}: {
  title: string;
  who: string;
  detail: string;
  startsAt: string;
  endsAt: string;
  joinHref: string;
  viewHref: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, []);

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const open = now !== null && now >= start - OPENS_BEFORE_MS && now <= end + CLOSES_AFTER_MS;
  const live = now !== null && now >= start && now <= end;
  const left = parts(now === null ? 0 : start - now);

  return (
    <div className={`countdown ${open ? "is-open" : ""}`}>
      <small className="label">{title}</small>
      <b className="countdown-who">{who}</b>
      <span className="countdown-detail">{detail}</span>
      {now === null ? (
        <div className="countdown-digits" aria-hidden="true" />
      ) : live ? (
        <p className="countdown-live">
          <span className="live-dot" aria-hidden="true" /> Happening now
        </p>
      ) : start > now ? (
        <div className="countdown-digits" role="timer" aria-label={`Starts in ${left.d} days ${left.h} hours ${left.m} minutes`}>
          {left.d > 0 && (
            <span>
              <b>{left.d}</b>days
            </span>
          )}
          <span>
            <b>{String(left.h).padStart(2, "0")}</b>hrs
          </span>
          <span>
            <b>{String(left.m).padStart(2, "0")}</b>min
          </span>
          <span>
            <b>{String(left.s).padStart(2, "0")}</b>sec
          </span>
        </div>
      ) : (
        <p className="countdown-live">The consultation time has passed.</p>
      )}
      <div className="speech-actions">
        {open ? (
          <Link href={joinHref} className="btn btn-primary">
            Join video call
          </Link>
        ) : (
          <Link href={viewHref} className="btn btn-ghost">
            View details
          </Link>
        )}
      </div>
    </div>
  );
}
