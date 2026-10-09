"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Counts down the 5-minute slot hold. When it reaches zero, the page reloads
// its data from the server, which then shows "hold expired".
export default function HoldTimer({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(timer);
        router.refresh();
      }
    };
    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [expiresAt, router]);

  if (secondsLeft === null) return null;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  return (
    <span className="tag paying" role="timer">
      Slot held for {minutes}:{seconds}
    </span>
  );
}
