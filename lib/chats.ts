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
  patient_last_read_at?: string | null; // added by migration 0006
  doctor_last_read_at?: string | null;
  patient: { profile: { full_name: string } } | null;
  doctor: { profile: { full_name: string } } | null;
  messages?: { body: string; sender_id: string; created_at: string }[];
};

export type Chat = Row & {
  state: ChatState;
  closesAt: string | null;
  lastMessage: { body: string; sender_id: string; created_at: string } | null;
  // For the logged-in user: the newest message is from the other person and
  // arrived after they last opened the chat.
  unread: boolean;
  // For the logged-in user: they haven't opened the chat since it was
  // accepted (or rejected) or since the latest message.
  needsAttention: boolean;
};

const SELECT =
  "id, status, created_at, responded_at, patient_id, doctor_id, " +
  "patient:patients(profile:profiles(full_name)), doctor:doctors(profile:profiles!doctors_id_fkey(full_name))";
const READ_COLUMNS = ", patient_last_read_at, doctor_last_read_at";

function shape(row: Row, now: number, userId: string | undefined): Chat {
  const closesAt = row.responded_at ? new Date(new Date(row.responded_at).getTime() + CHAT_WINDOW_MS) : null;
  let state: ChatState = "waiting";
  if (row.status === "rejected") state = "rejected";
  else if (row.status === "accepted") state = closesAt && closesAt.getTime() > now ? "open" : "closed";

  const lastMessage = row.messages?.[0] ?? null;
  // Without migration 0006 there are no read times: treat everything as read.
  const tracking = row.patient_last_read_at !== undefined;
  const lastRead = userId === row.doctor_id ? row.doctor_last_read_at : row.patient_last_read_at;
  const unread = tracking && Boolean(lastMessage && lastMessage.sender_id !== userId && (!lastRead || lastMessage.created_at > lastRead));
  const answeredUnseen = tracking && Boolean(row.responded_at && (!lastRead || row.responded_at > lastRead));

  return { ...row, state, closesAt: closesAt?.toISOString() ?? null, lastMessage, unread, needsAttention: unread || answeredUnseen };
}

// Runs a chat_requests query with the read times, or without them if
// migration 0006 hasn't been run yet.
async function selectWithReadTimes<T>(run: (columns: string) => PromiseLike<{ data: T | null; error: unknown }>) {
  const first = await run(SELECT + READ_COLUMNS);
  return first.error ? run(SELECT) : first;
}

// The logged-in user's chat requests (RLS: only their own) with each chat's
// newest message, most recent activity first.
export async function loadChats(supabase: SupabaseClient, userId?: string): Promise<Chat[]> {
  const now = Date.now();
  const { data } = await selectWithReadTimes((columns) =>
    supabase
      .from("chat_requests")
      .select(`${columns}, messages(body, sender_id, created_at)`)
      .order("created_at", { referencedTable: "messages", ascending: false })
      .limit(1, { referencedTable: "messages" }),
  );
  const activity = (chat: Chat) => chat.lastMessage?.created_at ?? chat.responded_at ?? chat.created_at;
  return ((data ?? []) as unknown as Row[])
    .map((row) => shape(row, now, userId))
    .sort((a, b) => activity(b).localeCompare(activity(a)));
}

export async function loadChat(supabase: SupabaseClient, chatId: string, userId?: string): Promise<Chat | null> {
  const now = Date.now();
  const { data } = await selectWithReadTimes((columns) => supabase.from("chat_requests").select(columns).eq("id", chatId).maybeSingle());
  return data ? shape(data as unknown as Row, now, userId) : null;
}
