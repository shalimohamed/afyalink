import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DoctorList from "@/components/DoctorList";
import { requireRole } from "@/lib/auth";
import { getVerifiedDoctors } from "@/lib/doctors";
import { findRedFlags } from "@/lib/symptoms/redFlags";
import { URGENCY_LABELS, type Urgency } from "@/lib/symptoms/types";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Your symptom check · AfyaLink" };

type CheckRow = {
  id: string;
  symptoms: string;
  red_flag_triggered: boolean;
  urgency: Urgency;
  suggested_specialty_id: string | null;
  created_at: string;
  specialties: { label: string } | null;
  symptom_check_conditions: { rank: number; condition_name: string; explanation: string | null }[];
};

const URGENCY_PILL: Record<Urgency, string> = { routine: "routine", within_24_hours: "soon", emergency: "emergency" };

export default async function CheckResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("patient");

  // Row-level security means patients can only load their own checks.
  const { data: check } = await supabase
    .from("symptom_checks")
    .select(
      "id, symptoms, red_flag_triggered, urgency, suggested_specialty_id, created_at, specialties(label), " +
        "symptom_check_conditions(rank, condition_name, explanation)",
    )
    .eq("id", id)
    .maybeSingle<CheckRow>();
  if (!check) notFound();

  const isEmergency = check.red_flag_triggered || check.urgency === "emergency";
  const conditions = [...check.symptom_check_conditions].sort((a, b) => a.rank - b.rank);

  return (
    <>
      <Link href="/patient/check" className="back">
        ← Check other symptoms
      </Link>
      <div className="eyebrow">Symptom check · {formatDate(check.created_at)}</div>
      <blockquote className="quote">“{check.symptoms}”</blockquote>

      {isEmergency ? (
        <EmergencyResult symptoms={check.symptoms} redFlag={check.red_flag_triggered} />
      ) : (
        <>
          <p className="notice ok">
            <strong>This is not a diagnosis.</strong> These are possibilities to discuss with a doctor. Only a doctor
            can tell you what you have.
          </p>

          {conditions.length > 0 ? (
            <>
              <h2 className="section-title">Possible conditions</h2>
              <ol className="list conditions">
                {conditions.map((c) => (
                  <li key={c.rank} className="item">
                    <div className="item-main">
                      <b>{c.condition_name}</b>
                      {c.explanation && <span>{c.explanation}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="empty">
              Our AI assistant isn&apos;t available right now, so this suggestion is based on keywords only. A doctor
              will look at your symptoms properly during the consultation.
            </p>
          )}

          <div className="panels two">
            <div className="panel">
              <small className="label">Suggested doctor</small>
              <b>{check.specialties?.label ?? "General practitioner"}</b>
            </div>
            <div className="panel">
              <small className="label">Urgency</small>
              <span className={`pill ${URGENCY_PILL[check.urgency]}`}>{URGENCY_LABELS[check.urgency]}</span>
            </div>
          </div>

          <MatchingDoctors supabase={supabase} specialtyId={check.suggested_specialty_id ?? "general_practice"} />
        </>
      )}
    </>
  );
}

function EmergencyResult({ symptoms, redFlag }: { symptoms: string; redFlag: boolean }) {
  // Which rules matched isn't stored: the rules always give the same answer
  // for the same text, so we work it out again here.
  const flags = redFlag ? findRedFlags(symptoms) : [];

  return (
    <div className="emergency-box" role="alert">
      <h2>Please get emergency care now</h2>
      <p>
        Your symptoms may need urgent attention that a video call can&apos;t give. Go to the nearest hospital, or call{" "}
        <strong>999</strong> or <strong>112</strong>.
      </p>
      {flags.length > 0 && (
        <ul>
          {flags.map((f) => (
            <li key={f.id}>{f.label}</li>
          ))}
        </ul>
      )}
      <p className="small">AfyaLink is for mild, non-emergency problems, so we can&apos;t book a consultation for this.</p>
    </div>
  );
}

async function MatchingDoctors({ supabase, specialtyId }: { supabase: SupabaseClient; specialtyId: string }) {
  let doctors = await getVerifiedDoctors(supabase, specialtyId);
  let note = "";

  // No verified doctor in that specialty yet: a GP can usually help first.
  if (doctors.length === 0 && specialtyId !== "general_practice") {
    doctors = await getVerifiedDoctors(supabase, "general_practice");
    note = "We don't have a verified doctor in that specialty yet. A general practitioner can help you first.";
  }

  return (
    <>
      <h2 className="section-title">Doctors who can help</h2>
      {note && <p className="empty">{note}</p>}
      {doctors.length > 0 ? (
        <DoctorList doctors={doctors} />
      ) : (
        <p className="empty">
          No verified doctors are available yet. Please check again soon.
        </p>
      )}
    </>
  );
}
