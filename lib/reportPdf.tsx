import "server-only";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Report } from "@/lib/analytics";
import type { Overview } from "@/lib/analyticsAI";
import { formatKes } from "@/lib/time";

// The admin's downloadable platform report, written as React components like
// the prescription PDF (lib/prescriptionPdf.tsx). Aggregated numbers only.

export type ReportPdfData = { report: Report; overview: Overview | null; generatedAt: string };

// Wrap whole words instead of splitting them with hyphens ("gener-ated").
Font.registerHyphenationCallback((word) => [word]);

// Same colours as the dashboard charts (--chart-* in globals.css, light theme).
const GREEN = "#0E7A5C";
const WARN = "#977D00";
const BAD = "#B3261E";
const MUTED = "#56675F";
const LINE = "#DCE4E0";
const SOFT = "#E2F0EA";

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 64, fontSize: 10, fontFamily: "Helvetica", color: "#11241F" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: `2pt solid ${GREEN}`, paddingBottom: 10 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREEN },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 4 },
  meta: { textAlign: "right", fontSize: 9, color: MUTED },
  section: { marginTop: 18 },
  heading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  label: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED, fontSize: 8.5 },
  boxes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  box: { width: "23.8%", padding: 8, border: `1pt solid ${LINE}`, borderRadius: 4 },
  boxWide: { width: "48.9%", padding: 8, border: `1pt solid ${LINE}`, borderRadius: 4 },
  value: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  ai: { padding: 12, backgroundColor: SOFT, borderRadius: 6 },
  aiHeadline: { fontSize: 11, fontFamily: "Helvetica-Bold", lineHeight: 1.4, marginBottom: 6 },
  aiGroup: { marginTop: 6 },
  bullet: { marginTop: 3 },
  columns: { flexDirection: "row", gap: 4, height: 110, alignItems: "flex-end" },
  column: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: 110 },
  columnValue: { fontSize: 7, marginBottom: 2 },
  columnBar: { width: "70%", backgroundColor: GREEN },
  columnLabel: { fontSize: 6.5, color: MUTED, marginTop: 3 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { width: "38%", paddingRight: 6 },
  barTrack: { flex: 1, height: 9, flexDirection: "row" },
  barValue: { width: 34, textAlign: "right" },
  twoCharts: { flexDirection: "row", gap: 16 },
  half: { flex: 1 },
  footer: { position: "absolute", bottom: 26, left: 40, right: 40, fontSize: 7.5, color: MUTED, borderTop: `1pt solid ${LINE}`, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
});

// Helvetica (built into every PDF reader) only has Western European
// characters, so symbols the AI might use are swapped or dropped.
function pdfText(text: string) {
  return text
    .replace(/→/g, "->")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/≈/g, "~")
    .replace(/[^ -~ -ÿ–—‘’“”•…]/g, "");
}

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const longDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
// bookings_per_day days are plain dates (YYYY-MM-DD), so read them as UTC.
const shortDay = (day: string) => new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
const num = (n: number) => Number(n).toLocaleString("en-KE");

function Stat({ label, value, note, wide }: { label: string; value: string; note?: string; wide?: boolean }) {
  return (
    <View style={wide ? s.boxWide : s.box}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
      {note ? <Text style={s.muted}>{note}</Text> : null}
    </View>
  );
}

