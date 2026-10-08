"use client";

import { useActionState } from "react";
import { checkSymptoms, type CheckState } from "./actions";

export default function CheckForm() {
  const [state, formAction, pending] = useActionState<CheckState, FormData>(checkSymptoms, {});

  return (
    <form action={formAction} className="form slot-form">
      <label className="field">
        <span>How are you feeling?</span>
        <textarea
          name="symptoms"
          rows={6}
          maxLength={2000}
          defaultValue={state.symptoms}
          placeholder="For example: I've had an itchy red rash on my arms for a week. It gets worse at night."
          required
        />
        <small>Include what you feel, where, for how long, and anything that makes it better or worse.</small>
      </label>
      {state.error && <p className="notice bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Checking your symptoms…" : "Check my symptoms"}
      </button>
    </form>
  );
}
