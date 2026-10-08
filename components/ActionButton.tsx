"use client";

import { useActionState } from "react";

export type ActionResult = { error?: string };
type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

// A one-button form that runs a server action and shows its error message.
// `fields` become hidden inputs (e.g. the ID of the row to change). With
// `input`, a short text box is shown before the button (e.g. a rejection reason).
export default function ActionButton({
  action,
  fields,
  label,
  pendingLabel = "Saving…",
  className = "btn btn-ghost",
  input,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  className?: string;
  input?: { name: string; placeholder: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="inline-form">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {input && <input name={input.name} placeholder={input.placeholder} aria-label={input.placeholder} />}
      <button className={className} disabled={pending}>
        {pending ? pendingLabel : label}
      </button>
      {state.error && (
        <small className="err" role="alert">
          {state.error}
        </small>
      )}
    </form>
  );
}
