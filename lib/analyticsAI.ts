import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Report } from "@/lib/analytics";

// The "AI overview" on the admin dashboard and in the PDF report. Gemini only
// ever sees the aggregated numbers in a Report (counts, sums, averages): no
// names, symptoms or anything else about one person, so no personal data
// reaches Google's free tier. Same models as the symptom checker
// (lib/symptoms/gemini.ts).
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.5-flash-lite"];

export type Overview = { headline: string; highlights: string[]; watch: string[]; actions: string[] };

const SYSTEM_PROMPT = `You write the "AI overview" on the admin dashboard of AfyaLink, a telemedicine platform in Kenya: patients use an AI symptom checker, book verified doctors, pay with M-Pesa and have video consultations.
You get the platform's statistics as JSON:
- analytics: all-time totals. consultations = all paid bookings, including upcoming ones; consultations_done = paid consultations that have already taken place; revenue_kes = money from paid bookings; red_flags = symptom checks stopped by the emergency rules; doctors_pending = doctors waiting for an admin to verify them; bookings_per_day = paid consultations per day in Kenyan time, oldest first; by_specialty = paid consultations per type of doctor; urgency = symptom checks per urgency level.
- period: the last period.days days. paidLast7Days and paidPrevious7Days compare the last week with the week before; unpaidHolds = bookings where the patient never finished paying; reviewsByStars = number of reviews per star rating (all time).
Reply with:
- headline: one sentence summing up how the platform is doing.
- highlights: 2 to 4 things going well.
- watch: 1 to 3 things the admin should look into.
- actions: 1 to 3 concrete next steps for the admin.
Rules: use only numbers that are in the data and quote them exactly. Write money like "KES 62,500" (revenue is from the M-Pesa sandbox, i.e. test payments). Each point is one short sentence of at most 25 words, in plain English, without emoji or special symbols. Don't give medical advice.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    highlights: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
    watch: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
    actions: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
  },
  required: ["headline", "highlights", "watch", "actions"],
};

// The same numbers give the same overview, so the last one is kept and Gemini
// is only asked again when the numbers change. That saves the free daily
// quota and lets the dashboard and the PDF show the same text. It's kept on
// globalThis because Next.js loads this file separately for pages and for
// route handlers, and both should share the one copy.
const memory = globalThis as typeof globalThis & { afyalinkOverview?: { key: string; overview: Overview } };

// Returns null if the AI is unavailable (no key, daily limit, busy, timeout)
// or replied with something unusable.
export async function getAiOverview(report: Report): Promise<Overview | null> {
  const numbers = JSON.stringify(report);
  const key = SYSTEM_PROMPT + numbers; // new instructions also mean a new overview
  if (memory.afyalinkOverview?.key === key) return memory.afyalinkOverview.overview;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return null;
  }
  const ai = new GoogleGenAI({ apiKey });

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: numbers,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
          abortSignal: AbortSignal.timeout(20_000),
        },
      });
      const overview = parseOverview(JSON.parse(response.text ?? ""));
      if (overview) {
        memory.afyalinkOverview = { key, overview };
        return overview;
      }
      console.error(`Gemini (${model}) returned an unusable overview`);
    } catch (error) {
      console.error(`Gemini (${model}) overview request failed:`, error);
    }
  }
  return null;
}

// Never trust the AI's output blindly: keep only short strings in the expected shape.
function parseOverview(raw: unknown): Overview | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { headline, highlights, watch, actions } = raw as Record<string, unknown>;
  const clean = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 300) : "");
  const list = (value: unknown, max: number) => (Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, max) : []);

  const overview = { headline: clean(headline), highlights: list(highlights, 4), watch: list(watch, 3), actions: list(actions, 3) };
  return overview.headline && overview.highlights.length > 0 ? overview : null;
}
