import type { Consultation } from "@/lib/consultations";
import { URGENCY_LABELS } from "@/lib/symptoms/types";
import { ageInYears, formatTime } from "@/lib/time";

const URGENCY_PILL = { routine: "routine", within_24_hours: "soon", emergency: "emergency" } as const;

// What the doctor knows before the consultation, like a patient's file at a
// clinic: their details, and the symptoms they checked just before booking.
// Only that one check, never the patient's whole history.
export default function PatientFile({ consultation }: { consultation: Consultation }) {
  const patient = consultation.patient;
  const check = consultation.symptomCheck;
  const details = [
    patient?.date_of_birth && `${ageInYears(patient.date_of_birth)} years`,
    patient?.sex && patient.sex[0].toUpperCase() + patient.sex.slice(1),
    patient?.blood_group && `Blood group ${patient.blood_group}`,
  ].filter(Boolean);
  const conditions = check ? [...check.symptom_check_conditions].sort((a, b) => a.rank - b.rank) : [];

  return (
    <div className="panel patient-file">
      <small className="label">Patient file</small>
      <b>{patient?.profile.full_name ?? "Patient"}</b>
      <span>{details.length ? details.join(" · ") : "Age, sex and blood group not given yet."}</span>

      <small className="label file-heading">Symptoms{check && ` · checked ${formatTime(check.created_at)}`}</small>
      {check ? (
        <>
          <blockquote className="file-symptoms">{check.symptoms}</blockquote>
          {check.red_flag_triggered ? (
            <p className="notice bad">Emergency warning signs matched. The patient was told to go to hospital or call 999 / 112.</p>
          ) : (
            <>
              <span className={`pill ${URGENCY_PILL[check.urgency]}`}>{URGENCY_LABELS[check.urgency]}</span>
              {conditions.length > 0 && (
                <span>
                  AI suggestion (not a diagnosis): {conditions.map((c) => c.condition_name).join(", ")}
                  {check.specialties && ` · ${check.specialties.label}`}
                </span>
              )}
            </>
          )}
        </>
      ) : (
        <span>The patient didn&apos;t check their symptoms before booking.</span>
      )}
    </div>
  );
}
