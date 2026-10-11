import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · AfyaLink" };

export default async function AdminHome() {
  const { supabase } = await requireRole("admin");

  // head: true asks only for the count, not the rows.
  const count = (table: "patients" | "doctors") => supabase.from(table).select("id", { count: "exact", head: true });
  const [patients, doctors, pending] = await Promise.all([
    count("patients"),
    count("doctors"),
    count("doctors").eq("verification_status", "pending"),
  ]);

  return (
    <>
      <div className="eyebrow">Admin</div>
      <h1>Platform overview</h1>
      <p className="sub">Analytics are coming in a later phase.</p>

      <div className="panels">
        <Link href="/admin/users?role=patient" className="panel panel-link">
          <b>{patients.count ?? 0}</b>
          <span>Patients →</span>
        </Link>
        <Link href="/admin/users?role=doctor" className="panel panel-link">
          <b>{doctors.count ?? 0}</b>
          <span>Doctors →</span>
        </Link>
        <Link href="/admin/doctors" className="panel panel-link">
          <b>{pending.count ?? 0}</b>
          <span>Doctors waiting for verification →</span>
        </Link>
      </div>
    </>
  );
}
