"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Chrome's install event (not in TypeScript's built-in types yet).
type InstallEvent = Event & { prompt: () => Promise<void> };

const DISMISSED_KEY = "afyalink:install-dismissed";
const nothingToWatch = () => () => {};

// iPhones and iPads have no install button: you add the site from Safari's
// Share menu. Only show that hint in the browser, not in the installed app.
function needsIosHint() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return ios && !installed;
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false; // private mode or blocked storage: just show it
  }
}

// A small "install AfyaLink" bar on the dashboards. On Android and desktop
// Chrome it uses the browser's own install prompt; on an iPhone it explains
// the Share → Add to Home Screen steps. "Not now" hides it on this device.
export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  // Read in the browser only (the server can't know), like VideoCall does.
  const iosHint = useSyncExternalStore(nothingToWatch, needsIosHint, () => false);
  const dismissed = useSyncExternalStore(nothingToWatch, wasDismissed, () => true);

  useEffect(() => {
    // Chrome fires this when the app can be installed. We keep the event so
    // our own button can show the install prompt later.
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || dismissed || (!installEvent && !iosHint)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // nothing to do: it's hidden for this visit anyway
    }
  };

  return (
    <div className="install-bar" role="region" aria-label="Install AfyaLink">
      <span className="mark" aria-hidden="true" />
      <p>
        {installEvent ? (
          "Install AfyaLink on this device to open it like an app."
        ) : (
          <>
            Add AfyaLink to your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b>.
          </>
        )}
      </p>
      <div className="install-actions">
        {installEvent && (
          <button
            className="btn btn-primary"
            onClick={async () => {
              await installEvent.prompt();
              setInstallEvent(null);
            }}
          >
            Install
          </button>
        )}
        <button className="btn btn-ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
