import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "My AfyaLink" };

export default async function PatientHome() {
  const { profile } = await requireRole("patient");
  const firstName = profile.full_name.split(" ")[0];

  return (
    <>
      <div className="eyebrow">Patient</div>
      <h1>Hi, {firstName}</h1>
      <p className="sub">What would you like to do today?</p>

      <div className="panels">
        <div className="panel">
          <b>Check your symptoms</b>
          <span>Describe how you feel and we&apos;ll suggest the right type of doctor. Coming soon.</span>
        </div>
        <div className="panel">
          <b>My consultations</b>
          <span>You haven&apos;t booked a consultation yet.</span>
        </div>
        <div className="panel">
          <b>Medical history</b>
          <span>Your past consultations and prescriptions will appear here.</span>
        </div>
      </div>

      <p className="notice bad">
        <strong>Not for emergencies.</strong> If you have chest pain, trouble breathing, heavy bleeding or thoughts of
        harming yourself, go to the nearest hospital or call 999 / 112.
      </p>
    </>
  );
}
