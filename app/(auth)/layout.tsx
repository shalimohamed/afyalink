import Link from "next/link";
import DemoNotice from "@/components/DemoNotice";

// Shared frame for /login, /register and the password reset pages. The (auth)
// folder is a "route group": the brackets keep it out of the URL, so pages
// stay at /login and /register.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap auth">
      <DemoNotice />
      <nav>
        <Link className="logo" href="/">
          <span className="mark" aria-hidden="true" />
          AfyaLink
        </Link>
      </nav>
      <main className="auth-main">{children}</main>
      <footer>
        <span>
          © 2026 AfyaLink · Nairobi, Kenya · <Link href="/privacy">Privacy policy</Link>
        </span>
        <span>AfyaLink doesn&apos;t replace emergency care. In an emergency call 999 or 112.</span>
      </footer>
    </div>
  );
}
