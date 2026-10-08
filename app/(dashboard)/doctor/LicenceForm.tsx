"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/components/ActionButton";
import { uploadLicence } from "./actions";

export default function LicenceForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(uploadLicence, {});

  return (
    <form action={formAction} className="form panel">
      <label className="field">
        <span>Registration certificate</span>
        <input name="licence" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
        <small>PDF, JPG or PNG, up to 4 MB</small>
      </label>
      {state.error && <p className="notice bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Uploading…" : "Upload certificate"}
      </button>
    </form>
  );
}
