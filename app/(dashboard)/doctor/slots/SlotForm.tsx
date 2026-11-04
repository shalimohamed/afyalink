"use client";

import { useActionState, useState } from "react";
import { formatKes, SLOT_LENGTHS, slotPrice } from "@/lib/time";
import { addSlots, type SlotFormState } from "./actions";

export default function SlotForm({
  today,
  feeType,
  feeKes,
}: {
  today: string;
  feeType: "per_session" | "per_hour";
  feeKes: number;
}) {
  const [state, formAction, pending] = useActionState<SlotFormState, FormData>(addSlots, {});
  const [minutes, setMinutes] = useState(30);

  return (
    <form action={formAction} className="form slot-form">
      <div className="row3">
        <label className="field">
          <span>Date</span>
          <input name="date" type="date" min={today} defaultValue={today} required />
        </label>
        <label className="field">
          <span>Start time (Kenyan time)</span>
          {/* step is in seconds: 300 = start times in 5-minute steps (09:00, 09:05, 09:10…) */}
          <input name="time" type="time" step={300} defaultValue="09:00" required />
        </label>
        <label className="field">
          <span>Length</span>
          <select name="minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {SLOT_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Repeat</span>
        <select name="repeat" defaultValue="once">
          <option value="once">Just this day</option>
          <option value="next5days">Same time for 5 days in a row</option>
          <option value="weekly4">Same time every week for 4 weeks</option>
        </select>
        <small>Patients pay {formatKes(slotPrice(feeType, feeKes, minutes))} for each slot.</small>
      </label>

      {state.error && <p className="notice bad">{state.error}</p>}
      {state.message && <p className="notice ok">{state.message}</p>}

      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add slot"}
      </button>
    </form>
  );
}
