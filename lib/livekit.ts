import "server-only";
import { AccessToken } from "livekit-server-sdk";

// LiveKit Cloud video (free "Build" plan: 5,000 minutes a month, no card).
// Each paid booking has its own room, "consult-<booking id>". LiveKit creates
// it automatically when the first person joins. Nobody can join without an
// access token, and only our server can make tokens (it needs the API
// secret), so only the booking's patient and doctor can get in.

export const OPENS_BEFORE_MIN = 15; // the call opens 15 minutes before the slot
export const CLOSES_AFTER_MIN = 30; // and tokens stop working 30 minutes after it ends

export const roomNameFor = (bookingId: string) => `consult-${bookingId}`;

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
