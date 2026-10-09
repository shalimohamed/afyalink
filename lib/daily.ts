import "server-only";

// Daily.co video API. Each confirmed booking gets one PRIVATE room: nobody can
// join without a meeting token, and tokens are only made by our server for
// the booking's patient and doctor.

const API = "https://api.daily.co/v1";

export const OPENS_BEFORE_MIN = 15; // the room opens 15 minutes before the slot
export const CLOSES_AFTER_MIN = 30; // and closes 30 minutes after it ends

async function daily<T>(path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

const toUnix = (iso: string, minutesOffset: number) => Math.floor(new Date(iso).getTime() / 1000) + minutesOffset * 60;

// Creates the room for a booking (or returns it if it already exists) and
// gives back its URL, e.g. https://afyalink-team.daily.co/consult-<booking id>.
export async function createRoom(bookingId: string, startsAt: string, endsAt: string): Promise<string> {
  const name = `consult-${bookingId}`;
  const created = await daily<{ url?: string; info?: string }>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        nbf: toUnix(startsAt, -OPENS_BEFORE_MIN), // "not before"
        exp: toUnix(endsAt, CLOSES_AFTER_MIN), // expires
        eject_at_room_exp: true,
        enable_prejoin_ui: true, // lets people check camera and mic first
        enable_chat: true,
        enable_screenshare: true,
        max_participants: 4,
      },
    }),
  });
  if (created.ok && created.data.url) return created.data.url;

  // Already created earlier (e.g. by the callback): look it up instead.
  const existing = await daily<{ url?: string }>(`/rooms/${name}`);
  if (existing.ok && existing.data.url) return existing.data.url;
  throw new Error(`Daily room creation failed: ${created.status} ${JSON.stringify(created.data)}`);
}

// A short-lived pass into one room. The doctor is the "owner" (can remove
// people, end the call for everyone).
export async function createMeetingToken({
  roomUrl,
  userName,
  isOwner,
  endsAt,
}: {
  roomUrl: string;
  userName: string;
  isOwner: boolean;
  endsAt: string;
}): Promise<string> {
  const roomName = new URL(roomUrl).pathname.slice(1);
  const res = await daily<{ token?: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: { room_name: roomName, user_name: userName, is_owner: isOwner, exp: toUnix(endsAt, CLOSES_AFTER_MIN) },
    }),
  });
  if (!res.ok || !res.data.token) throw new Error(`Daily token failed: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data.token;
}
