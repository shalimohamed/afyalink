// Creates made-up ACTIVITY for the test accounts from `npm run seed`: symptom
// checks, paid and unpaid bookings with M-Pesa sandbox payments,
// prescriptions, reviews and follow-up chats over the last 30 days, plus a
// few upcoming consultations. It fills the admin dashboard and the test
// doctors' and patients' pages with realistic-looking data.
//
// Run from the project folder, after `npm run seed`:   npm run seed:activity
//
// Each run first DELETES all activity of the @afyalink.test patients, then
// creates it again around today's date, so the charts stay current. Accounts
// that don't end in @afyalink.test (like your own) are never touched.
//
// Every run gives the same numbers, whatever the day or time it runs: the
// made-up past ends at midnight this morning, the upcoming consultations
// start tomorrow or later, and the "random" choices never depend on what's
// already in the database.

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DAYS_BACK = 30;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.now();
const SLOT_TIMES = ["09:00", "11:00", "14:00", "16:00", "18:00"]; // same as the main seed

// ---------------------------------------------------------------------------
// Made-up content
// ---------------------------------------------------------------------------

// What a patient might type, what the symptom checker would suggest, and what
// the doctor might prescribe (items: [medicine, dosage, how often, how long, instructions]).
// weight = how common it is. No items = usually no prescription (e.g. counselling).
const SCENARIOS = [
  { specialty: "general_practice", weight: 5, urgency: "within_24_hours",
    symptoms: "I have had a fever, headache and body aches for two days and I feel very tired.",
    conditions: ["Malaria", "Influenza (flu)", "Typhoid fever"],
    diagnosis: "Influenza-like illness; malaria test advised",
    items: [["Paracetamol", "1 g", "Three times a day", "3 days", "After meals"]] },
  { specialty: "general_practice", weight: 5, urgency: "routine",
    symptoms: "Sore throat, runny nose and a mild cough since yesterday.",
    conditions: ["Common cold", "Viral sore throat"],
    diagnosis: "Upper respiratory tract infection",
    items: [["Paracetamol", "500 mg", "Three times a day", "3 days", "After meals"], ["Cetirizine", "10 mg", "Once at night", "5 days", null]] },
  { specialty: "general_practice", weight: 3, urgency: "within_24_hours",
    symptoms: "It burns when I pass urine and I need to go very often.",
    conditions: ["Urinary tract infection", "Bladder irritation"],
    diagnosis: "Uncomplicated urinary tract infection",
    items: [["Nitrofurantoin", "100 mg", "Twice a day", "5 days", "With food; drink plenty of water"]] },
  { specialty: "general_practice", weight: 3, urgency: "routine",
    symptoms: "Stomach cramps and loose stools since I ate out last night.",
    conditions: ["Food poisoning", "Gastroenteritis"],
    diagnosis: "Acute gastroenteritis",
    items: [["Oral rehydration salts", "1 sachet in 500 ml water", "After each loose stool", "3 days", null]] },
  { specialty: "general_practice", weight: 2, urgency: "routine",
    symptoms: "My blood pressure at the chemist was 150/95 and I would like to discuss it.",
    conditions: ["High blood pressure (hypertension)", "White-coat effect"],
    diagnosis: "Stage 1 hypertension",
    items: [["Amlodipine", "5 mg", "Once every morning", "30 days", "Recheck blood pressure in 2 weeks"]] },
  { specialty: "general_practice", weight: 2, urgency: "routine",
    symptoms: "I got my full blood count results and would like a doctor to explain them.",
    conditions: ["Mild anaemia", "Normal variation"],
    diagnosis: "Mild iron-deficiency anaemia",
    items: [["Ferrous sulphate", "200 mg", "Once a day", "30 days", "Take with orange juice, not tea"]] },
  { specialty: "dermatology", weight: 3, urgency: "routine",
    symptoms: "Itchy red patches on my elbows and behind my knees that keep coming back.",
    conditions: ["Eczema (atopic dermatitis)", "Contact dermatitis"],
    diagnosis: "Atopic eczema",
    items: [["Hydrocortisone 1% cream", "Thin layer", "Twice a day", "7 days", "On the patches only"], ["Emollient cream", "Generous amount", "As often as needed", "30 days", null]] },
  { specialty: "dermatology", weight: 3, urgency: "routine",
    symptoms: "Pimples on my face and back that leave dark marks.",
    conditions: ["Acne", "Post-inflammatory hyperpigmentation"],
    diagnosis: "Moderate acne",
    items: [["Benzoyl peroxide 5% gel", "Pea-sized amount", "Once at night", "6 weeks", "Wash face first"], ["Sunscreen SPF 30", "Thin layer", "Every morning", "6 weeks", null]] },
  { specialty: "dermatology", weight: 2, urgency: "routine",
    symptoms: "A round itchy patch on my arm with a raised edge.",
    conditions: ["Ringworm (tinea corporis)", "Eczema"],
    diagnosis: "Tinea corporis",
    items: [["Clotrimazole 1% cream", "Thin layer", "Twice a day", "2 weeks", "Continue 1 week after it clears"]] },
  { specialty: "psychology", weight: 3, urgency: "routine",
    symptoms: "I have been stressed and overwhelmed with work and I can't sleep well.",
    conditions: ["Stress-related insomnia", "Burnout", "Anxiety"] },
  { specialty: "psychology", weight: 2, urgency: "routine",
    symptoms: "I get very anxious before exams and my heart races.",
    conditions: ["Exam anxiety", "Generalised anxiety"] },
  { specialty: "psychology", weight: 1, urgency: "within_24_hours",
    symptoms: "Since losing my father I feel low most days and find it hard to focus.",
    conditions: ["Grief reaction", "Low mood"] },
  { specialty: "psychiatry", weight: 2, urgency: "within_24_hours",
    symptoms: "Low mood for over a month, no interest in things I used to enjoy, and poor sleep.",
    conditions: ["Depression", "Adjustment disorder"],
    diagnosis: "Moderate depressive episode",
    items: [["Sertraline", "50 mg", "Once every morning", "30 days", "Review in 4 weeks"]] },
  { specialty: "psychiatry", weight: 1, urgency: "routine",
    symptoms: "I wake up at 3 am every night and can't fall back asleep, for weeks now.",
    conditions: ["Insomnia", "Anxiety"],
    diagnosis: "Chronic insomnia",
    items: [["Melatonin", "3 mg", "One hour before bed", "14 days", "Keep a regular bedtime"]] },
  { specialty: "paediatrics", weight: 3, urgency: "routine",
    symptoms: "My 3-year-old has had a runny nose and a cough for four days, but is eating and playing.",
    conditions: ["Common cold", "Viral bronchitis"],
    diagnosis: "Viral upper respiratory infection",
    items: [["Paracetamol syrup 120 mg/5 ml", "5 ml", "Up to three times a day", "3 days", "Only if feverish"], ["Saline nose drops", "2 drops each nostril", "Three times a day", "5 days", null]] },
  { specialty: "paediatrics", weight: 2, urgency: "within_24_hours",
    symptoms: "My 6-year-old has a fever of 38.5 and ear pain.",
    conditions: ["Middle ear infection (otitis media)", "Viral fever"],
    diagnosis: "Acute otitis media",
    items: [["Amoxicillin syrup 250 mg/5 ml", "5 ml", "Three times a day", "7 days", "Finish the whole course"]] },
  { specialty: "paediatrics", weight: 1, urgency: "routine",
    symptoms: "My baby has a red nappy rash that is getting worse.",
    conditions: ["Nappy rash", "Thrush (candida)"],
    diagnosis: "Nappy dermatitis",
    items: [["Zinc oxide cream", "Thin layer", "At every nappy change", "7 days", null]] },
  { specialty: "gynaecology", weight: 2, urgency: "routine",
    symptoms: "My periods have been irregular for the last three months.",
    conditions: ["Hormonal imbalance", "Polycystic ovary syndrome (PCOS)", "Stress"],
    diagnosis: "Irregular menstrual cycles; tests advised",
    items: [["Mefenamic acid", "500 mg", "Three times a day during the period", "3 days", "After meals"]] },
  { specialty: "gynaecology", weight: 2, urgency: "routine",
    symptoms: "I would like advice on family planning options.",
    conditions: ["Family planning consultation"],
    diagnosis: "Family planning counselling",
    items: [["Combined oral contraceptive pill", "1 tablet", "Once a day", "3 months", "Start on day 1 of the period"]] },
  { specialty: "gynaecology", weight: 1, urgency: "routine",
    symptoms: "Unusual vaginal discharge and itching for a few days.",
    conditions: ["Vaginal thrush", "Bacterial vaginosis"],
    diagnosis: "Vulvovaginal candidiasis",
    items: [["Fluconazole", "150 mg", "Once", "1 day", null]] },
  { specialty: "ent", weight: 2, urgency: "routine",
    symptoms: "Blocked nose, pressure around my cheeks and a headache for a week.",
    conditions: ["Sinusitis", "Allergic rhinitis"],
    diagnosis: "Acute sinusitis",
    items: [["Fluticasone nasal spray", "2 sprays each nostril", "Once a day", "14 days", null], ["Saline nasal rinse", "1 rinse", "Twice a day", "7 days", null]] },
  { specialty: "ent", weight: 2, urgency: "within_24_hours",
    symptoms: "Painful swallowing and swollen tonsils with a fever.",
    conditions: ["Tonsillitis", "Strep throat"],
    diagnosis: "Acute tonsillitis",
    items: [["Amoxicillin", "500 mg", "Three times a day", "10 days", "Finish the whole course"], ["Paracetamol", "1 g", "Three times a day", "3 days", null]] },
  { specialty: "ent", weight: 1, urgency: "routine",
    symptoms: "My ear feels blocked and I hear less on one side.",
    conditions: ["Ear wax build-up", "Fluid behind the eardrum"],
    diagnosis: "Impacted ear wax",
    items: [["Olive oil ear drops", "3 drops", "Twice a day", "5 days", "Lie on your side for 5 minutes after"]] },
  // The AI called it an emergency, so booking was blocked (no red-flag words).
  { specialty: "general_practice", weight: 1, urgency: "emergency",
    symptoms: "My lips and eyes are swelling and I have an itchy rash all over after taking a new medicine.",
    conditions: ["Severe allergic reaction", "Angioedema"] },
];

