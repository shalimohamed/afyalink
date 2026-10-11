"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/components/ActionButton";
import { submitReview } from "../actions";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);

  return (
    <form action={formAction} className="form slot-form">
      <input type="hidden" name="bookingId" value={bookingId} />
      <fieldset className="stars">
        <legend>How was your consultation?</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= rating ? "on" : ""}>
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} required />
            <span aria-hidden="true">★</span>
            <span className="sr-only">
              {n} star{n > 1 ? "s" : ""}: {LABELS[n]}
            </span>
          </label>
        ))}
        {rating > 0 && <small>{LABELS[rating]}</small>}
      </fieldset>
      <label className="field">
        <span>Comment (optional)</span>
        <textarea name="comment" rows={3} maxLength={1000} placeholder="What went well? What could be better?" />
        <small>Other patients see your rating and comment, but not your name.</small>
      </label>
      {state.error && <p className="notice bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending || rating === 0}>
        {pending ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}
