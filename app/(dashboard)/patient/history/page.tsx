import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { loadPatientBookings } from "@/lib/bookings";
import { URGENCY_LABELS, type Urgency } from "@/lib/symptoms/types";
import { formatDate, formatSlot, nairobiToday } from "@/lib/time";
import DetailsForm from "./DetailsForm";

export const metadata: Metadata = { title: "Medical history · AfyaLink" };

type CheckRow = {
  id: string;
  created_at: string;
  symptoms: string;
  urgency: Urgency;
  red_flag_triggered: boolean;
  specialties: { label: string } | null;
  symptom_check_conditions: { rank: number; condition_name: string }[];
};

type PrescriptionRow = {
  id: string;
  booking_id: string;
  diagnosis: string;
  pdf_path: string | null;
  prescription_items: { medicine_name: string; dosage: string; frequency: string; duration: string }[];
};

const URGENCY_PILL: Record<Urgency, string> = { routine: "routine", within_24_hours: "soon", emergency: "emergency" };

// Everything is loaded with the patient's own login, so row-level security
// guarantees it's only their records.
async function loadHistory(supabase: SupabaseClient) {
  const [{ data: checks }, bookings, { data: prescriptions }] = await Promise.all([
    supabase
      .from("symptom_checks")
      .select("id, created_at, symptoms, urgency, red_flag_triggered, specialties(label), symptom_check_conditions(rank, condition_name)")
      .order("created_at", { ascending: false }),
    loadPatientBookings(supabase),
    supabase.from("prescriptions").select("id, booking_id, diagnosis, pdf_path, prescription_items(medicine_name, dosage, frequency, duration)"),
  ]);

  const rxList = (prescriptions ?? []) as PrescriptionRow[];
  // Downloads go through our route, which checks access and notes the download.
  const rxByBooking = new Map(rxList.map((p) => [p.booking_id, { ...p, url: p.pdf_path ? `/api/prescriptions/${p.id}/pdf` : undefined }]));

  // One timeline, newest first: symptom checks and paid consultations.
  const entries = [
    ...((checks ?? []) as unknown as CheckRow[]).map((check) => ({ kind: "check" as const, date: check.created_at, check })),
    ...bookings
      .filter((b) => b.status === "confirmed")
      .map((booking) => ({ kind: "consultation" as const, date: booking.slot.starts_at, booking, prescription: rxByBooking.get(booking.id) })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return entries;
}

export default async function HistoryPage() {
  const { supabase, profile } = await requireRole("patient");
  const [entries, { data: details }] = await Promise.all([
    loadHistory(supabase),
    supabase.from("patients").select("date_of_birth, sex").eq("id", profile.id).single<{ date_of_birth: string | null; sex: string | null }>(),
  ]);

  return (
    <>
      <Link href="/patient" className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Patient</div>
      <h1>Medical history</h1>
      <p className="sub">Your symptom checks, consultations and prescriptions. Only you (and the doctor of each consultation) can see these.</p>

      <h2 className="section-title">My details</h2>
      <DetailsForm
        dateOfBirth={details?.date_of_birth ?? null}
        sex={details?.sex ?? null}
        phone={profile.phone ? "0" + profile.phone.slice(3) : ""}
        today={nairobiToday()}
      />

      <h2 className="section-title">Timeline</h2>
      {entries.length === 0 && (
        <p className="empty">
          Nothing yet. <Link href="/patient/check">Check your symptoms</Link> or <Link href="/patient/doctors">book a doctor</Link>.
        </p>
      )}
      <ol className="list timeline">
        {entries.map((entry) =>
          entry.kind === "check" ? (
            <li key={`c-${entry.check.id}`} className="item">
              <div className="item-main">
                <small className="label">Symptom check · {formatDate(entry.check.created_at)}</small>
                <b>
                  <Link href={`/patient/check/${entry.check.id}`}>
                    {entry.check.symptoms.length > 90 ? `${entry.check.symptoms.slice(0, 90)}…` : entry.check.symptoms}
                  </Link>
                </b>
                <span>
                  {entry.check.red_flag_triggered
                    ? "Emergency signs: advised to go to hospital"
                    : [...entry.check.symptom_check_conditions]
                        .sort((a, b) => a.rank - b.rank)
                        .map((c) => c.condition_name)
                        .join(", ") || "No conditions listed"}
                  {entry.check.specialties && ` · Suggested: ${entry.check.specialties.label}`}
                </span>
              </div>
              <span className={`pill ${URGENCY_PILL[entry.check.urgency]}`}>{URGENCY_LABELS[entry.check.urgency]}</span>
            </li>
          ) : (
            <li key={`b-${entry.booking.id}`} className="item">
              <div className="item-main">
                <small className="label">Consultation · {formatSlot(entry.booking.slot.starts_at, entry.booking.slot.ends_at)}</small>
                <b>
                  <Link href={`/patient/bookings/${entry.booking.id}`}>
                    Dr. {entry.booking.slot.doctor?.profile.full_name ?? "—"}
                  </Link>{" "}
                  · {entry.booking.slot.doctor?.specialties.label}
                </b>
                {entry.prescription ? (
                  <span>
                    <strong>{entry.prescription.diagnosis}</strong>:{" "}
                    {entry.prescription.prescription_items.map((m) => `${m.medicine_name} ${m.dosage}, ${m.frequency}, ${m.duration}`).join("; ")}
                  </span>
                ) : (
                  <span>No prescription</span>
                )}
              </div>
              {entry.prescription?.url && (
                <a href={entry.prescription.url} className="btn btn-ghost">
                  Prescription PDF
                </a>
              )}
            </li>
          ),
        )}
      </ol>
    </>
  );
}
