"use client";

import { useActionState, useState } from "react";
import { issuePrescription, type PrescriptionFormState } from "../../actions";

// Each row is one medicine. Rows get a stable id so React keeps the right
// inputs when a row in the middle is removed.
let nextRowId = 1;

export default function PrescriptionForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<PrescriptionFormState, FormData>(issuePrescription, {});
  const [rows, setRows] = useState<number[]>([0]);

  return (
    <form action={formAction} className="form slot-form">
      <input type="hidden" name="bookingId" value={bookingId} />

      <label className="field">
        <span>Diagnosis</span>
        <textarea name="diagnosis" rows={2} required />
      </label>

      <fieldset className="fieldset">
        <legend>Medicines</legend>
        {rows.map((rowId, index) => (
          <div key={rowId} className="med-row">
            <label className="field">
              <span>Medicine</span>
              <input name="medicine" placeholder="e.g. Amoxicillin" />
            </label>
            <label className="field">
              <span>Dosage</span>
              <input name="dosage" placeholder="500 mg" />
            </label>
            <label className="field">
              <span>How often</span>
              <input name="frequency" placeholder="3 times a day" />
            </label>
            <label className="field">
              <span>For how long</span>
              <input name="duration" placeholder="5 days" />
            </label>
            <label className="field">
              <span>Instructions</span>
              <input name="instructions" placeholder="After meals" />
            </label>
            {rows.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost remove"
                aria-label={`Remove medicine ${index + 1}`}
                onClick={() => setRows(rows.filter((id) => id !== rowId))}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={() => setRows([...rows, nextRowId++])}>
          + Add medicine
        </button>
      </fieldset>

      <label className="field">
        <span>Notes for the patient (optional)</span>
        <textarea name="notes" rows={3} placeholder="Advice, warning signs to watch for, when to follow up…" />
      </label>

      {state.error && <p className="notice bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Issuing…" : "Issue prescription"}
      </button>
    </form>
  );
}
