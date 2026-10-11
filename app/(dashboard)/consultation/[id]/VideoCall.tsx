"use client";

import "@livekit/components-styles";
import { LiveKitRoom, PreJoin, VideoConference, type LocalUserChoices } from "@livekit/components-react";
import { useState, useSyncExternalStore } from "react";

// Turns browser camera/microphone errors into instructions a patient can follow.
function explainMediaError(error: Error | undefined): string {
  switch (error?.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera or microphone access is blocked. Tap the lock icon (🔒) next to the web address → Permissions (Site settings) → allow Camera and Microphone, then reload this page.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera or microphone was found on this device. You can still join with them turned off.";
    case "NotReadableError":
    case "TrackStartError":
      return "Your camera or microphone is being used by another app or browser tab. Close it, then reload this page.";
    default:
      return "We couldn't start your camera or microphone. You can still join with them turned off, or reload the page to try again.";
  }
}

// The video call, using LiveKit's ready-made React components:
// 1. PreJoin: check your camera and microphone before going in.
// 2. LiveKitRoom + VideoConference: the call itself (video tiles, mute,
//    camera on/off, screen share, in-call chat, leave).
export default function VideoCall({ serverUrl, token, displayName }: { serverUrl: string; token: string; displayName: string }) {
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [left, setLeft] = useState(false);
  const [problem, setProblem] = useState("");

  // Some browsers can't use the camera at all: pages that aren't https, and
  // the built-in browsers of apps like WhatsApp or Gmail. This can only be
  // checked in the browser; on the server we assume it's fine.
  const unsupported = useSyncExternalStore(
    () => () => {}, // nothing to subscribe to: this doesn't change while the page is open
    () => !(window.isSecureContext && Boolean(navigator.mediaDevices?.getUserMedia)),
    () => false,
  );

  if (unsupported) {
    return (
      <div className="notice bad" role="alert">
        <strong>This browser can&apos;t use your camera or microphone.</strong> If you opened this link from WhatsApp, Gmail
        or another app, open it in your phone&apos;s main browser instead: tap the menu (⋮ or the share icon) →{" "}
        <strong>Open in Chrome</strong> (Android) or <strong>Open in Safari</strong> (iPhone). The address must start with{" "}
        <code>https://</code>.
      </div>
    );
  }

  if (left) {
    return (
      <div className="notice ok">
        You left the call.{" "}
        <button
          className="btn btn-ghost"
          onClick={() => {
            setLeft(false);
            setChoices(null);
            setProblem("");
          }}
        >
          Rejoin
        </button>
      </div>
    );
  }

  return (
    <>
      {problem && (
        <p className="notice bad" role="alert">
          {problem}
        </p>
      )}
      <div className="video-call" data-lk-theme="default">
        {choices ? (
          <LiveKitRoom
            serverUrl={serverUrl}
            token={token}
            connect
            video={choices.videoEnabled ? { deviceId: choices.videoDeviceId } : false}
            audio={choices.audioEnabled ? { deviceId: choices.audioDeviceId } : false}
            onDisconnected={() => setLeft(true)}
            onError={(error) => {
              console.error("Video call error:", error);
              setProblem("The video call had a problem connecting. Check your internet connection and reload the page.");
            }}
            onMediaDeviceFailure={() =>
              setProblem("Your camera or microphone didn't start. Use the buttons at the bottom of the call to try again, or reload the page.")
            }
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
            onError={(error) => setProblem(explainMediaError(error))}
            onSubmit={setChoices}
          />
        )}
      </div>
    </>
  );
}
