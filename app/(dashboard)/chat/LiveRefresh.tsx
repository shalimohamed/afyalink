"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Keeps the chats list up to date: reloads the page's data when a chat
// request or message arrives (Realtime only sends rows this user may see),
// and every 15 seconds as a safety net.
export default function LiveRefresh() {
  const router = useRouter();
  const [supabase] = useState(createClient);

  useEffect(() => {
    let cancelled = false;
    const channel = supabase.channel("chat-list");
    (async () => {
      const { data } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(data.session?.access_token);
      if (cancelled) return;
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_requests" }, () => router.refresh())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => router.refresh())
        .subscribe();
    })();
    const poll = setInterval(() => router.refresh(), 15000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return null;
}
