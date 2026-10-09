"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// While a request is waiting, reload the page as soon as the doctor answers
// (Realtime pushes the change to chat_requests).
export default function StatusWatcher({ chatId }: { chatId: string }) {
  const router = useRouter();
  const [supabase] = useState(createClient);

  useEffect(() => {
    let cancelled = false;
    const channel = supabase.channel(`chat-status-${chatId}`);
    (async () => {
      await supabase.auth.getSession();
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_requests", filter: `id=eq.${chatId}` }, () =>
          router.refresh(),
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [chatId, router, supabase]);

  return null;
}
