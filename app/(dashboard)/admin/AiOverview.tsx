import type { Report } from "@/lib/analytics";
import { getAiOverview } from "@/lib/analyticsAI";

// The AI overview's text. The dashboard wraps it in <Suspense>, so the rest of
// the page shows straight away and this streams in when Gemini answers (a few
// seconds, and only when the numbers have changed since the last overview).
export default async function AiOverview({ report }: { report: Report }) {
  const overview = await getAiOverview(report);
  if (!overview) {
    return (
      <p className="empty">
        The AI overview isn&apos;t available right now (the free Gemini service may be busy). The numbers below are still
        exact.
      </p>
    );
  }

  const groups = [
    { title: "Going well", items: overview.highlights },
    { title: "Worth checking", items: overview.watch },
    { title: "Suggested next steps", items: overview.actions },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <p className="ai-headline">{overview.headline}</p>
      <div className="ai-groups">
        {groups.map((g) => (
          <div key={g.title}>
            <small className="label">{g.title}</small>
            <ul>
              {g.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
