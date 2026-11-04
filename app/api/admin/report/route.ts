import { NextResponse, type NextRequest } from "next/server";
import { loadReport } from "@/lib/analytics";
import { getAiOverview } from "@/lib/analyticsAI";
import { renderReportPdf } from "@/lib/reportPdf";
import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/time";

// "Download PDF report" on the admin dashboard: the same aggregated numbers
// as the dashboard, plus the AI overview if Gemini is available.
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
  if (profile?.role !== "admin") return new NextResponse("Only admins can download reports.", { status: 403 });

  const report = await loadReport(supabase);
  if (!report) return new NextResponse("Analytics aren't available yet. Run migration 0004 first.", { status: 500 });

  const overview = await getAiOverview(report);
  const pdf = await renderReportPdf({ report, overview, generatedAt: new Date().toISOString() });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="AfyaLink-report-${nairobiToday()}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
