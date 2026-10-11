import type { Metadata } from "next";
import Link from "next/link";
import Companion from "@/components/companion/Companion";
import BodyMap from "@/components/dashboard/BodyMap";
import Countdown from "@/components/dashboard/Countdown";
import JourneyTracker from "@/components/dashboard/JourneyTracker";
import WellnessCheckin from "@/components/dashboard/WellnessCheckin";
import { requireRole } from "@/lib/auth";
import { loadPatientDashboard } from "@/lib/patientDashboard";
import { formatSlot } from "@/lib/time";

export const metadata: Metadata = { title: "My AfyaLink" };

export default async function PatientHome() {
  const { supabase, profile } = await requireRole("patient");
  const firstName = profile.full_name.split(" ")[0];
  const { messages, journey, next } = await loadPatientDashboard(supabase, firstName);

  return (
    <>
      <div className="eyebrow">Patient</div>
      <h1>Hi, {firstName} 👋</h1>

      <div className="dash-top">
        <Companion variant="doctor" name="Daktari · your AfyaLink guide" messages={messages} />
        {next ? (
          <Countdown
            title="Your next consultation"
            who={next.doctorName}
            detail={`${next.specialty} · ${formatSlot(next.startsAt, next.endsAt)}`}
            startsAt={next.startsAt}
            endsAt={next.endsAt}
            joinHref={`/consultation/${next.id}`}
            viewHref={`/patient/bookings/${next.id}`}
          />
        ) : (
          <div className="countdown">
            <small className="label">Your next consultation</small>
            <b className="countdown-who">Nothing booked yet</b>
            <span className="countdown-detail">Verified doctors, video calls, M-Pesa payment.</span>
            <div className="speech-actions">
              <Link href="/patient/doctors" className="btn btn-primary">
                Find a doctor
              </Link>
            </div>
          </div>
        )}
      </div>

      <JourneyTracker steps={journey} />

      <div className="dash-grid">
        <BodyMap />
        <WellnessCheckin />
      </div>

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
        <Link href="/chat" className="panel panel-link">
          <b>Follow-up chats</b>
          <span>Free questions to doctors you&apos;ve seen →</span>
        </Link>
        <Link href="/patient/history" className="panel panel-link">
          <b>Medical history</b>
          <span>Your symptom checks, consultations, prescriptions and details →</span>
        </Link>
      </div>

      <p className="notice bad">
        <strong>Not for emergencies.</strong> If you have chest pain, trouble breathing, heavy bleeding or thoughts of
        harming yourself, go to the nearest hospital or call 999 / 112.
      </p>
    </>
  );
}
