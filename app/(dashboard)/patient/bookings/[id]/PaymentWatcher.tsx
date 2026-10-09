"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While an M-Pesa prompt is waiting for the patient, reload the page's data
// every 4 seconds, so the page changes to "confirmed" as soon as Safaricom's
// callback has been saved.
export default function PaymentWatcher() {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
