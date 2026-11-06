import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found · AfyaLink" };

// Shown for addresses that don't exist, and when a page calls notFound()
// (e.g. a booking that isn't yours).
export default function NotFound() {
  return (
    <div className="wrap auth">
      <nav>
        <Link className="logo" href="/">
          <span className="mark" aria-hidden="true" />
          AfyaLink
        </Link>
      </nav>
      <main className="auth-main">
        <div className="auth-card narrow">
          <div className="eyebrow">404</div>
          <h1>Page not found</h1>
          <p className="sub">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
          {/* "/" sends logged-in users to their own dashboard (see proxy.ts). */}
          <Link href="/" className="btn btn-primary">
            Go to AfyaLink
          </Link>
        </div>
      </main>
    </div>
  );
}