// Words that trigger the hard-coded red-flag rules (lib/symptoms/redFlags.ts).
const RED_FLAGS = [
  "Crushing chest pain spreading to my left arm and I am sweating a lot.",
  "My father suddenly can't speak properly and his face is drooping.",
  "I have shortness of breath even when sitting still.",
  "I fainted twice this morning and still feel dizzy.",
];

const COMMENTS = {
  5: ["Very thorough and kind. Explained everything clearly.", "Asante sana daktari, I feel much better now.",
    "Quick and professional, and the prescription came right after the call.", "Listened patiently and didn't rush me at all.",
    "Saved me a long trip to the hospital. Highly recommend.", "The video was clear and the advice was practical."],
  4: ["Good advice. The call started a few minutes late.", "Helpful consultation, though I would have liked a bit more time.",
    "Friendly doctor. The video froze once but we finished the call.", "Clear explanation of my results."],
  3: ["It was okay, but it felt a bit rushed.", "Advice was fine but the doctor joined 10 minutes late.", "Average. I expected more follow-up questions."],
  2: ["The doctor joined 20 minutes late and the call was very short.", "I didn't feel listened to and had to repeat my symptoms twice."],
  1: ["I waited 25 minutes and the doctor never explained anything properly.", "Very dismissive. I will not book again."],
};
// One abusive review, so the admin has a reason to look at (and maybe suspend) a patient.
const ABUSIVE_COMMENT = "Useless!!! Total waste of my money. This so-called doctor is a fraud and I will make sure everyone knows it.";

