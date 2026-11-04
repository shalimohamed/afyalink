import Link from "next/link";
import type { AdminReview } from "@/lib/reviews";
import { formatDate } from "@/lib/time";

// Reviews on the admin pages. Each one links to the patient who wrote it (to
// find and, if needed, suspend them) and, with showDoctor, to that doctor's reviews.
export default function ReviewList({ reviews, showDoctor = false }: { reviews: AdminReview[]; showDoctor?: boolean }) {
  return (
    <ul className="list">
      {reviews.map((r) => (
        <li key={r.id} className="item">
          <div className="item-main">
            <b aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}</b>
            {r.comment && <span>{r.comment}</span>}
            <span>
              {showDoctor && (
                <>
                  <Link href={`/admin/users/${r.doctor.id}/reviews`}>Dr. {r.doctor.name}</Link> ·{" "}
                </>
              )}
              by <Link href={`/admin/users?role=patient&q=${encodeURIComponent(r.patient.name)}`}>{r.patient.name}</Link>
            </span>
          </div>
          <div className="item-actions">
            {r.rating <= 2 && <span className="tag rejected">low rating</span>}
            <span className="empty">{formatDate(r.createdAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
