import type { Metadata } from "next";
import Link from "next/link";
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
        <Link href="/patient/check" className="panel panel-link">
          <b>Check your symptoms</b>
          <span>Describe how you feel and we&apos;ll suggest the right type of doctor →</span>
        </Link>
        <Link href="/patient/doctors" className="panel panel-link">
          <b>Find a doctor</b>
          <span>Browse verified doctors and book a video consultation →</span>
        </Link>
        <Link href="/patient/bookings" className="panel panel-link">
          <b>My consultations</b>
          <span>Your bookings, payments and video calls →</span>
        </Link>
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
