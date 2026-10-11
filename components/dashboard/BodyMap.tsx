"use client";

import Link from "next/link";
import { useState } from "react";

// An interactive body: tap where it hurts, pick symptoms, and go to the
// symptom checker with them filled in. The chest shows the emergency warning
// straight away. (The checker still runs the full red-flag rules.)

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

// Shapes are drawn in a 200 × 400 box.
function Shape({ id, selected, onSelect, children }: { id: string; selected: string; onSelect: (id: string) => void; children: React.ReactNode }) {
  const region = byId[id];
  return (
    <g
      className={`body-part ${selected === id ? "on" : ""} ${region.emergency ? "warn" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={region.label}
      aria-pressed={selected === id}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
    >
      <title>{region.label}</title>
      {children}
    </g>
  );
}

export default function BodyMap() {
  const [selected, setSelected] = useState("head");
  const [picked, setPicked] = useState<string[]>([]);
  const region = byId[selected];

  const select = (id: string) => {
    setSelected(id);
    setPicked([]);
  };
  const toggle = (symptom: string) =>
    setPicked((current) => (current.includes(symptom) ? current.filter((s) => s !== symptom) : [...current, symptom]));

  const sentence = picked.length ? `${region.label}: I have ${picked.join(", ").toLowerCase()}. ` : "";

  return (
    <section className="bodymap" aria-label="Where does it hurt?">
      <svg viewBox="0 0 200 400" className="body-svg" aria-label="Body map. Choose an area.">
        <Shape id="mind" selected={selected} onSelect={select}>
          <circle cx="162" cy="30" r="20" />
          <circle cx="140" cy="58" r="5" />
          <text x="162" y="36" textAnchor="middle" fontSize="18" aria-hidden="true">
            💭
          </text>
        </Shape>
        <Shape id="head" selected={selected} onSelect={select}>
          <circle cx="100" cy="46" r="30" />
        </Shape>
        <Shape id="ent" selected={selected} onSelect={select}>
          <rect x="86" y="78" width="28" height="22" rx="8" />
        </Shape>
        <Shape id="skin" selected={selected} onSelect={select}>
          <rect x="34" y="106" width="24" height="128" rx="12" transform="rotate(8 46 106)" />
          <rect x="142" y="106" width="24" height="128" rx="12" transform="rotate(-8 154 106)" />
        </Shape>
        <Shape id="chest" selected={selected} onSelect={select}>
          <rect x="60" y="102" width="80" height="62" rx="20" />
        </Shape>
        <Shape id="stomach" selected={selected} onSelect={select}>
          <rect x="64" y="167" width="72" height="50" rx="16" />
        </Shape>
        <Shape id="pelvis" selected={selected} onSelect={select}>
          <rect x="68" y="220" width="64" height="36" rx="14" />
        </Shape>
        <Shape id="legs" selected={selected} onSelect={select}>
          <rect x="70" y="260" width="27" height="128" rx="13" />
          <rect x="103" y="260" width="27" height="128" rx="13" />
        </Shape>
      </svg>

      <div className="body-panel" aria-live="polite">
        <small className="label">Where does it hurt?</small>
        <h3>{region.label}</h3>
        {region.emergency && (
          <p className="notice bad" role="alert">
            <strong>⚠ {region.emergency}</strong>
          </p>
        )}
        <p className="body-intro">{region.intro}</p>
        <div className="chips">
          {region.symptoms.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={picked.includes(s)} onClick={() => toggle(s)}>
              {s}
            </button>
          ))}
        </div>
        {picked.length ? (
          <Link href={`/patient/check?symptoms=${encodeURIComponent(sentence)}`} className="btn btn-primary">
            Check {picked.length === 1 ? "this symptom" : "these symptoms"} →
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" disabled>
            Pick a symptom above
          </button>
        )}
      </div>
    </section>
  );
}
