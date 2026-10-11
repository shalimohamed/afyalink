"use client";

import Link from "next/link";
import { useState } from "react";

// An interactive body: tap one or more areas where it hurts, pick symptoms for
// each, and go to the symptom checker with them filled in. If the chest is
// selected, the emergency warning shows straight away. (The checker still runs
// the full red-flag rules on whatever is sent.)

type Region = {
  id: string;
  label: string;
  intro: string;
  symptoms: string[];
  emergency?: string;
};

const REGIONS: Region[] = [
  { id: "head", label: "Head", intro: "Headaches, fever and dizziness are often checked by a general practitioner first.", symptoms: ["Headache", "Fever", "Dizziness", "Tiredness", "Body aches"] },
  { id: "mind", label: "Mind & mood", intro: "Talking to a counsellor can really help. You're not alone.", symptoms: ["Stress", "Anxiety", "Low mood", "Can't sleep", "Panic attacks"] },
  { id: "ent", label: "Ears, nose & throat", intro: "Sore throats, blocked noses and earaches are common and usually mild.", symptoms: ["Sore throat", "Runny nose", "Earache", "Blocked nose", "Cough"] },
  {
    id: "chest",
    label: "Chest",
    intro: "A cough or chest cold can often be treated online.",
    symptoms: ["Cough", "Chest cold", "Phlegm"],
    emergency: "Chest pain, pressure or trouble breathing can be an emergency. Go to the nearest hospital or call 999 / 112 now.",
  },
  { id: "stomach", label: "Stomach", intro: "Stomach upsets are common. Keep drinking fluids.", symptoms: ["Stomach ache", "Diarrhoea", "Vomiting", "Bloating", "Heartburn"] },
  { id: "pelvis", label: "Lower belly", intro: "Period, urinary and pregnancy questions are handled privately.", symptoms: ["Period pain", "Irregular periods", "Burning when urinating", "Pregnancy question", "Unusual discharge"] },
  { id: "skin", label: "Skin", intro: "Rashes and skin problems are easy to show on a video call.", symptoms: ["Itchy rash", "Acne", "Dry skin", "Spots", "Hair loss"] },
  { id: "legs", label: "Joints & legs", intro: "Aches, sprains and swelling: a doctor can advise on care at home.", symptoms: ["Joint pain", "Back pain", "Swollen ankles", "Muscle cramps", "Sprain"] },
];

const byId = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// Shapes are drawn in a 200 × 400 box. Each area is a toggle button.
function Shape({ id, on, onToggle, children }: { id: string; on: boolean; onToggle: (id: string) => void; children: React.ReactNode }) {
  const region = byId[id];
  return (
    <g
      className={`body-part ${on ? "on" : ""} ${region.emergency ? "warn" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={region.label}
      aria-pressed={on}
      onClick={() => onToggle(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(id);
        }
      }}
    >
      <title>{region.label}</title>
      {children}
    </g>
  );
}

export default function BodyMap() {
  // The selected areas, and the symptoms picked in each one.
  const [areas, setAreas] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const toggleArea = (id: string) => {
    if (areas.includes(id)) {
      setAreas(areas.filter((a) => a !== id));
      // Forget that area's symptoms.
      setPicked((current) => Object.fromEntries(Object.entries(current).filter(([area]) => area !== id)));
    } else {
      setAreas([...areas, id]);
    }
  };
  const toggleSymptom = (area: string, symptom: string) =>
    setPicked((current) => {
      const list = current[area] ?? [];
      return { ...current, [area]: list.includes(symptom) ? list.filter((s) => s !== symptom) : [...list, symptom] };
    });
  const clear = () => {
    setAreas([]);
    setPicked({});
  };

  // Show the selected areas in head-to-toe order.
  const selected = REGIONS.filter((r) => areas.includes(r.id));
  const emergency = selected.find((r) => r.emergency)?.emergency;
  const total = selected.reduce((n, r) => n + (picked[r.id]?.length ?? 0), 0);
  // e.g. "Head: I have headache, fever. Stomach: I have diarrhoea."
  const sentence = selected
    .filter((r) => picked[r.id]?.length)
    .map((r) => `${r.label}: I have ${picked[r.id].join(", ").toLowerCase()}.`)
    .join(" ");

  const on = (id: string) => areas.includes(id);

  return (
    <section className="bodymap" aria-label="Where does it hurt?">
      <svg viewBox="0 0 200 400" className="body-svg" aria-label="Body map. Choose one or more areas.">
        <Shape id="mind" on={on("mind")} onToggle={toggleArea}>
          <circle cx="162" cy="30" r="20" />
          <circle cx="140" cy="58" r="5" />
          <text x="162" y="36" textAnchor="middle" fontSize="18" aria-hidden="true">
            💭
          </text>
        </Shape>
        <Shape id="head" on={on("head")} onToggle={toggleArea}>
          <circle cx="100" cy="46" r="30" />
        </Shape>
        <Shape id="ent" on={on("ent")} onToggle={toggleArea}>
          <rect x="86" y="78" width="28" height="22" rx="8" />
        </Shape>
        <Shape id="skin" on={on("skin")} onToggle={toggleArea}>
          <rect x="34" y="106" width="24" height="128" rx="12" transform="rotate(8 46 106)" />
          <rect x="142" y="106" width="24" height="128" rx="12" transform="rotate(-8 154 106)" />
        </Shape>
        <Shape id="chest" on={on("chest")} onToggle={toggleArea}>
          <rect x="60" y="102" width="80" height="62" rx="20" />
        </Shape>
        <Shape id="stomach" on={on("stomach")} onToggle={toggleArea}>
          <rect x="64" y="167" width="72" height="50" rx="16" />
        </Shape>
        <Shape id="pelvis" on={on("pelvis")} onToggle={toggleArea}>
          <rect x="68" y="220" width="64" height="36" rx="14" />
        </Shape>
        <Shape id="legs" on={on("legs")} onToggle={toggleArea}>
          <rect x="70" y="260" width="27" height="128" rx="13" />
          <rect x="103" y="260" width="27" height="128" rx="13" />
        </Shape>
      </svg>

      <div className="body-panel" aria-live="polite">
        <div className="journey-head">
          <small className="label">Where does it hurt?</small>
          {areas.length > 0 && (
            <button type="button" className="link-button" onClick={clear}>
              Clear
            </button>
          )}
        </div>

        {selected.length === 0 ? (
          <>
            <h3>Tap the body</h3>
            <p className="body-intro">Choose one or more areas where you feel unwell, then pick your symptoms.</p>
          </>
        ) : (
          <>
            <h3>{selected.map((r) => r.label).join(" · ")}</h3>
            {emergency && (
              <p className="notice bad" role="alert">
                <strong>⚠ {emergency}</strong>
              </p>
            )}
            {selected.map((r) => (
              <div key={r.id} className="body-area">
                <b>{r.label}</b>
                <p className="body-intro">{r.intro}</p>
                <div className="chips">
                  {r.symptoms.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      aria-pressed={picked[r.id]?.includes(s) ?? false}
                      onClick={() => toggleSymptom(r.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {total > 0 ? (
          <Link href={`/patient/check?symptoms=${encodeURIComponent(sentence)}`} className="btn btn-primary">
            Check {total === 1 ? "this symptom" : `these ${total} symptoms`} →
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            {selected.length ? "Pick at least one symptom" : "Tap an area to start"}
          </button>
        )}
      </div>
    </section>
  );
}
