export type Urgency = "routine" | "within_24_hours" | "emergency";

export const URGENCIES: Urgency[] = ["routine", "within_24_hours", "emergency"];

export const URGENCY_LABELS: Record<Urgency, string> = {
  routine: "Routine",
  within_24_hours: "See a doctor within 24 hours",
  emergency: "Emergency",
};

// What the AI (or the keyword fallback) suggests for a set of symptoms.
export type SymptomAnalysis = {
  conditions: { name: string; explanation: string }[];
  specialty: string; // one of SPECIALTY_VALUES
  urgency: Urgency;
};
