"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/components/ActionButton";
import { startPayment } from "../actions";

export default function PayForm({ bookingId, defaultPhone, label }: { bookingId: string; defaultPhone: string; label: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(startPayment, {});

  return (
    <form action={formAction} className="form slot-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="field">
        <span>M-Pesa phone number</span>
        <input name="phone" type="tel" inputMode="tel" defaultValue={defaultPhone} required />
        <small>You&apos;ll get a prompt on this phone. Enter your M-Pesa PIN to pay.</small>
      </label>
      {state.error && <p className="notice bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Sending prompt…" : label}
      </button>
    </form>
  );
}
