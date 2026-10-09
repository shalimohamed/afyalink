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
export default async function PrescriptionView({ supabase, prescriptionId }: { supabase: SupabaseClient; prescriptionId: string }) {
  const { data: p } = await supabase
    .from("prescriptions")
    .select("diagnosis, notes, pdf_path, created_at, prescription_items(id, medicine_name, dosage, frequency, duration, instructions)")
    .eq("id", prescriptionId)
    .maybeSingle<Prescription>();
  if (!p) return null;

  // The bucket is private, so we make a download link that works for 10 minutes.
  const { data: signed } = p.pdf_path
    ? await supabase.storage.from("prescriptions").createSignedUrl(p.pdf_path, 600, { download: "AfyaLink-prescription.pdf" })
    : { data: null };

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
      {signed?.signedUrl && (
        <a href={signed.signedUrl} className="btn btn-primary">
          Download PDF
        </a>
      )}
    </div>
  );
}
