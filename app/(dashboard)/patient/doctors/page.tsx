import type { Metadata } from "next";
import Link from "next/link";
import DoctorList from "@/components/DoctorList";
import { requireRole } from "@/lib/auth";
import { getVerifiedDoctors } from "@/lib/doctors";
import { SPECIALTIES, SPECIALTY_VALUES } from "@/lib/specialties";

export const metadata: Metadata = { title: "Find a doctor · AfyaLink" };

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ specialty?: string }> }) {
  const { supabase } = await requireRole("patient");
  const { specialty } = await searchParams;
  const selected = specialty && SPECIALTY_VALUES.includes(specialty) ? specialty : undefined;
  const doctors = await getVerifiedDoctors(supabase, { specialtyId: selected });

  return (
    <>
      <Link href="/patient" className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Find a doctor</div>
      <h1>Verified doctors</h1>
      <p className="sub">
        Every doctor here has had their registration checked by our team. Not sure who to see?{" "}
        <Link href="/patient/check">Check your symptoms first</Link>.
      </p>

      <nav className="chips" aria-label="Filter by specialty">
        <Link href="/patient/doctors" className="chip" aria-current={!selected ? "page" : undefined}>
          All
        </Link>
        {SPECIALTIES.map((s) => (
          <Link
            key={s.value}
            href={`/patient/doctors?specialty=${s.value}`}
            className="chip"
            aria-current={selected === s.value ? "page" : undefined}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {doctors.length > 0 ? (
        <DoctorList doctors={doctors} />
      ) : (
        <p className="empty">No verified doctors {selected ? "in this specialty " : ""}yet. Please check again soon.</p>
      )}
    </>
  );
}
