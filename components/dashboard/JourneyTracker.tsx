import Link from "next/link";
import type { JourneyStep } from "@/lib/patientDashboard";

// The patient's progress through AfyaLink: done steps are ticked, the next
// step to do pulses gently, and every step links to where it happens.
export default function JourneyTracker({ steps }: { steps: JourneyStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="journey" aria-label="Your AfyaLink journey">
      <div className="journey-head">
        <b>Your care journey</b>
        <span>
          {doneCount} of {steps.length} steps
        </span>
      </div>
      <div className="journey-bar" aria-hidden="true">
        <i style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="journey-steps">
        {steps.map((step, i) => {
          const state = step.done ? "done" : i === currentIndex ? "current" : "todo";
          return (
            <li key={step.key} className={state}>
              <Link href={step.href} aria-current={state === "current" ? "step" : undefined}>
                <span className="journey-dot" aria-hidden="true">
                  {step.done ? "✓" : i + 1}
                </span>
                <span>{step.label}</span>
                <span className="sr-only">{step.done ? " (done)" : state === "current" ? " (next step)" : ""}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
