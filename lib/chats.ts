import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_WINDOW_MS = 3 * 60 * 60 * 1000; // an accepted chat stays open 3 hours

// "waiting": the doctor hasn't answered. "open": accepted and within 3 hours.
// "closed": accepted but the 3 hours are over. "rejected": the doctor said no.
export type ChatState = "waiting" | "open" | "closed" | "rejected";

type Row = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
  patient_id: string;
  doctor_id: string;
  patient: { profile: { full_name: string } } | null;
  doctor: { profile: { full_name: string } } | null;
  messages?: { body: string; sender_id: string; created_at: string }[];
};

export type Chat = Row & {
  state: ChatState;
  closesAt: string | null;
  lastMessage: { body: string; sender_id: string; created_at: string } | null;
};

const SELECT =
  "id, status, created_at, responded_at, patient_id, doctor_id, " +
  "patient:patients(profile:profiles(full_name)), doctor:doctors(profile:profiles!doctors_id_fkey(full_name))";

function shape(row: Row, now: number): Chat {
  const closesAt = row.responded_at ? new Date(new Date(row.responded_at).getTime() + CHAT_WINDOW_MS) : null;
  let state: ChatState = "waiting";
  if (row.status === "rejected") state = "rejected";
  else if (row.status === "accepted") state = closesAt && closesAt.getTime() > now ? "open" : "closed";
  return { ...row, state, closesAt: closesAt?.toISOString() ?? null, lastMessage: row.messages?.[0] ?? null };
}

// The logged-in user's chat requests (RLS: only their own) with each chat's
// newest message, most recent activity first.
export async function loadChats(supabase: SupabaseClient): Promise<Chat[]> {
  const now = Date.now();
  const { data } = await supabase
    .from("chat_requests")
    .select(`${SELECT}, messages(body, sender_id, created_at)`)
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
  const activity = (chat: Chat) => chat.lastMessage?.created_at ?? chat.responded_at ?? chat.created_at;
  return ((data ?? []) as unknown as Row[])
    .map((row) => shape(row, now))
    .sort((a, b) => activity(b).localeCompare(activity(a)));
}

export async function loadChat(supabase: SupabaseClient, chatId: string): Promise<Chat | null> {
  const now = Date.now();
  const { data } = await supabase.from("chat_requests").select(SELECT).eq("id", chatId).maybeSingle();
  return data ? shape(data as unknown as Row, now) : null;
}
