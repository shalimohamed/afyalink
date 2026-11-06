// Creates TEST doctors, their availability, patients and an admin account.
// Run from the project folder:   npm run seed
// Safe to run again: existing accounts are reused, and new slots that would
// overlap existing ones are skipped. Uses the service-role key from
// .env.local, so it only ever runs on your own computer.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "AfyaLink-Test-2026"; // test accounts only

const DOCTORS = [
  { email: "dr.amina@afyalink.test", name: "Amina Otieno", specialty: "general_practice", reg: "TEST-GP-001", feeType: "per_session", fee: 100, minutes: 30, verified: true,
    bio: "General practitioner with 8 years' experience in family medicine, common infections and chronic illness follow-up." },
  { email: "dr.kiprop@afyalink.test", name: "Brian Kiprop", specialty: "dermatology", reg: "TEST-DM-002", feeType: "per_session", fee: 1500, minutes: 30, verified: true,
    bio: "Dermatologist treating acne, eczema, fungal infections and other skin, hair and nail problems." },
  { email: "dr.wanjiru@afyalink.test", name: "Grace Wanjiru", specialty: "psychology", reg: "TEST-PS-003", feeType: "per_hour", fee: 2000, minutes: 60, verified: true,
    bio: "Counselling psychologist helping with stress, anxiety, low mood, grief and relationship difficulties." },
  { email: "dr.mwangi@afyalink.test", name: "David Mwangi", specialty: "paediatrics", reg: "TEST-PD-004", feeType: "per_session", fee: 1200, minutes: 30, verified: true,
    bio: "Paediatrician caring for babies, children and teenagers: fevers, coughs, rashes, feeding and growth." },
  { email: "dr.hassan@afyalink.test", name: "Fatuma Hassan", specialty: "gynaecology", reg: "TEST-GY-005", feeType: "per_session", fee: 1800, minutes: 30, verified: true,
    bio: "Obstetrician and gynaecologist: period problems, contraception, pregnancy questions and women's health." },
  { email: "dr.ochieng@afyalink.test", name: "Peter Ochieng", specialty: "ent", reg: "TEST-EN-006", feeType: "per_session", fee: 1300, minutes: 30, verified: true,
    bio: "Ear, nose and throat specialist: sinus problems, sore throats, ear infections and hearing concerns." },
  { email: "dr.njeri@afyalink.test", name: "Lucy Njeri", specialty: "psychiatry", reg: "TEST-PY-007", feeType: "per_hour", fee: 3000, minutes: 60, verified: false,
    // Created as pending (an admin approves her during testing); the bio is
    // rewritten on every run, so it mustn't say she's waiting.
    bio: "Psychiatrist for depression, anxiety, bipolar disorder and reviews of psychiatric medication." },
  { email: "dr.mutua@afyalink.test", name: "Samuel Mutua", specialty: "dermatology", reg: "TEST-DM-008", feeType: "per_session", fee: 1400, minutes: 30, verified: false,
    bio: "Dermatologist with 5 years' experience in skin allergies, acne and scalp conditions." },
  { email: "dr.kamau@afyalink.test", name: "Joseph Kamau", specialty: "general_practice", reg: "TEST-GP-009", feeType: "per_session", fee: 800, minutes: 30, verified: true,
    bio: "General practitioner focused on adult health, high blood pressure and diabetes follow-up." },
  { email: "dr.abdi@afyalink.test", name: "Zainab Abdi", specialty: "general_practice", reg: "TEST-GP-010", feeType: "per_session", fee: 900, minutes: 30, verified: true,
    bio: "Family doctor for coughs, colds, stomach upsets and lab result discussions." },
  { email: "dr.chebet@afyalink.test", name: "Naomi Chebet", specialty: "dermatology", reg: "TEST-DM-011", feeType: "per_session", fee: 1600, minutes: 30, verified: true,
    bio: "Dermatologist with an interest in eczema, pigmentation and hair loss." },
  { email: "dr.kiptoo@afyalink.test", name: "Daniel Kiptoo", specialty: "psychology", reg: "TEST-PS-012", feeType: "per_hour", fee: 1800, minutes: 60, verified: true,
    bio: "Counselling psychologist supporting students and young professionals with stress and burnout." },
  { email: "dr.achieng@afyalink.test", name: "Mercy Achieng", specialty: "psychiatry", reg: "TEST-PY-013", feeType: "per_hour", fee: 3500, minutes: 60, verified: true,
    bio: "Psychiatrist helping with depression, anxiety disorders and sleep problems." },
  { email: "dr.shah@afyalink.test", name: "Priya Shah", specialty: "paediatrics", reg: "TEST-PD-014", feeType: "per_session", fee: 1400, minutes: 30, verified: true,
    bio: "Paediatrician for childhood allergies, asthma follow-up and vaccination questions." },
  { email: "dr.wambui@afyalink.test", name: "Esther Wambui", specialty: "gynaecology", reg: "TEST-GY-015", feeType: "per_session", fee: 1700, minutes: 30, verified: true,
    bio: "Gynaecologist for family planning, fertility questions and routine women's health." },
  { email: "dr.wekesa@afyalink.test", name: "Collins Wekesa", specialty: "ent", reg: "TEST-EN-016", feeType: "per_session", fee: 1250, minutes: 30, verified: false,
    bio: "Ear, nose and throat specialist for allergies, tonsil problems and blocked ears." },
];

