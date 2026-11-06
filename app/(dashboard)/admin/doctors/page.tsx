import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { loadPhones } from "@/lib/phone";
import { formatDate, formatKes } from "@/lib/time";
import { reviewDoctor } from "./actions";

export const metadata: Metadata = { title: "Verify doctors · AfyaLink" };

type DoctorRow = {
  id: string;
  registration_number: string;
  fee_type: "per_session" | "per_hour";
  fee_kes: number;
  licence_path: string | null;
  verification_status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  reviewed_at: string | null;
  profile: { full_name: string; created_at: string };
  specialties: { label: string };
};

export default async function VerifyDoctorsPage() {
  const { supabase } = await requireRole("admin");

  // doctors has two links to profiles (the doctor, and the admin who reviewed
  // them), so "!doctors_id_fkey" says which one to follow.
  const { data } = await supabase
    .from("doctors")
    .select(
      "id, registration_number, fee_type, fee_kes, licence_path, verification_status, rejection_reason, reviewed_at, " +
        "profile:profiles!doctors_id_fkey(full_name, created_at), specialties(label)",
    )
    .order("reviewed_at", { ascending: false, nullsFirst: true });
  const doctors = (data ?? []) as unknown as DoctorRow[];
  const phones = await loadPhones(supabase, doctors.map((d) => d.id));

  // The bucket is private, so the admin gets temporary links (valid 10 minutes).
  const paths = doctors.flatMap((d) => (d.licence_path ? [d.licence_path] : []));
  const { data: signed } = paths.length
    ? await supabase.storage.from("licences").createSignedUrls(paths, 600)
    : { data: [] };
  const licenceUrl = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const pending = doctors.filter((d) => d.verification_status === "pending");
  const reviewed = doctors.filter((d) => d.verification_status !== "pending");

  return (
    <>
      <Link href="/admin" className="back">
        ← Overview
      </Link>
      <div className="eyebrow">Admin</div>
      <h1>Verify doctors</h1>
      <p className="sub">
        Open each certificate and check the registration number on the KMPDC public register before approving.
      </p>

      <h2 className="section-title">Waiting for review ({pending.length})</h2>
      {pending.length === 0 && <p className="empty">No doctors are waiting. 🎉</p>}
      <ul className="list">
        {pending.map((d) => (
          <li key={d.id} className="item">
            <div className="item-main">
              <b>Dr. {d.profile.full_name}</b>
              <span>
                {d.specialties.label} · Reg. no. <code>{d.registration_number}</code>
              </span>
              <span>
                {formatKes(d.fee_kes)} {d.fee_type === "per_hour" ? "per hour" : "per session"} · {phones.get(d.id) ?? "no phone"} ·
                registered {formatDate(d.profile.created_at)}
              </span>
              {d.licence_path && licenceUrl.get(d.licence_path) ? (
                <a href={licenceUrl.get(d.licence_path)!} target="_blank" rel="noreferrer">
                  Open certificate ↗
                </a>
              ) : (
                <span className="err">No certificate uploaded yet</span>
              )}
            </div>
            <div className="item-actions">
              <ActionButton
                action={reviewDoctor}
                fields={{ doctorId: d.id, decision: "approve" }}
                label="Approve"
                className="btn btn-primary"
              />
              <ActionButton
                action={reviewDoctor}
                fields={{ doctorId: d.id, decision: "reject" }}
                label="Reject"
                input={{ name: "reason", placeholder: "Reason for rejecting" }}
              />
            </div>
          </li>
        ))}
      </ul>

      <h2 className="section-title">Reviewed ({reviewed.length})</h2>
      <ul className="list">
        {reviewed.map((d) => (
          <li key={d.id} className="item">
            <div className="item-main">
              <b>Dr. {d.profile.full_name}</b>
              <span>
                {d.specialties.label} · Reg. no. <code>{d.registration_number}</code>
              </span>
              {d.rejection_reason && <span>Reason: {d.rejection_reason}</span>}
            </div>
            <span className={`tag ${d.verification_status}`}>
              {d.verification_status === "verified" ? "Verified" : "Rejected"}
              {d.reviewed_at && ` · ${formatDate(d.reviewed_at)}`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
