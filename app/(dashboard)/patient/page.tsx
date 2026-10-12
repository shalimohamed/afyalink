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
  const { messages, journey, next } = await loadPatientDashboard(supabase, { id: profile.id, firstName, phone: profile.phone });

  return (
    <>
      <div className="eyebrow">Patient</div>
      <h1>Hi, {firstName} 👋</h1>

      <div className="dash-top">
        <Companion variant="doctor" name="Daktari · your AfyaLink guide" messages={messages} wellness />
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

      {/* Hidden the day after a round of care is completed, until a new one starts. */}
      {journey.visible && <JourneyTracker journey={journey} />}

      <div className="dash-grid">
        <BodyMap />
        <WellnessCheckin />
      </div>

      <p className="notice bad">
        <strong>Not for emergencies.</strong> If you have chest pain, trouble breathing, heavy bleeding or thoughts of
        harming yourself, go to the nearest hospital or call 999 / 112.
      </p>
    </>
  );
}
