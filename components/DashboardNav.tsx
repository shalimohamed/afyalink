"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string; badge?: number; exact?: boolean };

// The dashboard's menu. The current page is highlighted (aria-current="page").
// On phones it becomes a row of pills you can swipe sideways.
export default function DashboardNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const isCurrent = (l: NavLink) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`));

  return (
    <div className="dash-nav" role="navigation" aria-label="Dashboard">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={isCurrent(l) ? "page" : undefined}>
          {l.label}
          {l.badge ? (
            <span className="nav-badge" aria-label={`${l.badge} waiting`}>
              {l.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
