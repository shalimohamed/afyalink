import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";

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
            : "We don't have your registration certificate yet. Uploading it will be available here soon."}
        </p>
      )}
      {doctor?.verification_status === "rejected" && (
        <p className="notice bad">
          <strong>Your registration was not approved.</strong> {doctor.rejection_reason}
        </p>
      )}
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
          <b>Your fee</b>
          <span>
            KES {doctor?.fee_kes.toLocaleString("en-KE")} {doctor?.fee_type === "per_hour" ? "per hour" : "per session"}
          </span>
        </div>
        <div className="panel">
          <b>Availability</b>
          <span>Publishing consultation slots is coming soon.</span>
        </div>
      </div>
    </>
  );
}
