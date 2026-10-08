"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { keywordFallback } from "@/lib/symptoms/fallback";
import { analyseWithAI } from "@/lib/symptoms/gemini";
import { findRedFlags } from "@/lib/symptoms/redFlags";
import type { SymptomAnalysis } from "@/lib/symptoms/types";

export type CheckState = { error?: string; symptoms?: string };

export async function checkSymptoms(_prev: CheckState, formData: FormData): Promise<CheckState> {
  const { supabase, profile } = await requireRole("patient");
  const symptoms = String(formData.get("symptoms") ?? "").trim();

  if (symptoms.length < 10) return { error: "Please describe your symptoms in a few more words.", symptoms };
  if (symptoms.length > 2000) return { error: "Please keep it under 2,000 characters.", symptoms };

  // 1. Red-flag rules run first. If one matches, the AI isn't asked at all.
  const redFlagTriggered = findRedFlags(symptoms).length > 0;

  // 2. Otherwise ask the AI, and fall back to keywords if it's unavailable.
  let analysis: SymptomAnalysis | null = null;
  if (!redFlagTriggered) {
    analysis = (await analyseWithAI(symptoms)) ?? keywordFallback(symptoms);
  }

  // 3. Save the check to the patient's medical history.
  const { data: check, error } = await supabase
    .from("symptom_checks")
    .insert({
      patient_id: profile.id,
      symptoms,
      red_flag_triggered: redFlagTriggered,
      urgency: analysis?.urgency ?? "emergency",
      suggested_specialty_id: analysis?.specialty ?? null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !check) {
    console.error("Saving symptom check failed:", error);
    return { error: "Something went wrong. Please try again.", symptoms };
  }

  if (analysis && analysis.conditions.length > 0) {
    const { error: conditionsError } = await supabase.from("symptom_check_conditions").insert(
      analysis.conditions.map((c, i) => ({
        symptom_check_id: check.id,
        rank: i + 1,
        condition_name: c.name,
        explanation: c.explanation,
      })),
    );
    if (conditionsError) console.error("Saving conditions failed:", conditionsError);
  }

  redirect(`/patient/check/${check.id}`);
}
