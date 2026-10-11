import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatKes } from "@/lib/time";
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
      {doctor?.verification_status === "verified" && (
        <p className="notice ok">
          <strong>You&apos;re verified.</strong> Patients can find you and book your slots.
        </p>
      )}

      <div className="panels">
        <div className="panel">
          <b>Registration number</b>
          <span>{doctor?.registration_number}</span>
        </div>
        <div className="panel">
          <b>{myRating ? `★ ${Number(myRating.average_rating).toFixed(1)}` : "No ratings yet"}</b>
          <span>{myRating ? `Average from ${myRating.review_count} patient review${Number(myRating.review_count) === 1 ? "" : "s"}` : "Patients can rate you after a consultation"}</span>
        </div>
        <div className="panel">
          <b>Your fee</b>
          <span>
            {doctor && formatKes(doctor.fee_kes)} {doctor?.fee_type === "per_hour" ? "per hour" : "per session"}
          </span>
        </div>
        <Link href="/doctor/slots" className="panel panel-link">
          <b>Availability</b>
          <span>Publish the times patients can book you →</span>
        </Link>
        <Link href="/doctor/consultations" className="panel panel-link">
          <b>Consultations</b>
          <span>Join video calls and write prescriptions →</span>
        </Link>
        <Link href="/chat" className="panel panel-link">
          <b>Follow-up chats</b>
          <span>{pendingChats ? `${pendingChats} waiting for your answer →` : "Questions from past patients →"}</span>
        </Link>
      </div>
    </>
  );
}
