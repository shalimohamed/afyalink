import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { loadDoctorConsultations, type Consultation } from "@/lib/consultations";
import { formatSlot } from "@/lib/time";

export const metadata: Metadata = { title: "Consultations · AfyaLink" };

export default async function DoctorConsultationsPage() {
  const { supabase } = await requireRole("doctor");
  const consultations = await loadDoctorConsultations(supabase);
  const upcoming = consultations.filter((c) => c.callWindow !== "ended");
  const past = consultations.filter((c) => c.callWindow === "ended").reverse();

  return (
    <>
      <Link href="/doctor" className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Doctor</div>
      <h1>Consultations</h1>
      <p className="sub">Paid video consultations. The call opens 15 minutes before each one.</p>

      <h2 className="section-title">Upcoming ({upcoming.length})</h2>
      {upcoming.length === 0 && <p className="empty">No upcoming consultations.</p>}
      <ConsultationList consultations={upcoming} />

      <h2 className="section-title">Past ({past.length})</h2>
      {past.length === 0 && <p className="empty">No past consultations yet.</p>}
      <ConsultationList consultations={past} />
    </>
  );
}

function ConsultationList({ consultations }: { consultations: Consultation[] }) {
  return (
    <ul className="list">
      {consultations.map((c) => (
        <li key={c.id} className="item">
          <div className="item-main">
            <b>{c.patient?.profile.full_name ?? "Patient"}</b>
            <span>{formatSlot(c.slot.starts_at, c.slot.ends_at)}</span>
          </div>
          <div className="item-actions">
            {c.callWindow === "open" && (
              <Link href={`/consultation/${c.id}`} className="btn btn-primary">
                Join call
              </Link>
            )}
            <Link href={`/doctor/consultations/${c.id}/prescription`} className="btn btn-ghost">
              {c.prescription ? "Prescription ✓" : "Write prescription"}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
