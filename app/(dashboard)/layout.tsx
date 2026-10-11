import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";
import DashboardNav, { type NavLink } from "@/components/DashboardNav";
import { HOME_FOR_ROLE, requireUser } from "@/lib/auth";

// Shared frame for the patient, doctor and admin dashboards, with a menu for
// the user's role. Each page still checks the role itself with requireRole().
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();

  let links: NavLink[];
  if (profile.role === "doctor") {
    // Show how many follow-up chat requests are waiting for an answer.
    const { count } = await supabase
      .from("chat_requests")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", profile.id)
      .eq("status", "pending");
    links = [
      { href: "/doctor", label: "Dashboard", exact: true },
      { href: "/doctor/slots", label: "Availability" },
      { href: "/doctor/consultations", label: "Consultations" },
      { href: "/chat", label: "Chats", badge: count ?? 0 },
    ];
  } else if (profile.role === "admin") {
    links = [
      { href: "/admin", label: "Overview", exact: true },
      { href: "/admin/doctors", label: "Verify doctors" },
      { href: "/admin/users", label: "Users" },
    ];
  } else {
    links = [
      { href: "/patient", label: "Dashboard", exact: true },
      { href: "/patient/check", label: "Check symptoms" },
      { href: "/patient/doctors", label: "Find a doctor" },
      { href: "/patient/bookings", label: "Consultations" },
      { href: "/chat", label: "Chats" },
      { href: "/patient/history", label: "History" },
    ];
  }

  return (
    <div className="wrap auth">
      <nav className="dash-top-nav">
        <Link className="logo" href={HOME_FOR_ROLE[profile.role]}>
          <span className="mark" aria-hidden="true" />
          AfyaLink
        </Link>
        <DashboardNav links={links} />
        <form action={logout}>
          <button className="btn btn-ghost">Log out</button>
        </form>
      </nav>
      <main className="dash">{children}</main>
      <footer>
        <span>© 2026 AfyaLink · Nairobi, Kenya</span>
        <span>AfyaLink doesn&apos;t replace emergency care. In an emergency call 999 or 112.</span>
      </footer>
    </div>
  );
}
