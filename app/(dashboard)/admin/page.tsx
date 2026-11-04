import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import BarList from "@/components/charts/BarList";
import ColumnChart from "@/components/charts/ColumnChart";
import { ANALYTICS_DAYS as DAYS, loadReport } from "@/lib/analytics";
import { requireRole } from "@/lib/auth";
import { formatKes } from "@/lib/time";
import AiOverview from "./AiOverview";

export const metadata: Metadata = { title: "Admin · AfyaLink" };

const dayLabel = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function AdminHome() {
  const { supabase } = await requireRole("admin");

  // Aggregated numbers only: admin_analytics() never returns a patient's record.
  const report = await loadReport(supabase);
  const a = report?.analytics;

  return (
    <>
      <div className="eyebrow">Admin</div>
      <h1>Platform overview</h1>
      <p className="sub">
        <Link href="/admin/doctors">Verify doctors</Link> · <Link href="/admin/users">Manage users</Link> ·{" "}
        <Link href="/admin/reviews">Reviews</Link>
      </p>

      {!report || !a ? (
        <p className="notice bad">
          Analytics aren&apos;t available yet. Run <code>supabase/migrations/0004_admin_analytics.sql</code> in the
          Supabase SQL Editor, then reload.
        </p>
      ) : (
        <>
          <section className="ai-overview" aria-labelledby="ai-overview-title">
            <div className="ai-head">
              <h2 id="ai-overview-title">AI overview</h2>
              <span className="tag">Gemini</span>
              <a href="/api/admin/report" className="btn btn-primary" download>
                Download PDF report
              </a>
            </div>
            <Suspense fallback={<p className="ai-pending">Gemini is reading the latest numbers…</p>}>
              <AiOverview report={report} />
            </Suspense>
            <small className="ai-note">
              Written by AI from the aggregated numbers on this page, never from patient records. It can make mistakes, so
              check the figures before acting.
            </small>
          </section>

          <div className="hero-stat">
            <span className="label">Consultation revenue (M-Pesa sandbox)</span>
            <b>{formatKes(a.revenue_kes)}</b>
            <span>from {a.consultations.toLocaleString("en-KE")} paid consultations</span>
          </div>

          <div className="panels stats">
            <Link href="/admin/users?role=patient" className="panel panel-link">
              <small className="label">Patients</small>
              <b>{a.patients.toLocaleString("en-KE")}</b>
            </Link>
            <Link href="/admin/doctors" className="panel panel-link">
              <small className="label">Verified doctors</small>
              <b>{a.doctors_verified.toLocaleString("en-KE")}</b>
              <span>{a.doctors_pending ? `${a.doctors_pending} waiting for review →` : "None waiting"}</span>
            </Link>
            <div className="panel">
              <small className="label">Consultations completed</small>
              <b>{a.consultations_done.toLocaleString("en-KE")}</b>
              <span>{a.prescriptions.toLocaleString("en-KE")} prescriptions issued</span>
            </div>
            <div className="panel">
              <small className="label">Symptom checks</small>
              <b>{a.symptom_checks.toLocaleString("en-KE")}</b>
              <span>{a.red_flags} sent to emergency care</span>
            </div>
            <Link href="/admin/reviews" className="panel panel-link">
              <small className="label">Average rating</small>
              <b>{a.average_rating ? `★ ${Number(a.average_rating).toFixed(1)}` : "—"}</b>
              <span>{a.review_count} reviews · see all →</span>
            </Link>
          </div>

          <div className="chart-grid">
            <ColumnChart
              title={`Paid consultations per day, last ${DAYS} days`}
              unit="consultations"
              points={a.bookings_per_day.map((d) => ({
                key: d.day,
                label: dayLabel.format(new Date(`${d.day}T00:00:00Z`)),
                value: Number(d.count),
              }))}
            />
            <BarList
              title="Paid consultations by specialty"
              unit="consultations"
              empty="No paid consultations yet."
              bars={a.by_specialty.map((s) => ({ key: s.label, label: s.label, value: Number(s.count) }))}
            />
            <BarList
              title="Symptom checks by urgency"
              unit="checks"
              empty="No symptom checks yet."
              bars={[
                { key: "routine", label: "Routine", value: a.urgency.routine ?? 0, color: "var(--chart-good)", icon: "●" },
                { key: "soon", label: "Within 24 hours", value: a.urgency.within_24_hours ?? 0, color: "var(--chart-warn)", icon: "▲" },
                { key: "emergency", label: "Emergency", value: a.urgency.emergency ?? 0, color: "var(--chart-bad)", icon: "⚠" },
              ]}
            />
          </div>
          <p className="empty">
            Counts only. Admins can&apos;t see individual symptom checks or prescriptions, to protect patients&apos; privacy.
          </p>
        </>
      )}
    </>
  );
}
