"use client";

import "@livekit/components-styles";
import { LiveKitRoom, PreJoin, VideoConference, type LocalUserChoices } from "@livekit/components-react";
import { useState } from "react";

// The video call, using LiveKit's ready-made React components:
// 1. PreJoin: check your camera and microphone before going in.
// 2. LiveKitRoom + VideoConference: the call itself (video tiles, mute,
//    camera on/off, screen share, in-call chat, leave).
export default function VideoCall({ serverUrl, token, displayName }: { serverUrl: string; token: string; displayName: string }) {
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [left, setLeft] = useState(false);

  if (left) {
    return (
      <div className="notice ok">
        You left the call.{" "}
        <button
          className="btn btn-ghost"
          onClick={() => {
            setLeft(false);
            setChoices(null);
          }}
        >
          Rejoin
        </button>
      </div>
    );
  }

  return (
    <div className="video-call" data-lk-theme="default">
      {choices ? (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect
          video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
          audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
          onDisconnected={() => setLeft(true)}
          style={{ height: "100%" }}
        >
          <VideoConference />
        </LiveKitRoom>
      ) : (
        <PreJoin
          defaults={{ username: displayName, videoEnabled: true, audioEnabled: true }}
          persistUserChoices={false}
          joinLabel="Join consultation"
          userLabel="Your name"
          onSubmit={setChoices}
        />
      )}
    </div>
  );
}
