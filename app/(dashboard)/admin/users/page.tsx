import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/ActionButton";
import { requireRole } from "@/lib/auth";
import { loadPhones } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatKes } from "@/lib/time";
import { setSuspended } from "./actions";

export const metadata: Metadata = { title: "Users · AfyaLink" };

type ProfileRow = { id: string; role: "patient" | "doctor" | "admin"; full_name: string; created_at: string };
type RatingRow = { doctor_id: string; average_rating: number; review_count: number };
type PaidBookingRow = {
  id: string;
  amount_kes: number;
  slot: { doctor_id: string };
  patient: { profile: { full_name: string } } | null;
  payments: { status: string; mpesa_receipt: string | null }[];
  prescriptions: { id: string } | { id: string }[] | null;
};

// Paid consultations that haven't happened yet, by doctor. When a doctor is
// suspended, these won't take place and the patients are owed a refund
// (their booking page tells them so).
async function loadRefundsDue(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"]) {
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, amount_kes, slot:availability_slots!inner(doctor_id), patient:patients(profile:profiles(full_name)), " +
        "payments(status, mpesa_receipt), prescriptions(id)",
    )
    .eq("status", "confirmed")
    .gt("slot.ends_at", new Date().toISOString());
  const byDoctor = new Map<string, PaidBookingRow[]>();
  for (const b of (data ?? []) as unknown as PaidBookingRow[]) {
    const prescribed = Array.isArray(b.prescriptions) ? b.prescriptions.length > 0 : Boolean(b.prescriptions);
    if (prescribed) continue; // that consultation already took place
    byDoctor.set(b.slot.doctor_id, [...(byDoctor.get(b.slot.doctor_id) ?? []), b]);
  }
  return byDoctor;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "patient", label: "Patients" },
  { value: "doctor", label: "Doctors" },
  { value: "admin", label: "Admins" },
];

// Profiles (filtered by role and name) joined with their login details.
// Emails, last login and suspension live in Supabase Auth, which only the
// service-role key can read; callers must have checked the user is an admin.
async function loadUsers(supabase: Awaited<ReturnType<typeof requireRole>>["supabase"], role: string, q: string) {
  const now = Date.now();
  let query = supabase.from("profiles").select("id, role, full_name, created_at").order("created_at", { ascending: false });
  if (role !== "all") query = query.eq("role", role);
  if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
  const [{ data }, { data: ratings }, refundsDue] = await Promise.all([query, supabase.rpc("get_doctor_ratings"), loadRefundsDue(supabase)]);
  const profiles = (data ?? []) as ProfileRow[];
  const ratingById = new Map(((ratings ?? []) as RatingRow[]).map((r) => [r.doctor_id, r]));

  const [{ data: authData }, phones] = await Promise.all([
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
    loadPhones(supabase, profiles.map((p) => p.id)),
  ]);
  const authById = new Map((authData?.users ?? []).map((u) => [u.id, u]));

  return profiles.map((p) => {
    const auth = authById.get(p.id);
    const suspended = Boolean(auth?.banned_until && new Date(auth.banned_until).getTime() > now);
    return {
      ...p,
      phone: phones.get(p.id) ?? null,
      email: auth?.email ?? null,
      lastSignIn: auth?.last_sign_in_at ?? null,
      viaGoogle: auth?.app_metadata?.provider === "google",
      suspended,
      rating: ratingById.get(p.id) ?? null,
      refundsDue: suspended ? (refundsDue.get(p.id) ?? []) : [],
    };
  });
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const { supabase, profile: me } = await requireRole("admin");
  const { role = "all", q = "" } = await searchParams;
  const users = await loadUsers(supabase, role, q);

  return (
    <>
      <Link href="/admin" className="back">
        ← Overview
      </Link>
      <div className="eyebrow">Admin</div>
      <h1>Users</h1>
      <p className="sub">Everyone registered on AfyaLink. Suspended users can&apos;t log in.</p>

      <form className="inline-form" role="search">
        <input type="hidden" name="role" value={role} />
        <input name="q" defaultValue={q} placeholder="Search by name" aria-label="Search by name" />
        <button className="btn btn-ghost">Search</button>
      </form>
      <nav className="chips" aria-label="Filter by role">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/users?role=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className="chip"
            aria-current={role === f.value ? "page" : undefined}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {users.length === 0 && <p className="empty">No users found.</p>}
      <ul className="list">
        {users.map((u) => (
          <li key={u.id} className="item">
            <div className="item-main">
              <b>
                {u.role === "doctor" ? "Dr. " : ""}
                {u.full_name}
              </b>
              <span>
                {u.email ?? "—"}
                {u.phone && ` · +${u.phone}`}
              </span>
              <span>
                Joined {formatDate(u.created_at)}
                {u.lastSignIn ? ` · last login ${formatDate(u.lastSignIn)}` : " · never logged in"}
                {u.viaGoogle && " · Google"}
              </span>
              {u.role === "doctor" &&
                (u.rating ? (
                  <span>
                    ★ {Number(u.rating.average_rating).toFixed(1)} from {u.rating.review_count}{" "}
                    {Number(u.rating.review_count) === 1 ? "review" : "reviews"} ·{" "}
                    <Link href={`/admin/users/${u.id}/reviews`}>View reviews</Link>
                  </span>
                ) : (
                  <span>No reviews yet</span>
                ))}
              {u.refundsDue.map((b) => {
                const receipt = b.payments.find((p) => p.status === "success")?.mpesa_receipt;
                return (
                  <span key={b.id} className="err">
                    Refund due: {formatKes(b.amount_kes)} to {b.patient?.profile.full_name ?? "the patient"}
                    {receipt && ` (M-Pesa receipt ${receipt})`}: their consultation won&apos;t take place.
                  </span>
                );
              })}
            </div>
            <div className="item-actions">
              <span className={`tag ${u.role === "doctor" ? "booked" : u.role === "admin" ? "paying" : "free"}`}>{u.role}</span>
              {u.suspended && <span className="tag rejected">suspended</span>}
              {u.role !== "admin" && u.id !== me.id && (
                <ActionButton
                  action={setSuspended}
                  fields={{ userId: u.id, suspend: u.suspended ? "false" : "true" }}
                  label={u.suspended ? "Reactivate" : "Suspend"}
                  pendingLabel="Saving…"
                  className={u.suspended ? "btn btn-primary" : "btn btn-ghost"}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
