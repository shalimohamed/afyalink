import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import CheckForm from "./CheckForm";

export const metadata: Metadata = { title: "Check your symptoms · AfyaLink" };

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ symptoms?: string }> }) {
  await requireRole("patient");
  // Symptoms picked on the dashboard's body map arrive in the address.
  const { symptoms = "" } = await searchParams;

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

      <p className="notice ok">
        <strong>Please use made-up symptoms.</strong> AfyaLink is a student demo, and the AI behind it is Google
        Gemini&apos;s free tier: Google may use what you type to improve its products.
      </p>

      <p className="notice bad">
        <strong>Emergency?</strong> If you have chest pain, trouble breathing, heavy bleeding, sudden weakness or
        confusion, have fainted, or have thoughts of harming yourself, don&apos;t use this. Go to the nearest hospital
        or call <strong>999 / 112</strong> now.
      </p>

      <CheckForm initialSymptoms={symptoms.slice(0, 2000)} />
    </>
  );
}
