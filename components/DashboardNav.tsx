"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type NavLink = { href: string; label: string; exact?: boolean; chatBadge?: boolean };

// Unread messages sent to me, plus (for doctors) chat requests waiting for an answer.
async function countChatBadge(supabase: ReturnType<typeof createClient>, userId: string, isDoctor: boolean) {
  const unread = await supabase.rpc("unread_chat_messages");
  let total = typeof unread.data === "number" ? unread.data : 0;
  if (isDoctor) {
    const { count } = await supabase
      .from("chat_requests")
      .select("id", { count: "exact", head: true })
      .eq("doctor_id", userId)
      .eq("status", "pending");
    total += count ?? 0;
  }
  return total;
}

// The dashboard's menu. The current page is highlighted (aria-current="page").
// The Chats link carries a live badge. On phones it becomes a row of pills
// you can swipe sideways.
export default function DashboardNav({
  links,
  userId,
  isDoctor,
  initialChatBadge,
}: {
  links: NavLink[];
  userId: string;
  isDoctor: boolean;
  initialChatBadge: number;
}) {
  const pathname = usePathname();
  const isCurrent = (l: NavLink) => (l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`));
  const [badge, setBadge] = useState(initialChatBadge);
  const [supabase] = useState(createClient);

  // Keep the badge fresh: on page changes, when a chat is marked read, when a
  // message or request arrives (Realtime), and every 30 seconds as a safety net.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const total = await countChatBadge(supabase, userId, isDoctor);
      if (!cancelled) setBadge(total);
    };
    const channel = supabase.channel(`nav-badge-${userId}`);
    (async () => {
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token);
      if (cancelled) return;
      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_requests" }, refresh)
        .subscribe();
    })();
    const poll = setInterval(refresh, 30_000);
    const first = setTimeout(refresh, 0);
    window.addEventListener("afyalink:chat-read", refresh);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(first);
      window.removeEventListener("afyalink:chat-read", refresh);
      supabase.removeChannel(channel);
    };
  }, [pathname, supabase, userId, isDoctor]);

  return (
    <div className="dash-nav" role="navigation" aria-label="Dashboard">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={isCurrent(l) ? "page" : undefined}>
          {l.label}
          {l.chatBadge && badge > 0 ? (
            <span className="nav-badge" aria-label={`${badge} new`}>
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
