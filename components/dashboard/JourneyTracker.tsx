import Link from "next/link";
import type { Journey } from "@/lib/patientDashboard";

// The patient's progress through their current round of care: done steps are
// ticked, skipped steps get a dash, the next step to do pulses gently, and
// every step links to where it happens.
export default function JourneyTracker({ journey }: { journey: Journey }) {
  const { steps, complete } = journey;
  const finished = steps.filter((s) => s.state !== "todo").length;
  const currentIndex = steps.findIndex((s) => s.state === "todo");

  return (
    <section className={`journey ${complete ? "is-complete" : ""}`} aria-label="Your care journey">
      <div className="journey-head">
        <b>{complete ? "Journey complete 🎉" : "Your care journey"}</b>
        <span>{complete ? "Thanks for rating your doctor. Get well soon!" : `${finished} of ${steps.length} steps`}</span>
      </div>
      <div className="journey-bar" aria-hidden="true">
        <i style={{ width: `${(finished / steps.length) * 100}%` }} />
      </div>
      <ol className="journey-steps">
        {steps.map((step, i) => {
          const state = step.state === "todo" && i === currentIndex ? "current" : step.state;
          return (
            <li key={step.key} className={state}>
              <Link href={step.href} aria-current={state === "current" ? "step" : undefined}>
                <span className="journey-dot" aria-hidden="true">
                  {step.state === "done" ? "✓" : step.state === "skipped" ? "–" : i + 1}
                </span>
                <span>{step.label}</span>
                <span className="sr-only">
                  {step.state === "done" ? " (done)" : step.state === "skipped" ? " (not needed this time)" : state === "current" ? " (next step)" : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
