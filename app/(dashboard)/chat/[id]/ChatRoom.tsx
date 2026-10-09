"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Message = { id: string; sender_id: string; body: string; created_at: string };

const timeFormat = new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false });

// Live chat. New messages arrive through Supabase Realtime: the database
// pushes each new row in `messages` to the browser, and row-level security
// makes sure only the two people in this chat receive them.
export default function ChatRoom({
  chatId,
  myId,
  initialMessages,
  closesAt,
}: {
  chatId: string;
  myId: string;
  initialMessages: Message[];
  closesAt: string | null; // null = chat isn't open (history only)
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(closesAt !== null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(createClient);

  // Listen for new messages in this chat.
  useEffect(() => {
    let cancelled = false;
    const channel = supabase.channel(`chat-${chatId}`);
    (async () => {
      await supabase.auth.getSession(); // load the login so Realtime can check RLS
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `chat_request_id=eq.${chatId}` },
          (payload) => {
            const message = payload.new as Message;
            setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [chatId, supabase]);

  // Close the chat box when the 3 hours run out.
  useEffect(() => {
    if (!closesAt) return;
    const msLeft = new Date(closesAt).getTime() - Date.now();
    const timer = setTimeout(() => {
      setIsOpen(false);
      router.refresh();
    }, Math.max(0, msLeft));
    return () => clearTimeout(timer);
  }, [closesAt, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    // RLS only accepts the message while the chat is open (chat_is_open()).
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ chat_request_id: chatId, sender_id: myId, body })
      .select("id, sender_id, body, created_at")
      .single<Message>();
    setSending(false);
    if (insertError || !data) {
      setError("Your message wasn't sent. The chat may have closed.");
      router.refresh();
      return;
    }
    setDraft("");
    setMessages((current) => (current.some((m) => m.id === data.id) ? current : [...current, data]));
  }

  return (
    <div className="chat">
      <div className="chat-log" aria-live="polite">
        {messages.length === 0 && <p className="empty">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.sender_id === myId ? "mine" : ""}`}>
            <span>{m.body}</span>
            <small>{timeFormat.format(new Date(m.created_at))}</small>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isOpen && (
        <form onSubmit={send} className="chat-form">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            placeholder="Type a message"
            aria-label="Message"
          />
          <button className="btn btn-primary" disabled={sending || !draft.trim()}>
            Send
          </button>
        </form>
      )}
      {error && <p className="notice bad">{error}</p>}
    </div>
  );
}
