import Link from "next/link";
import type { DoctorSummary } from "@/lib/doctors";
import { formatKes } from "@/lib/time";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export default function DoctorList({ doctors }: { doctors: DoctorSummary[] }) {
  return (
    <ul className="list">
      {doctors.map((d) => (
        <li key={d.id} className="item">
          <div className="doctor-card">
            <span className="avatar" aria-hidden="true">
              {initials(d.fullName)}
            </span>
            <div className="item-main">
              <b>Dr. {d.fullName}</b>
              <span>
                {d.specialtyLabel} ·{" "}
                {d.averageRating ? `★ ${d.averageRating.toFixed(1)} (${d.reviewCount})` : "New on AfyaLink"}
              </span>
              <span>
                {formatKes(d.feeKes)} {d.feeType === "per_hour" ? "per hour" : "per session"} · video consultation
              </span>
            </div>
          </div>
          <Link href={`/patient/doctors/${d.id}`} className="btn btn-primary">
            View &amp; book
          </Link>
        </li>
      ))}
    </ul>
  );
}
