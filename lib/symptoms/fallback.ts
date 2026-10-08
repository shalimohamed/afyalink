import type { SymptomAnalysis } from "./types";

// Used only when the AI is unavailable (e.g. the free daily limit is used
// up), so the checker still suggests a type of doctor. It can't name
// conditions, so it returns none, and the results page says so.
const KEYWORDS: { specialty: string; words: RegExp }[] = [
  { specialty: "paediatrics", words: /\b(baby|babies|infant|toddler|my (son|daughter|child|kid)|child'?s|newborn)\b/ },
  { specialty: "gynaecology", words: /period|menstrua|pregnan|vagina|discharge|contracept|pcos|pelvic|miscarr/ },
  { specialty: "psychiatry", words: /hallucinat|hearing voices|bipolar|psychosis|schizo|antidepressant/ },
  { specialty: "psychology", words: /anxi|depress|stress|panic|lonely|grief|sad\b|can'?t sleep|insomnia|mood|overwhelm/ },
  { specialty: "dermatology", words: /skin|rash|itch|acne|pimple|eczema|hives|ringworm|hair loss|dandruff|mole|spots/ },
  { specialty: "ent", words: /\bear|throat|tonsil|sinus|nose|nasal|hearing|hoarse|swallow/ },
];

export function keywordFallback(symptoms: string): SymptomAnalysis {
  const text = symptoms.toLowerCase();
  const match = KEYWORDS.find((k) => k.words.test(text));
  // Keywords can't judge urgency, so play it safe and suggest talking to a doctor soon.
  return { conditions: [], specialty: match?.specialty ?? "general_practice", urgency: "within_24_hours" };
}