const CHATS = [
  ["Hello daktari, the rash is much better after the cream. Should I keep using it?", "Good to hear. Use it for the full course, then only the moisturiser.", "Okay, thank you!"],
  ["Hi doctor, I finished the medicine but I still cough at night.", "A cough can last 2 to 3 weeks after a cold. If you get a fever or it gets worse, please book a consultation."],
  ["Good evening. Can I take the tablets with milk?", "Yes, that's fine. Just avoid alcohol while you're on them.", "Noted, asante."],
  ["The pain is gone now, thank you so much.", "Glad you're feeling better. Take care!"],
  ["Hello, my blood pressure today was 135/85.", "That's an improvement. Keep taking the tablet every morning and check again next week."],
];

// Real Daraja result codes for an STK push that wasn't paid.
const PAYMENT_FAILURES = [
  [1032, "Request cancelled by user"],
  [1, "The balance is insufficient for the transaction."],
  [2001, "The initiator information is invalid."],
  [1037, "DS timeout user cannot be reached"],
];

// Doctors whose made-up reviews are mostly good, apart from a few.
const RATING_MEAN = { "dr.kiprop@afyalink.test": 2.8, "dr.amina@afyalink.test": 4.8 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Same "random" numbers on every run (a seeded generator), so the pattern repeats.
let state = 20261104;
function random() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const chance = (p) => random() < p;
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const weightedPick = (list) => {
  let r = random() * list.reduce((sum, x) => sum + x.weight, 0);
  return list.find((x) => (r -= x.weight) < 0) ?? list[list.length - 1];
};
const iso = (ms) => new Date(ms).toISOString();
const nairobiDate = (ms) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(ms));
const atNairobi = (date, time) => new Date(`${date}T${time}:00+03:00`).getTime();

