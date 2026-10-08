"use client";

import { useEffect, useState } from "react";

type Doctor = { initials: string; name: string; meta: string; fee: string };
type Example = {
  label: string;
  text: string;
  specialty: string;
  urgency: { label: string; tone: "routine" | "soon" | "emergency" };
  doctors: Doctor[] | null;
};

// Sample data for the landing page. Later this comes from the AI + database.
const EXAMPLES: Record<string, Example> = {
  rash: {
    label: "Skin rash",
    text: "Itchy red rash on both arms for 3 days",
    specialty: "Dermatology",
    urgency: { label: "Routine", tone: "routine" },
    doctors: [
      { initials: "AO", name: "Dr. Achieng Otieno", meta: "Dermatologist · 8 yrs · ★ 4.9", fee: "KES 1,500" },
      { initials: "BM", name: "Dr. Brian Mwangi", meta: "Dermatologist · 5 yrs · ★ 4.7", fee: "KES 1,200" },
    ],
  },
  flu: {
    label: "Flu",
    text: "Fever, sore throat and body aches since yesterday",
    specialty: "General practice",
    urgency: { label: "Within 24 hrs", tone: "soon" },
    doctors: [
      { initials: "FN", name: "Dr. Faith Njeri", meta: "General practitioner · 6 yrs · ★ 4.8", fee: "KES 800" },
      { initials: "HO", name: "Dr. Hassan Omar", meta: "General practitioner · 11 yrs · ★ 4.9", fee: "KES 1,000" },
    ],
  },
  mind: {
    label: "Anxiety",
    text: "I can't sleep, I worry all the time and can't focus at work",
    specialty: "Mental health",
    urgency: { label: "Routine", tone: "routine" },
    doctors: [
      { initials: "LC", name: "Dr. Lydia Chebet", meta: "Psychiatrist · 9 yrs · ★ 4.9", fee: "KES 2,500" },
      { initials: "KO", name: "Kevin Ouma", meta: "Counselling psychologist · 7 yrs · ★ 4.8", fee: "KES 1,800" },
    ],
  },
  chest: {
    label: "Chest pain",
    text: "Sudden chest pain spreading to my left arm",
    specialty: "Emergency care",
    urgency: { label: "Emergency", tone: "emergency" },
    doctors: null,
  },
};

export default function SymptomDemo() {
  const [active, setActive] = useState("rash");
  const [typed, setTyped] = useState(EXAMPLES.rash.text.length);
  const ex = EXAMPLES[active];
  const done = typed >= ex.text.length;

  useEffect(() => {
    if (typed >= ex.text.length) return;
    const t = setTimeout(() => setTyped((n) => n + 1), 28);
    return () => clearTimeout(t);
  }, [typed, ex.text.length]);

  function pick(key: string) {
    setActive(key);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTyped(reduce ? EXAMPLES[key].text.length : 0);
  }

  return (
    <div className="demo" aria-label="Symptom checker preview">
      <div className="demo-head">
        <strong>Symptom checker</strong>
        <span className="sample">SAMPLE</span>
      </div>

      <div className="chips" role="group" aria-label="Example symptoms">
        {Object.entries(EXAMPLES).map(([key, e]) => (
          <button key={key} className="chip" aria-pressed={active === key} onClick={() => pick(key)}>
            {e.label}
          </button>
        ))}
      </div>

      <div className="input">
        {ex.text.slice(0, typed)}
        <span className="caret" />
      </div>

      <div style={{ opacity: done ? 1 : 0.35 }}>
        {done && (
          <div className="fade" key={active}>
            <div className="result">
              <div className="stat">
                <small>Suggested specialty</small>
                <b>{ex.specialty}</b>
              </div>
              <div className="stat">
                <small>Urgency</small>
                <span className={`pill ${ex.urgency.tone}`}>{ex.urgency.label}</span>
              </div>
            </div>

            {ex.doctors ? (
              <>
                <div className="docs-label">Verified doctors available today</div>
                <div className="docs">
                  {ex.doctors.map((d) => (
                    <div className="doc" key={d.name}>
                      <div className="avatar">{d.initials}</div>
                      <div className="doc-info">
                        <b>{d.name}</b>
                        <span>{d.meta}</span>
                      </div>
                      <div className="fee">{d.fee}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="emerg">
                This could be serious.
                <p>Please go to the nearest hospital now or call 999 / 112. Don&apos;t wait for an online consultation.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
