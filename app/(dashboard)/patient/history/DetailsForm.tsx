"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/components/ActionButton";
import { BLOOD_GROUPS } from "@/lib/bloodGroups";
import { updateDetails } from "./actions";

type State = ActionResult & { saved?: boolean };

async function save(prev: State, formData: FormData): Promise<State> {
  const result = await updateDetails(prev, formData);
  return { ...result, saved: !result.error };
}

export default function DetailsForm({
  dateOfBirth,
  sex,
  bloodGroup,
  phone,
  today,
}: {
  dateOfBirth: string | null;
  sex: string | null;
  bloodGroup: string | null;
  phone: string;
  today: string;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(save, {});

  return (
    <form action={formAction} className="form slot-form">
      <div className="row3">
        <label className="field">
          <span>Date of birth</span>
          <input name="dateOfBirth" type="date" max={today} defaultValue={dateOfBirth ?? ""} />
        </label>
        <label className="field">
          <span>Sex</span>
          <select name="sex" defaultValue={sex ?? ""}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="field">
          <span>Blood group</span>
          <select name="bloodGroup" defaultValue={bloodGroup ?? ""}>
            <option value="">I don&apos;t know</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>M-Pesa phone number</span>
        <input name="phone" type="tel" inputMode="tel" defaultValue={phone} placeholder="0712 345 678" />
      </label>
      <small className="empty">
        Your date of birth and sex appear on prescriptions so the pharmacist can check them. The doctors you book also see
        them, with your blood group.
      </small>
      {state.error && <p className="notice bad">{state.error}</p>}
      {state.saved && !pending && <p className="notice ok">Saved.</p>}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
