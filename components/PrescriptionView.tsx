import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/time";

type Prescription = {
  diagnosis: string;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  prescription_items: { id: string; medicine_name: string; dosage: string; frequency: string; duration: string; instructions: string | null }[];
};

// Shows an issued prescription, with a download link for the PDF. Row-level
// security means only the booking's patient and doctor can load it.
// newTab: open the PDF in a new tab, e.g. during a call, so the call keeps going.
export default async function PrescriptionView({
  supabase,
  prescriptionId,
  newTab = false,
}: {
  supabase: SupabaseClient;
  prescriptionId: string;
  newTab?: boolean;
}) {
  const { data: p } = await supabase
    .from("prescriptions")
    .select("diagnosis, notes, pdf_path, created_at, prescription_items(id, medicine_name, dosage, frequency, duration, instructions)")
    .eq("id", prescriptionId)
    .maybeSingle<Prescription>();
  if (!p) return null;

  return (
    <div className="panel prescription">
      <small className="label">Issued {formatDate(p.created_at)}</small>
      <b>{p.diagnosis}</b>
      <ul className="meds">
        {p.prescription_items.map((item) => (
          <li key={item.id}>
            <strong>{item.medicine_name}</strong> · {item.dosage} · {item.frequency} · {item.duration}
            {item.instructions && ` · ${item.instructions}`}
          </li>
        ))}
      </ul>
      {p.notes && <span>{p.notes}</span>}
      {p.pdf_path && (
        // Goes through our route, which checks access, notes the patient's
        // download and then hands over a short-lived link to the private file.
        <a
          href={`/api/prescriptions/${prescriptionId}/pdf`}
          className="btn btn-primary"
          {...(newTab ? { target: "_blank", rel: "noopener" } : {})}
        >
          Download PDF
        </a>
      )}
    </div>
  );
}
