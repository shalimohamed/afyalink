import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

// The prescription PDF, written as React components. @react-pdf/renderer
// turns them into a PDF file on the server.

export type PrescriptionPdfData = {
  prescriptionId: string;
  issuedAt: string;
  consultationAt: string;
  doctor: { name: string; specialty: string; registrationNumber: string };
  patient: { name: string; dateOfBirth: string | null; sex: string | null };
  diagnosis: string;
  notes: string | null;
  items: { medicine_name: string; dosage: string; frequency: string; duration: string; instructions: string | null }[];
};

const GREEN = "#0E7A5C";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#11241F" },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: `2pt solid ${GREEN}`, paddingBottom: 10 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREEN },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 4 },
  meta: { textAlign: "right", fontSize: 9, color: "#56675F" },
  row: { flexDirection: "row", gap: 20, marginTop: 16 },
  box: { flex: 1, padding: 10, border: "1pt solid #DCE4E0", borderRadius: 4 },
  label: { fontSize: 8, color: "#56675F", textTransform: "uppercase", marginBottom: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { marginTop: 16 },
  table: { marginTop: 6, border: "1pt solid #DCE4E0" },
  th: { flexDirection: "row", backgroundColor: "#E2F0EA", fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderTop: "1pt solid #DCE4E0" },
  cell: { padding: 6 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#56675F", borderTop: "1pt solid #DCE4E0", paddingTop: 6 },
});

const COLUMNS = [
  { key: "medicine_name", label: "Medicine", width: "26%" },
  { key: "dosage", label: "Dosage", width: "14%" },
  { key: "frequency", label: "How often", width: "18%" },
  { key: "duration", label: "For how long", width: "15%" },
  { key: "instructions", label: "Instructions", width: "27%" },
] as const;

const dateFormat = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

function PrescriptionDocument({ data }: { data: PrescriptionPdfData }) {
  const patientDetails = [data.patient.sex, data.patient.dateOfBirth && `born ${dateFormat(data.patient.dateOfBirth)}`]
    .filter(Boolean)
    .join(", ");

  return (
    <Document title="AfyaLink prescription" author={`Dr. ${data.doctor.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AfyaLink</Text>
            <Text style={s.title}>Prescription</Text>
          </View>
          <View style={s.meta}>
            <Text>Issued: {dateFormat(data.issuedAt)}</Text>
            <Text>Consultation: {dateFormat(data.consultationAt)}</Text>
            <Text>Ref: {data.prescriptionId.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={s.box}>
            <Text style={s.label}>Doctor</Text>
            <Text style={s.bold}>Dr. {data.doctor.name}</Text>
            <Text>{data.doctor.specialty}</Text>
            <Text>Registration no. {data.doctor.registrationNumber}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Patient</Text>
            <Text style={s.bold}>{data.patient.name}</Text>
            {patientDetails ? <Text>{patientDetails}</Text> : null}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Diagnosis</Text>
          <Text>{data.diagnosis}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.label}>Medicines</Text>
          <View style={s.table}>
            <View style={s.th}>
              {COLUMNS.map((c) => (
                <Text key={c.key} style={[s.cell, { width: c.width }]}>
                  {c.label}
                </Text>
              ))}
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={s.tr} wrap={false}>
                {COLUMNS.map((c) => (
                  <Text key={c.key} style={[s.cell, { width: c.width }]}>
                    {item[c.key] ?? ""}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>

        {data.notes ? (
          <View style={s.section}>
            <Text style={s.label}>Doctor&apos;s notes</Text>
            <Text>{data.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          Issued electronically by Dr. {data.doctor.name} after a video consultation on AfyaLink. This prescription is
          for the named patient only. In an emergency, call 999 or 112.
        </Text>
      </Page>
    </Document>
  );
}

export function renderPrescriptionPdf(data: PrescriptionPdfData): Promise<Buffer> {
  return renderToBuffer(<PrescriptionDocument data={data} />);
}