// Midnight at the start of today, Kenyan time. The made-up past ends here.
const TODAY = atNairobi(nairobiDate(NOW), "00:00");

let paymentCounter = 0;
const receipts = new Set();
function checkoutId(ms) {
  const stamp = nairobiDate(ms).replaceAll("-", "") + String(++paymentCounter).padStart(6, "0");
  return `ws_CO_${stamp}`;
}
function receipt() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let code;
  do code = "TK" + Array.from({ length: 8 }, () => pick(chars.split(""))).join("");
  while (receipts.has(code));
  receipts.add(code);
  return code;
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) return users;
  }
}

async function insertAll(table, rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + 200));
    if (error) throw new Error(`Inserting into ${table} failed: ${error.message}`);
  }
}

async function deleteIn(table, column, values) {
  for (let i = 0; i < values.length; i += 100) {
    const { error } = await supabase.from(table).delete().in(column, values.slice(i, i + 100));
    if (error) throw new Error(`Deleting from ${table} failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Find the test accounts
// ---------------------------------------------------------------------------

const users = await listAllUsers();
const testUsers = new Map(users.filter((u) => u.email?.endsWith("@afyalink.test")).map((u) => [u.id, u]));
const isBanned = (id) => {
  const until = testUsers.get(id)?.banned_until;
  return Boolean(until && new Date(until).getTime() > NOW);
};

const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, role, full_name, phone, created_at");
if (profilesError) throw profilesError;
// Sorted by email: the database returns rows in no fixed order, and the same
// order every run means the same patient gets the same made-up activity.
const byEmail = (a, b) => testUsers.get(a.id).email.localeCompare(testUsers.get(b.id).email);
const patients = profiles.filter((p) => p.role === "patient" && testUsers.has(p.id)).sort(byEmail);

const { data: doctorRows, error: doctorsError } = await supabase.from("doctors").select("id, specialty_id, fee_type, fee_kes, verification_status");
if (doctorsError) throw doctorsError;
const profileById = new Map(profiles.map((p) => [p.id, p]));
const doctors = doctorRows
  .filter((d) => testUsers.has(d.id) && d.verification_status === "verified" && !isBanned(d.id))
  .sort(byEmail)
  .map((d) => {
    const email = testUsers.get(d.id).email;
    return {
      ...d,
      email,
      name: profileById.get(d.id).full_name,
      minutes: d.fee_type === "per_hour" ? 60 : 30,
      ratingMean: RATING_MEAN[email] ?? 4.3 + random() * 0.5,
      // Dr. Amina (KES 100) is for payment tests, so her upcoming slots stay free.
      keepFutureFree: email === "dr.amina@afyalink.test",
    };
  });
const allTestDoctorIds = doctorRows.filter((d) => testUsers.has(d.id)).map((d) => d.id);

if (patients.length === 0 || doctors.length === 0) {
  console.error("No test patients or verified test doctors found. Run `npm run seed` first.");
  process.exit(1);
}
console.log(`Found ${patients.length} test patients and ${doctors.length} verified test doctors.\n`);

// ---------------------------------------------------------------------------
// 2. Remove the previous made-up activity of the test patients
// ---------------------------------------------------------------------------

const patientIds = patients.map((p) => p.id);
const { data: oldBookings } = await supabase.from("bookings").select("id").in("patient_id", patientIds);
const oldBookingIds = (oldBookings ?? []).map((b) => b.id);
if (oldBookingIds.length) {
  const { data: oldRx } = await supabase.from("prescriptions").select("pdf_path").in("booking_id", oldBookingIds);
  const pdfs = (oldRx ?? []).map((p) => p.pdf_path).filter(Boolean);
  if (pdfs.length) await supabase.storage.from("prescriptions").remove(pdfs);
}
await deleteIn("reviews", "booking_id", oldBookingIds);
await deleteIn("prescriptions", "booking_id", oldBookingIds); // its medicines go with it (cascade)
await deleteIn("payments", "booking_id", oldBookingIds);
await deleteIn("bookings", "id", oldBookingIds);
await deleteIn("chat_requests", "patient_id", patientIds); // messages go with it (cascade)
await deleteIn("symptom_checks", "patient_id", patientIds); // conditions go with it (cascade)

// Past slots of the test doctors that nobody booked are leftovers.
let removedSlots = 0;
for (const doctorId of allTestDoctorIds) {
  const { data: past } = await supabase.from("availability_slots").select("id, bookings(id)").eq("doctor_id", doctorId).lt("starts_at", iso(NOW));
  const unused = (past ?? []).filter((s) => s.bookings.length === 0).map((s) => s.id);
  await deleteIn("availability_slots", "id", unused);
  removedSlots += unused.length;
}
console.log(`Removed old activity: ${oldBookingIds.length} bookings and ${removedSlots} unused past slots.`);

// The test accounts were created recently, but the activity goes back a month,
// so their "joined" date moves back to before it (only once).
for (const [i, account] of [...patients, ...doctors].entries()) {
  if (new Date(profileById.get(account.id).created_at).getTime() > NOW - 35 * DAY) {
    await supabase.from("profiles").update({ created_at: iso(NOW - (40 + ((i * 7) % 30)) * DAY) }).eq("id", account.id);
  }
}

// ---------------------------------------------------------------------------
// 3. Slots: reuse the doctors' existing ones where possible
// ---------------------------------------------------------------------------

const slotByKey = new Map(); // "<doctor id>|<start ISO>" -> { id, endsAt, taken }
for (const doctor of doctors) {
  const { data } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, bookings(status)")
    .eq("doctor_id", doctor.id)
    .gte("starts_at", iso(NOW - (DAYS_BACK + 2) * DAY));
  for (const s of data ?? []) {
    slotByKey.set(`${doctor.id}|${iso(new Date(s.starts_at).getTime())}`, {
      id: s.id,
      endsAt: new Date(s.ends_at).getTime(),
      taken: s.bookings.some((b) => b.status === "confirmed" || b.status === "pending_payment"),
    });
  }
}

let newSlots = 0;
// A free slot for this doctor within `daysAhead` days after `afterMs`: one
// that's over before today, or with `ahead`, one from tomorrow on. The first
// day and time to try use exactly two "random" numbers, and the rest of the
// search uses none, so the slots already in the database never change the
// rest of the made-up data.
async function findSlot(doctor, afterMs, daysAhead, ahead) {
  const times = SLOT_TIMES.length;
  const candidates = (daysAhead + 1) * times;
  const first = between(0, daysAhead) * times + between(0, times - 1);
  for (let k = 0; k < candidates; k++) {
    const i = (first + k) % candidates;
    const start = atNairobi(nairobiDate(afterMs + Math.floor(i / times) * DAY), SLOT_TIMES[i % times]);
    const endsAt = start + doctor.minutes * MINUTE;
    if (start < afterMs + 45 * MINUTE) continue;
    if (ahead ? start < TODAY + DAY || doctor.keepFutureFree : endsAt > TODAY) continue;
    const key = `${doctor.id}|${iso(start)}`;
    const existing = slotByKey.get(key);
    if (existing) {
      // Reuse a free slot of the right length; skip one that's taken or different.
      if (existing.taken || existing.endsAt !== endsAt) continue;
      existing.taken = true;
      return { key, id: existing.id, startsAt: start, endsAt };
    }
    const id = randomUUID();
    const { error } = await supabase.from("availability_slots").insert({
      id, doctor_id: doctor.id, starts_at: iso(start), ends_at: iso(endsAt), created_at: iso(Math.min(afterMs, NOW) - 2 * DAY),
    });
    if (error?.code === "23P01") continue; // overlaps a slot the doctor made themselves
    if (error) throw error;
    newSlots++;
    slotByKey.set(key, { id, endsAt, taken: true });
    return { key, id, startsAt: start, endsAt };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. Make up the activity
// ---------------------------------------------------------------------------

// Saved in this order, so a symptom check exists before the booking that points to it.
const rows = { symptom_checks: [], symptom_check_conditions: [], bookings: [], payments: [], prescriptions: [], prescription_items: [], reviews: [], chat_requests: [], messages: [] };
// bookings.symptom_check_id only exists once migration 0009 has been run.
const { error: noShareColumn } = await supabase.from("bookings").select("symptom_check_id").limit(1);
const canShareChecks = !noShareColumn;
if (!canShareChecks) console.warn("Symptom checks aren't linked to bookings: run supabase/migrations/0009_patient_file.sql first.");
const completed = []; // paid consultations that are over (for follow-ups)
const pendingChats = new Set();
let reviewsOfKiprop = [];

function doctorFor(specialty) {
  const matching = doctors.filter((d) => d.specialty_id === specialty);
  return matching.length ? pick(matching) : pick(doctors.filter((d) => d.specialty_id === "general_practice"));
}

function ratingFor(doctor) {
  return Math.max(1, Math.min(5, Math.round(doctor.ratingMean + (random() - 0.5) * 2.6)));
}

// checkId: the symptom check this booking follows, shared with the doctor (like hold_slot() does).
async function book(patient, doctor, createdAt, daysAhead, scenario, { followUp = false, ahead = false, checkId = null } = {}) {
  if (!doctor || createdAt >= TODAY) return;
  const slot = await findSlot(doctor, createdAt, daysAhead, ahead);
  if (!slot) return;

  const minutes = (slot.endsAt - slot.startsAt) / MINUTE;
  const amount = doctor.fee_type === "per_session" ? doctor.fee_kes : Math.ceil((doctor.fee_kes * minutes) / 60);
  const bookingId = randomUUID();
  const phone = patient.phone ?? "254708374149";
  const paid = chance(0.85);
  const confirmedAt = createdAt + between(1, 3) * MINUTE;

  rows.bookings.push({
    id: bookingId, patient_id: patient.id, slot_id: slot.id, status: paid ? "confirmed" : "expired",
    amount_kes: amount, created_at: iso(createdAt), confirmed_at: paid ? iso(confirmedAt) : null,
    ...(canShareChecks ? { symptom_check_id: checkId } : {}),
  });

  if (!paid) {
    slotByKey.get(slot.key).taken = false; // the hold ran out, so the slot is free again
    const [code, desc] = pick(PAYMENT_FAILURES);
    rows.payments.push({
      booking_id: bookingId, phone, checkout_request_id: checkoutId(createdAt), merchant_request_id: `${between(10000, 99999)}-${between(1000000, 9999999)}-1`,
      status: "failed", result_code: code, result_desc: desc, created_at: iso(createdAt + 30_000), completed_at: iso(createdAt + 90_000),
    });
    return;
  }

  if (chance(0.1)) {
    // First attempt cancelled on the phone, second one paid.
    rows.payments.push({
      booking_id: bookingId, phone, checkout_request_id: checkoutId(createdAt), merchant_request_id: `${between(10000, 99999)}-${between(1000000, 9999999)}-1`,
      status: "failed", result_code: 1032, result_desc: "Request cancelled by user", created_at: iso(createdAt + 10_000), completed_at: iso(createdAt + 40_000),
    });
  }
  rows.payments.push({
    booking_id: bookingId, phone, checkout_request_id: checkoutId(createdAt), merchant_request_id: `${between(10000, 99999)}-${between(1000000, 9999999)}-1`,
    status: "success", mpesa_receipt: receipt(), result_code: 0, result_desc: "The service request is processed successfully.",
    created_at: iso(confirmedAt - 40_000), completed_at: iso(confirmedAt),
  });

  if (slot.endsAt > TODAY) return; // upcoming consultation: nothing more yet

  completed.push({ patient, doctor, slot });

  // Prescription (not for counselling).
  if (scenario?.items && chance(0.85)) {
    const created = slot.endsAt + between(5, 45) * MINUTE;
    if (created < TODAY) {
      const rxId = randomUUID();
      rows.prescriptions.push({
        id: rxId, booking_id: bookingId, diagnosis: (followUp ? "Follow-up: " : "") + scenario.diagnosis,
        notes: pick(["Review in one week if not better.", "Drink plenty of water and rest.", "Book a follow-up chat if you have questions.", null]),
        created_at: iso(created),
      });
      for (const [medicine_name, dosage, frequency, duration, instructions] of scenario.items) {
        rows.prescription_items.push({ prescription_id: rxId, medicine_name, dosage, frequency, duration, instructions });
      }
    }
  }

  // Review.
  const reviewedAt = slot.endsAt + between(1, 48) * HOUR;
  if (chance(0.72) && reviewedAt < TODAY) {
    const rating = ratingFor(doctor);
    const review = { booking_id: bookingId, rating, comment: chance(0.75) ? pick(COMMENTS[rating]) : null, created_at: iso(reviewedAt) };
    rows.reviews.push(review);
    if (doctor.email === "dr.kiprop@afyalink.test") reviewsOfKiprop.push(review);
  }

  // Free follow-up chat.
  const chatAt = slot.endsAt + between(1, 4) * DAY + between(0, 10) * HOUR;
  const pairKey = `${patient.id}|${doctor.id}`;
  if (chance(0.25) && chatAt < TODAY - HOUR) {
    const chatId = randomUUID();
    const waiting = chatAt > TODAY - 36 * HOUR && chance(0.5) && !pendingChats.has(pairKey);
    if (waiting) {
      pendingChats.add(pairKey);
      rows.chat_requests.push({ id: chatId, patient_id: patient.id, doctor_id: doctor.id, status: "pending", created_at: iso(chatAt) });
    } else if (chance(0.82)) {
      const respondedAt = Math.min(chatAt + between(10, 150) * MINUTE, TODAY - 10 * MINUTE);
      let t = respondedAt;
      const conversation = pick(CHATS);
      conversation.forEach((body, i) => {
        t += between(3, 40) * MINUTE;
        if (t < TODAY && t < respondedAt + 3 * HOUR) {
          rows.messages.push({ chat_request_id: chatId, sender_id: i % 2 === 0 ? patient.id : doctor.id, body, created_at: iso(t) });
        }
      });
      const readAt = iso(Math.min(t + 5 * MINUTE, TODAY));
      rows.chat_requests.push({
        id: chatId, patient_id: patient.id, doctor_id: doctor.id, status: "accepted", created_at: iso(chatAt), responded_at: iso(respondedAt),
        patient_last_read_at: readAt, doctor_last_read_at: readAt,
      });
    } else {
      const respondedAt = Math.min(chatAt + between(20, 300) * MINUTE, TODAY - 10 * MINUTE);
      rows.chat_requests.push({
        id: chatId, patient_id: patient.id, doctor_id: doctor.id, status: "rejected", created_at: iso(chatAt), responded_at: iso(respondedAt),
        patient_last_read_at: iso(Math.min(respondedAt + HOUR, TODAY)), doctor_last_read_at: iso(respondedAt),
      });
    }
  }
}

// A patient checks their symptoms and often books the suggested kind of doctor.
// With `ahead`, they book a time in the coming days instead of the first free one.
async function symptomCheck(at, ahead = false) {
  const patient = pick(patients);
  const checkId = randomUUID();

  if (chance(0.05)) {
    // Red flag: told to go to hospital, no AI, no booking (like the real app).
    rows.symptom_checks.push({ id: checkId, patient_id: patient.id, symptoms: pick(RED_FLAGS), red_flag_triggered: true, urgency: "emergency", suggested_specialty_id: null, created_at: iso(at) });
    return;
  }

  const scenario = weightedPick(SCENARIOS);
  rows.symptom_checks.push({
    id: checkId, patient_id: patient.id, symptoms: scenario.symptoms, red_flag_triggered: false,
    urgency: scenario.urgency, suggested_specialty_id: scenario.specialty, created_at: iso(at),
  });
  scenario.conditions.forEach((condition_name, i) => rows.symptom_check_conditions.push({ symptom_check_id: checkId, rank: i + 1, condition_name, explanation: null }));

  if (scenario.urgency !== "emergency" && chance(0.75)) {
    const daysAhead = ahead ? 4 : scenario.urgency === "within_24_hours" ? 1 : 3;
    await book(patient, doctorFor(scenario.specialty), at + between(4, 40) * MINUTE, daysAhead, scenario, { ahead, checkId });
  }
}

// A returning patient books the same doctor again, without a new symptom check.
async function followUpBooking(at) {
  const earlier = completed.filter((c) => c.slot.endsAt < at - 5 * DAY);
  if (earlier.length === 0) return symptomCheck(at);
  const { patient, doctor } = pick(earlier);
  const scenario = weightedPick(SCENARIOS.filter((s) => s.specialty === doctor.specialty_id));
  await book(patient, doctor, at, 4, scenario, { followUp: true });
}

// From 30 days ago up to yesterday: more activity each week, and one quieter
// day a week (counted back from today, so it doesn't depend on the weekday).
for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo--) {
  const date = nairobiDate(TODAY - daysAgo * DAY + 12 * HOUR);
  const quiet = daysAgo % 7 === 0;
  const expected = (1.6 + (2.4 * (DAYS_BACK - daysAgo)) / DAYS_BACK) * (quiet ? 0.6 : 1);
  const count = Math.floor(expected + random());
  for (let n = 0; n < count; n++) {
    const at = atNairobi(date, "00:00") + between(7 * 60, 21 * 60) * MINUTE; // 07:00–21:00
    if (chance(0.15)) await followUpBooking(at);
    else await symptomCheck(at);
  }
}

// Patients who checked their symptoms yesterday and booked a time in the next
// few days: the upcoming consultations.
for (let i = 0; i < 12; i++) await symptomCheck(TODAY - between(1, 16) * HOUR, true);

if (reviewsOfKiprop.length) {
  Object.assign(reviewsOfKiprop[0], { rating: 1, comment: ABUSIVE_COMMENT });
}

// ---------------------------------------------------------------------------
// 5. Save it (parents before children, because of the foreign keys)
// ---------------------------------------------------------------------------

for (const table of Object.keys(rows)) await insertAll(table, rows[table]);

const paid = rows.bookings.filter((b) => b.status === "confirmed");
console.table({
  "Symptom checks": rows.symptom_checks.length,
  "  of which red flags": rows.symptom_checks.filter((c) => c.red_flag_triggered).length,
  "Bookings": rows.bookings.length,
  "  paid": paid.length,
  "  paid, consultation over": completed.length,
  "  paid, upcoming": paid.length - completed.length,
  "  unpaid (hold ran out)": rows.bookings.length - paid.length,
  "M-Pesa payments": rows.payments.length,
  "Prescriptions": rows.prescriptions.length,
  "Reviews": rows.reviews.length,
  "Chat requests": rows.chat_requests.length,
  "Chat messages": rows.messages.length,
  "New slots": newSlots,
});
console.log(`Revenue from made-up payments: KES ${paid.reduce((sum, b) => sum + b.amount_kes, 0).toLocaleString("en-KE")}`);
