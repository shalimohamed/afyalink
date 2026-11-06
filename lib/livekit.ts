import "server-only";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import type { Consultation } from "@/lib/consultations";

// LiveKit Cloud video (free "Build" plan: 5,000 minutes a month, no card).
// Each paid booking has its own room, "consult-<booking id>". LiveKit creates
// it automatically when the first person joins. Nobody can join without an
// access token, and only our server can make tokens (it needs the API
// secret), so only the booking's patient and doctor can get in.

export const OPENS_BEFORE_MIN = 15; // the call opens 15 minutes before the slot
export const CLOSES_AFTER_MIN = 30; // and tokens stop working 30 minutes after it ends

export const roomNameFor = (bookingId: string) => `consult-${bookingId}`;

// Whether the call can be joined. While the time window is open, always,
// until the doctor issues the prescription, which ends the CONSULTATION. The
// call itself isn't cut off: whoever is in it stays, and someone who drops out
// can rejoin while the other person is still there. Once both have left, the
// call is over too. Never if an admin has suspended the doctor.
export async function canJoinCall(consultation: Pick<Consultation, "id" | "callWindow" | "prescription" | "doctorSuspended">) {
  if (consultation.doctorSuspended || consultation.callWindow !== "open") return false;
  if (!consultation.prescription) return true;
  return someoneInCall(consultation.id);
}

// Asks LiveKit's server API who is in the consultation's room right now.
async function someoneInCall(bookingId: string): Promise<boolean> {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return false;
  // The browser connects with wss://…; the server API is the same address over https://.
  const rooms = new RoomServiceClient(LIVEKIT_URL.replace(/^ws/, "http"), LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  try {
    return (await rooms.listParticipants(roomNameFor(bookingId))).length > 0;
  } catch (error) {
    // LiveKit closes a room shortly after the last person leaves, and asking
    // about a closed room fails with "not found": nobody is in the call.
    if ((error as { status?: number }).status === 404) return false;
    // Any other problem: don't lock people out just because LiveKit didn't answer.
    console.error("Checking who is in the video call failed:", error);
    return true;
  }
}

export async function createVideoToken({
  bookingId,
  userId,
  displayName,
  isDoctor,
  endsAt,
}: {
  bookingId: string;
  userId: string;
  displayName: string;
  isDoctor: boolean;
  endsAt: string;
}): Promise<string> {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) throw new Error("LiveKit keys are missing from .env.local");

  // Valid from now until 30 minutes after the consultation ends.
  const secondsLeft = Math.max(60, Math.round((new Date(endsAt).getTime() + CLOSES_AFTER_MIN * 60_000 - Date.now()) / 1000));

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: displayName,
    ttl: secondsLeft,
  });
  token.addGrant({
    room: roomNameFor(bookingId),
    roomJoin: true,
    canPublish: true, // send camera and microphone
    canSubscribe: true, // see and hear the other person
    canPublishData: true, // in-call chat
    roomAdmin: isDoctor, // the doctor can remove participants
  });
  return token.toJwt();
}