function Bars({ bars }: { bars: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(0, ...bars.map((b) => b.value));
  if (max === 0) return <Text style={s.muted}>Nothing to show yet.</Text>;
  return (
    <View>
      {bars.map((b) => (
        <View key={b.label} style={s.barRow}>
          <Text style={s.barLabel}>{b.label}</Text>
          <View style={s.barTrack}>
            <View style={{ width: `${(b.value / max) * 100}%`, backgroundColor: b.color ?? GREEN }} />
          </View>
          <Text style={s.barValue}>{num(b.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function AiOverviewSection({ overview }: { overview: Overview | null }) {
  if (!overview) {
    return (
      <View style={s.ai}>
        <Text style={s.label}>AI overview</Text>
        <Text>The AI overview wasn&apos;t available when this report was made (the free Gemini service may be busy). All figures below are exact.</Text>
      </View>
    );
  }
  const groups = [
    { title: "Going well", items: overview.highlights },
    { title: "Worth checking", items: overview.watch },
    { title: "Suggested next steps", items: overview.actions },
  ].filter((g) => g.items.length > 0);

  return (
    <View style={s.ai} wrap={false}>
      <Text style={s.label}>AI overview (Gemini)</Text>
      <Text style={s.aiHeadline}>{pdfText(overview.headline)}</Text>
      {groups.map((g) => (
        <View key={g.title} style={s.aiGroup}>
          <Text style={s.bold}>{g.title}</Text>
          {g.items.map((item, i) => (
            <Text key={i} style={s.bullet}>
              • {pdfText(item)}
            </Text>
          ))}
        </View>
      ))}
      <Text style={[s.muted, { marginTop: 8 }]}>
        Written by AI from the aggregated numbers in this report, never from patient records. It can make mistakes, so check
        the figures before acting.
      </Text>
    </View>
  );
}

function ReportDocument({ report, overview, generatedAt }: ReportPdfData) {
  const { analytics: a, period: p } = report;
  const perDay = a.bookings_per_day.map((d) => ({ day: d.day, count: Number(d.count) }));
  const maxPerDay = Math.max(0, ...perDay.map((d) => d.count));
  const firstDay = perDay[0]?.day;
  const lastDay = perDay[perDay.length - 1]?.day;
  const change = p.paidLast7Days - p.paidPrevious7Days;

  return (
    <Document title="AfyaLink platform report" author="AfyaLink admin">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AfyaLink</Text>
            <Text style={s.title}>Platform report</Text>
          </View>
          <View style={s.meta}>
            <Text>Generated: {longDateTime(generatedAt)} (Kenyan time)</Text>
            {firstDay && lastDay ? (
              <Text>
                Period: {shortDay(firstDay)} – {longDate(`${lastDay}T12:00:00+03:00`)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={s.section}>
          <AiOverviewSection overview={overview} />
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.heading}>Key figures (all time)</Text>
          <View style={s.boxes}>
            <Stat label="Revenue" value={formatKes(a.revenue_kes)} note="M-Pesa sandbox" />
            <Stat label="Paid consultations" value={num(a.consultations)} note={`${num(a.consultations_done)} completed`} />
            <Stat label="Prescriptions" value={num(a.prescriptions)} />
            <Stat label="Patients" value={num(a.patients)} />
            <Stat label="Verified doctors" value={num(a.doctors_verified)} note={`${num(a.doctors_pending)} waiting for review`} />
            <Stat label="Symptom checks" value={num(a.symptom_checks)} note={`${num(a.red_flags)} sent to emergency care`} />
            <Stat
              label="Average rating"
              value={a.average_rating ? `${Number(a.average_rating).toFixed(1)} / 5` : "None yet"}
              note={`${num(a.review_count)} reviews`}
            />
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.heading}>Last {p.days} days</Text>
          <View style={s.boxes}>
            <Stat
              wide
              label="Paid consultations, last 7 days"
              value={num(p.paidLast7Days)}
              note={`${num(p.paidPrevious7Days)} the week before (${change >= 0 ? "+" : ""}${num(change)})`}
            />
            <Stat wide label={`Revenue, last ${p.days} days`} value={formatKes(p.revenueKes)} />
            <Stat wide label="M-Pesa payments" value={`${num(p.paymentsSucceeded)} succeeded`} note={`${num(p.paymentsFailed)} failed or cancelled`} />
            <Stat wide label="Unfinished payments" value={num(p.unpaidHolds)} note="Slot holds that ran out before the patient paid" />
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.heading}>Paid consultations per day</Text>
          <View style={s.columns}>
            {perDay.map((d) => (
              <View key={d.day} style={s.column}>
                <Text style={s.columnValue}>{d.count}</Text>
                <View style={[s.columnBar, { height: maxPerDay ? (d.count / maxPerDay) * 80 : 0 }]} />
                <Text style={s.columnLabel}>{shortDay(d.day)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.heading}>Paid consultations by specialty</Text>
          <Bars bars={a.by_specialty.map((x) => ({ label: x.label, value: Number(x.count) }))} />
        </View>

        <View style={[s.section, s.twoCharts]} wrap={false}>
          <View style={s.half}>
            <Text style={s.heading}>Symptom checks by urgency</Text>
            <Bars
              bars={[
                { label: "Routine", value: a.urgency.routine ?? 0, color: GREEN },
                { label: "Within 24 hours", value: a.urgency.within_24_hours ?? 0, color: WARN },
                { label: "Emergency", value: a.urgency.emergency ?? 0, color: BAD },
              ]}
            />
          </View>
          <View style={s.half}>
            <Text style={s.heading}>Reviews by rating</Text>
            <Bars
              bars={(["5", "4", "3", "2", "1"] as const).map((n) => ({
                label: n === "1" ? "1 star" : `${n} stars`,
                value: p.reviewsByStars[n],
                color: n <= "2" ? BAD : n === "3" ? WARN : GREEN,
              }))}
            />
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Aggregated figures only: this report contains no patient records. Revenue is from M-Pesa sandbox (test) payments.</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderReportPdf(data: ReportPdfData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument {...data} />);
}
