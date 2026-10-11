"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TimelineSlot } from "@/lib/doctorDashboard";

const HOUR = 60 * 60 * 1000;
const timeFmt = new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false });

const STATE_LABEL = { free: "Free", paying: "Patient paying", booked: "Booked" };

const initials = (name: string | null) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// The doctor's day: today's slots on a timeline (07:00–21:00 Kenyan time, or
// wider if slots fall outside), with a "now" line that moves every 30 seconds.
// Booked slots link to the consultation.
export default function DayTimeline({ dayStart, slots }: { dayStart: string; slots: TimelineSlot[] }) {
  const base = new Date(dayStart).getTime(); // midnight in Nairobi
  const firstHour = Math.min(7, ...slots.map((s) => Math.floor((new Date(s.startsAt).getTime() - base) / HOUR)));
  const lastHour = Math.max(21, ...slots.map((s) => Math.ceil((new Date(s.endsAt).getTime() - base) / HOUR)));
  const from = base + firstHour * HOUR;
  const span = (lastHour - firstHour) * HOUR;
  const pct = (t: number) => ((t - from) / span) * 100;

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 30_000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, []);

  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i).filter((h) => h % 2 === firstHour % 2);
  const booked = slots.filter((s) => s.state === "booked").length;

  return (
    <section className="timeline-card" aria-label="Today's schedule">
      <div className="journey-head">
        <b>Today</b>
        <span>
          {slots.length === 0
            ? "No slots today"
            : `${booked} booked · ${slots.length - booked} free or being paid for`}
        </span>
      </div>
      <div className="day-scroll">
        <div className="day-track">
          {hours.map((h) => (
            <span key={h} className="day-hour" style={{ left: `${pct(base + h * HOUR)}%` }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
          {slots.map((s) => {
            const start = new Date(s.startsAt).getTime();
            const end = new Date(s.endsAt).getTime();
            const label = `${timeFmt.format(start)}–${timeFmt.format(end)} · ${s.patientName ?? STATE_LABEL[s.state]}`;
            const style = { left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` };
            return s.bookingId ? (
              <Link key={s.id} href={`/consultation/${s.bookingId}`} className={`day-slot ${s.state}`} style={style} title={label} aria-label={label}>
                {/* Initials fit even a short slot; the full name is in the tooltip and label. */}
                <span>{initials(s.patientName) || "✓"}</span>
              </Link>
            ) : (
              <span key={s.id} className={`day-slot ${s.state}`} style={style} title={label} aria-label={label} role="img">
                <span>{s.state === "paying" ? "…" : ""}</span>
              </span>
            );
          })}
          {now !== null && now >= from && now <= from + span && (
            <span className="day-now" style={{ left: `${pct(now)}%` }}>
              <i>{timeFmt.format(now)}</i>
            </span>
          )}
        </div>
      </div>
      <div className="day-legend" aria-hidden="true">
        <span><i className="day-key booked" /> Booked</span>
        <span><i className="day-key paying" /> Patient paying</span>
        <span><i className="day-key free" /> Free</span>
      </div>
      {slots.length === 0 && (
        <p className="empty">
          <Link href="/doctor/slots">Add availability</Link> so patients can book you today.
        </p>
      )}
    </section>
  );
}