// Made-up patients. Their logins are <first>.<last>@afyalink.test.
const PATIENTS = [
  { name: "Wanjiku Mwangi", sex: "female", born: "1994-03-12" },
  { name: "Otieno Odhiambo", sex: "male", born: "1988-07-25" },
  { name: "Njoki Kariuki", sex: "female", born: "1999-11-02" },
  { name: "Kevin Mutiso", sex: "male", born: "1991-01-30" },
  { name: "Akinyi Onyango", sex: "female", born: "1985-05-17" },
  { name: "Brian Kipchumba", sex: "male", born: "2001-09-08" },
  { name: "Faith Nyambura", sex: "female", born: "1996-12-21" },
  { name: "Hassan Omar", sex: "male", born: "1979-04-14" },
  { name: "Amina Yusuf", sex: "female", born: "1990-08-03" },
  { name: "Dennis Wafula", sex: "male", born: "1983-02-19" },
  { name: "Cynthia Jepkosgei", sex: "female", born: "2000-06-27" },
  { name: "Felix Musyoka", sex: "male", born: "1975-10-05" },
  { name: "Lilian Moraa", sex: "female", born: "1987-03-29" },
  { name: "Victor Ouma", sex: "male", born: "1997-07-11" },
  { name: "Rose Wairimu", sex: "female", born: "1968-12-16" },
  { name: "Ibrahim Abdullahi", sex: "male", born: "1993-05-23" },
  { name: "Sharon Naliaka", sex: "female", born: "2002-02-08" },
  { name: "Patrick Njoroge", sex: "male", born: "1972-09-30" },
  { name: "Beatrice Mumbua", sex: "female", born: "1980-11-13" },
  { name: "Samuel Kiprotich", sex: "male", born: "1995-04-06" },
  { name: "Mary Nekesa", sex: "female", born: "1959-01-22" },
  { name: "Anil Patel", sex: "male", born: "1986-06-15" },
  { name: "Joy Atieno", sex: "female", born: "1998-10-09" },
  { name: "George Gitau", sex: "male", born: "1964-08-28" },
  { name: "Halima Noor", sex: "female", born: "2003-03-17" },
];

// One per patient above, in the same order (null = doesn't know). Roughly how
// common each group is in Kenya: mostly O+, A+ and B+.
const BLOOD_GROUPS = ["O+", "A+", "B+", "O+", null, "A+", "O+", "B+", "AB+", "O+", "A-", "O+", "B+", null, "O+", "A+", "O-", "B+", "O+", "A+", null, "O+", "B-", "A+", "O+"];

const ADMIN = { email: "admin@afyalink.test", name: "AfyaLink Admin" };

// Slot start times (Kenyan time) for today and the next 4 days.
const SLOT_TIMES = ["09:00", "11:00", "14:00", "16:00", "18:00"];
const DAYS_AHEAD = 5;

