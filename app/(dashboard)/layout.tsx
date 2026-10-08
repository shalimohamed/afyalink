import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";

// Shared frame for the patient, doctor and admin dashboards. Each page checks
// the user's role itself with requireRole().
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap auth">
      <nav>
        <Link className="logo" href="/">
          <span className="mark" aria-hidden="true" />
          AfyaLink
        </Link>
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
