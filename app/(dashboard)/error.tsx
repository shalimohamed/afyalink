"use client"; // Error boundaries must be Client Components

import Link from "next/link";

// Shown inside the dashboard (the menu stays) when a dashboard page crashes,
// e.g. the database didn't answer. See app/error.tsx about the reference code.
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <>
      <div className="eyebrow">Something went wrong</div>
      <h1>Sorry, this page didn&apos;t load</h1>
      <p className="sub">Please try again. If it keeps happening, go back to your dashboard and try again in a few minutes.</p>
      <div className="item-actions">
        <button className="btn btn-primary" onClick={() => retry()}>
          Try again
        </button>
        {/* "/" sends logged-in users to their own dashboard (see proxy.ts). */}
        <Link href="/" className="btn btn-ghost">
          My dashboard
        </Link>
      </div>
      {digest && <p className="empty">Reference: {digest}</p>}
    </>
  );
}