// A tiny one-page PDF so the admin has a "certificate" to open.
function placeholderCertificate(name, reg) {
  const text = `TEST DATA - Sample registration certificate for Dr. ${name} (${reg})`;
  const stream = `BT /F1 14 Tf 50 750 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 200) return user ?? null;
  }
}

// Creates the account (the handle_new_user trigger then creates the profile
// and the doctors/patients row from the metadata), or reuses it if it exists.
async function ensureUser(email, metadata) {
  const existing = await findUserByEmail(email);
  if (existing) return { id: existing.id, created: false };
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { id: data.user.id, created: true };
}

function nairobiDate(daysAhead) {
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(date); // YYYY-MM-DD
}

async function addSlots(doctorId, minutes) {
  let added = 0;
  for (let day = 0; day < DAYS_AHEAD; day++) {
    for (const time of SLOT_TIMES) {
      const start = new Date(`${nairobiDate(day)}T${time}:00+03:00`);
      if (start.getTime() < Date.now() + 10 * 60 * 1000) continue; // skip past or about-to-start times
      const end = new Date(start.getTime() + minutes * 60 * 1000);
      const { error } = await supabase
        .from("availability_slots")
        .insert({ doctor_id: doctorId, starts_at: start.toISOString(), ends_at: end.toISOString() });
      if (!error) added++;
      else if (error.code !== "23P01") throw error; // 23P01 = overlaps an existing slot, fine
    }
  }
  return added;
}

async function main() {
  console.log("Seeding test data...\n");
  const rows = [];

  for (const d of DOCTORS) {
    const { id, created } = await ensureUser(d.email, {
      role: "doctor",
      full_name: d.name,
      phone: "254700000" + String(DOCTORS.indexOf(d) + 1).padStart(3, "0"),
      specialty: d.specialty,
      registration_number: d.reg,
      fee_type: d.feeType,
      fee_kes: d.fee,
    });

    const licencePath = `${id}/licence.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("licences")
      .upload(licencePath, placeholderCertificate(d.name, d.reg), { contentType: "application/pdf", upsert: true });
    if (uploadError) throw uploadError;

    // The pending test doctor is only set to "pending" when first created, so
    // re-running the seed doesn't undo an admin's approval or rejection.
    const statusUpdate = d.verified
      ? { verification_status: "verified", reviewed_at: new Date().toISOString(), rejection_reason: null }
      : created
        ? { verification_status: "pending", reviewed_at: null, reviewed_by: null, rejection_reason: null }
        : {};
    const { error: updateError } = await supabase
      .from("doctors")
      .update({ bio: d.bio, licence_path: licencePath, ...statusUpdate })
      .eq("id", id);
    if (updateError) throw updateError;

    const { data: current } = await supabase.from("doctors").select("verification_status").eq("id", id).single();
    const isVerified = current?.verification_status === "verified";
    const slots = isVerified ? await addSlots(id, d.minutes) : 0;
    rows.push({ Doctor: `Dr. ${d.name}`, Email: d.email, Specialty: d.specialty, Fee: `KES ${d.fee} ${d.feeType === "per_hour" ? "/hour" : "/session"}`, Status: current?.verification_status ?? "?", "New slots": slots, Account: created ? "created" : "already existed" });
  }

  // The handle_new_user trigger makes these patients because no role is given.
  const patientRows = [];
  for (const [i, p] of PATIENTS.entries()) {
    const email = `${p.name.toLowerCase().replace(" ", ".")}@afyalink.test`;
    const { id, created } = await ensureUser(email, { full_name: p.name, phone: "254711" + String(i + 1).padStart(6, "0") });
    const { error } = await supabase.from("patients").update({ date_of_birth: p.born, sex: p.sex }).eq("id", id);
    if (error) throw error;
    // Separate, so the seed still works before migration 0009 adds the column.
    const { error: bloodError } = await supabase.from("patients").update({ blood_group: BLOOD_GROUPS[i] }).eq("id", id);
    if (bloodError && i === 0) console.warn("Blood groups skipped: run supabase/migrations/0009_patient_file.sql first.");
    patientRows.push({ Patient: p.name, Email: email, Sex: p.sex, Born: p.born, Account: created ? "created" : "already existed" });
  }

  // Admin: created as a normal user, then promoted. Signup can never make admins.
  const admin = await ensureUser(ADMIN.email, { full_name: ADMIN.name });
  await supabase.from("profiles").update({ role: "admin", full_name: ADMIN.name }).eq("id", admin.id);
  await supabase.from("patients").delete().eq("id", admin.id);

  console.table(rows);
  console.table(patientRows);
  console.log(`\nAdmin: ${ADMIN.email} (${admin.created ? "created" : "already existed"})`);
  console.log(`Password for all test accounts: ${PASSWORD}\n`);
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
