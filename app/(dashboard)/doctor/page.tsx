import type { Metadata } from "next";
import Link from "next/link";
import ColumnChart from "@/components/charts/ColumnChart";
import Companion from "@/components/companion/Companion";
import Countdown from "@/components/dashboard/Countdown";
import DayTimeline from "@/components/dashboard/DayTimeline";
import { requireRole } from "@/lib/auth";
import { loadDoctorDashboard } from "@/lib/doctorDashboard";
import { formatKes, formatSlot } from "@/lib/time";
import LicenceForm from "./LicenceForm";

export const metadata: Metadata = { title: "Doctor dashboard · AfyaLink" };

type DoctorRow = {
  registration_number: string;
  fee_type: "per_session" | "per_hour";
  fee_kes: number;
  verification_status: "pending" | "verified" | "rejected";
  licence_path: string | null;
  rejection_reason: string | null;
  specialties: { label: string } | null;
};

export default async function DoctorHome() {
  const { supabase, profile } = await requireRole("doctor");

  // specialties(label) follows the foreign key, like a SQL join.
  const { data: doctor } = await supabase
    .from("doctors")
    .select("registration_number, fee_type, fee_kes, verification_status, licence_path, rejection_reason, specialties(label)")
    .eq("id", profile.id)
    .single<DoctorRow>();
  const { data: ratings } = await supabase.rpc("get_doctor_ratings");
  const myRating = ((ratings ?? []) as { doctor_id: string; average_rating: number; review_count: number }[]).find(
    (r) => r.doctor_id === profile.id,
  );
  const { count: pendingChats } = await supabase
    .from("chat_requests")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", profile.id)
    .eq("status", "pending");
  const dashboard = await loadDoctorDashboard(supabase, profile.id, doctor?.verification_status ?? "pending", pendingChats ?? 0);
  const weekTotal = dashboard.week.reduce((sum, d) => sum + d.kes, 0);
  const weekCount = dashboard.week.reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      <div className="eyebrow">Doctor</div>
      <h1>Dr. {profile.full_name}</h1>
      <p className="sub">{doctor?.specialties?.label}</p>

      {doctor?.verification_status === "pending" && (
        <p className="notice ok">
          <strong>Your registration is being reviewed.</strong>{" "}
          {doctor.licence_path
            ? "Patients can't see you or book you until an admin verifies your certificate."
            : "We don't have your registration certificate yet. Please upload it below."}
        </p>
      )}
      {doctor?.verification_status === "rejected" && (
        <p className="notice bad">
          <strong>Your registration was not approved.</strong> {doctor.rejection_reason} You can upload a new
          certificate below to be reviewed again.
        </p>
      )}
      {doctor && (!doctor.licence_path || doctor.verification_status === "rejected") && <LicenceForm />}
      <div className="dash-top">
        <Companion variant="patient" name="Mwananchi" messages={dashboard.messages} />
        {dashboard.next ? (
          <Countdown
            title="Your next patient"
            who={dashboard.next.patientName}
            detail={formatSlot(dashboard.next.startsAt, dashboard.next.endsAt)}
            startsAt={dashboard.next.startsAt}
            endsAt={dashboard.next.endsAt}
            joinHref={`/consultation/${dashboard.next.id}`}
            viewHref="/doctor/consultations"
          />
        ) : (
          <div className="countdown">
            <small className="label">Your next patient</small>
            <b className="countdown-who">No bookings yet</b>
            <span className="countdown-detail">Patients book the free slots you publish.</span>
            <div className="speech-actions">
              <Link href="/doctor/slots" className="btn btn-primary">
                Add availability
              </Link>
            </div>
          </div>
        )}
      </div>

      <DayTimeline dayStart={dashboard.dayStart} slots={dashboard.todaySlots} />

      <div className="dash-grid">
        <ColumnChart
          title={`Earnings this week: ${formatKes(weekTotal)} from ${weekCount} consultation${weekCount === 1 ? "" : "s"} (M-Pesa sandbox)`}
          unit="KES"
          labelEvery={1}
          points={dashboard.week.map((d) => ({ key: d.day, label: d.label, value: d.kes }))}
        />
        <div className="panels stats">
          <div className="panel">
            <small className="label">Rating</small>
            <b>{myRating ? `★ ${Number(myRating.average_rating).toFixed(1)}` : "—"}</b>
            <span>{myRating ? `from ${myRating.review_count} patient review${Number(myRating.review_count) === 1 ? "" : "s"}` : "Patients rate you after a consultation"}</span>
          </div>
          <div className="panel">
            <small className="label">Your fee</small>
            <b>{doctor ? formatKes(doctor.fee_kes) : "—"}</b>
            <span>{doctor?.fee_type === "per_hour" ? "per hour" : "per session"}</span>
          </div>
          <div className="panel">
            <small className="label">Registration</small>
            <b className="reg-no">{doctor?.registration_number}</b>
            <span>{doctor?.verification_status === "verified" ? "✓ Verified by AfyaLink" : "Waiting for verification"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
