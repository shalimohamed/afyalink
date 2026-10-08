import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import CheckForm from "./CheckForm";

export const metadata: Metadata = { title: "Check your symptoms · AfyaLink" };

export default async function CheckPage() {
  await requireRole("patient");

  return (
    <>
      <Link href="/patient" className="back">
        ← Dashboard
      </Link>
      <div className="eyebrow">Symptom checker</div>
      <h1>Describe your symptoms</h1>
      <p className="sub">
        We&apos;ll suggest possible conditions and the right type of doctor. This is <strong>not a diagnosis</strong>.
        Only a doctor can diagnose you.
      </p>

      <p className="notice bad">
        <strong>Emergency?</strong> If you have chest pain, trouble breathing, heavy bleeding, sudden weakness or
        confusion, have fainted, or have thoughts of harming yourself, don&apos;t use this. Go to the nearest hospital
        or call <strong>999 / 112</strong> now.
      </p>

      <CheckForm />
    </>
  );
}
