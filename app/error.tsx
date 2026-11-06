"use client"; // Error boundaries must be Client Components

import Link from "next/link";

// Shown instead of a page that crashed (the landing, login and register pages;
// the dashboards have their own in app/(dashboard)/error.tsx). In production,
// Next.js doesn't send the error's details to the browser, only a reference
// code ("digest") that matches the full error in the server logs (Vercel → Logs).
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

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
          <div className="eyebrow">Something went wrong</div>
          <h1>Sorry, this page didn&apos;t load</h1>
          <p className="sub">Please try again. If it keeps happening, try again in a few minutes.</p>
          <div className="item-actions">
            <button className="btn btn-primary" onClick={() => retry()}>
              Try again
            </button>
            <Link href="/" className="btn btn-ghost">
              Go to AfyaLink
            </Link>
          </div>
          {digest && <p className="empty">Reference: {digest}</p>}
        </div>
      </main>
    </div>
  );
}
