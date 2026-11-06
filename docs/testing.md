# AfyaLink manual test script

Run through this before each presentation. It takes about 30 minutes.
Tick each step. If one fails, stop and note **the step number, what you saw, and any red text in the VS Code terminal**.

Only type **made-up symptoms**. The free Gemini tier may use them to improve Google's products.

---

## 0. Setup

- [ ] Supabase → **Authentication → Sign In / Providers → Email**: "Confirm email" is **off**.
- [ ] Terminal 1: `npm run dev` → "Ready".
- [ ] Terminal 2 (only needed for step 7): `ngrok http 3000 --url https://partition-grout-surreal.ngrok-free.dev`
- [ ] Use **two browser windows**: a normal one for the patient, and a private/incognito one for the doctor and admin. Then you don't have to keep logging in and out.
- [ ] `npm test` → every red-flag test passes.
- [ ] Migration `0010_privacy_fixes.sql` has been run (after updating the code).

**Shortcut:** `npm run seed` creates ready-made test accounts (password for all: `AfyaLink-Test-2026`):

| Who | Email | Notes |
|---|---|---|
| Dr. Amina Otieno | `dr.amina@afyalink.test` | **General practitioner, KES 100**, verified, slots for 5 days. Use her for payment tests. |
| 12 more verified doctors | `dr.kiprop@`, `dr.wanjiru@`, `dr.mwangi@`, `dr.hassan@`, `dr.ochieng@`, `dr.kamau@`, `dr.abdi@`, `dr.chebet@`, `dr.kiptoo@`, `dr.achieng@`, `dr.shah@`, `dr.wambui@` (all `@afyalink.test`) | every specialty has at least one |
| Dr. Lucy Njeri | `dr.njeri@afyalink.test` | psychiatry, verified by an admin during testing |
| Dr. Samuel Mutua, Dr. Collins Wekesa | `dr.mutua@`, `dr.wekesa@` (both `@afyalink.test`) | dermatology and ENT, **pending**: must stay hidden from patients until the admin approves |
| Admin | `admin@afyalink.test` | |
| 25 patients | `<first>.<last>@afyalink.test`, e.g. `wanjiku.mwangi@afyalink.test` | made up, with a date of birth and sex but no bookings yet. Enter the sandbox number when paying. |

With the seed data you can skip creating accounts in steps 2–3 and use Dr. Mutua or Dr. Wekesa for the admin review tests. Still try registering one doctor by hand once, to test the form and certificate upload.

**Made-up activity:** `npm run seed:activity` (after `npm run seed`) fills the last 30 days with symptom checks, bookings, payments, prescriptions, reviews and chats for the 25 test patients, so the admin dashboard has something to show. Each run **deletes and recreates** that activity, including anything you did yourself while logged in as a test patient, and gives the **same numbers every time** (only the dates move along with today). Your own account is never touched.

---

## 1. Patient registration and login

- [ ] `/register` → register the patient → you land on **/patient** with "Hi, *name*".
- [ ] **Log out** → you land on /login. Log in again → back on /patient.
- [ ] Log in with a wrong password → "Wrong email or password."
- [ ] While logged out, open `/patient` → you're sent to /login.
- [ ] The landing, login and register pages show the "Student demo" line at the top.
- [ ] **Forgot your password?** → enter **your own** email (Supabase's built-in email only reaches members of your Supabase team, about 2 emails an hour) → "If … has an AfyaLink account, we've emailed it a link". Open the link **in the same browser** → "Choose a new password" → save → you land on your dashboard and can log in with the new password. Opening the same link again → "That link has expired, was already used…".
- [ ] Open a made-up address like `/nothing-here` → AfyaLink's "Page not found" with a button back.

## 2. Doctor registration

- [ ] Incognito: `/register?role=doctor` → register **Doctor A** → **/doctor** shows "Your registration is being reviewed".
- [ ] Log out, then try registering another doctor with **the same registration number** → error on that field.
- [ ] Register **Doctor B** (different email and registration number). Log out.

## 3. Admin verification

- [ ] Create the admin by following "Creating an admin account" at the end of `docs/database.md`.
- [ ] Incognito: log in as admin → **/admin** shows 1 patient, 2 doctors, 2 waiting.
- [ ] **Doctors waiting for verification** → **Open certificate** opens the PDF.
- [ ] **Reject** Doctor A with no reason → error asking for a reason. Reject with "Certificate unclear" → moves to "Reviewed".
- [ ] Log in as Doctor A → red "not approved" message with the reason, plus an upload form. Upload a PDF → back to "being reviewed".
- [ ] Admin → **Approve** Doctor A. Leave Doctor B waiting.
- [ ] Doctor A's dashboard now says "You're verified".

## 4. Doctor availability

- [ ] Doctor A → **Availability** → add a 30-minute slot **later today** → "Slot added", listed as **Free**.
- [ ] Add another with **Repeat: 5 days in a row** at a different time → "5 slots added".
- [ ] Add a slot that **overlaps** an existing one → "This overlaps a slot you already have".
- [ ] Choose a time in the past → error.
- [ ] **Delete** one free slot → it disappears.

## 5. Symptom checker

- [ ] Patient → **Check your symptoms** → "I have a sore throat and pain when swallowing for 2 days" → results show **"This is not a diagnosis"**, possible conditions, a suggested doctor, urgency, and **Doctor A** under "Doctors who can help".
- [ ] Try "I have chest pain and my left arm feels numb" → red **emergency** box with "999 / 112", **no doctors listed**.
- [ ] Try "I want to end my life" → emergency box.
- [ ] Try a skin rash → suggested doctor is a Dermatologist. No dermatologist is verified, so it says so and shows GPs instead.

## 6. Browsing and holding a slot

- [ ] Patient → **Find a doctor** → only **Doctor A** is listed (**Doctor B is not**, because unverified). The specialty chips filter the list.
- [ ] Open Doctor A → free slots with prices → **Book** one → booking page with a **countdown from 5:00**.
- [ ] Doctor A's Availability page → that slot shows **"Patient is paying"** and has no Delete button.
- [ ] While that hold is running, **Book** a different slot → the first booking now says "Your 5-minute hold ran out" and its slot is bookable again (a patient holds one slot at a time).

## 7. M-Pesa payment (ngrok must be running)

- [ ] On the booking page, enter your Safaricom number → **Pay KES 100 with M-Pesa** → "Check your phone".
- [ ] Your phone shows the M-Pesa prompt → enter your PIN. (Sandbox: no real money should move. Check your M-Pesa SMS to be sure.)
- [ ] Within a few seconds the page changes to **"Your consultation is booked. 🎉"** with an M-Pesa receipt code.
  - If it doesn't change after 30 s: click **"I've paid: check status"**. If that works, the callback didn't reach us, so check the ngrok terminal for a `POST /api/payments/callback` line.
- [ ] Doctor A's Availability page → the slot is **Booked**.
- [ ] Patient → **My consultations** → the booking shows **Booked**.
- [ ] Supabase **Table Editor**: `bookings` → status `confirmed`. `payments` → status `success` with `mpesa_receipt`.

## 8. Failed and expired payments

- [ ] Book another slot → Pay → **cancel** the prompt on your phone → page shows "The payment didn't go through" and lets you try again.
- [ ] Book another slot and **don't pay**. Wait for the countdown to reach 0 → "Your 5-minute hold ran out". On Doctor A's page, the slot is **bookable again**.

## 9. Video call (use the slot paid for in step 7; book one starting within 15 minutes)

- [ ] Patient → the booking → **Join video call** appears from 15 minutes before the start. Before that, it says when the call opens.
- [ ] Doctor A → **Consultations** → **Join call**. Both windows show the camera and mic check, then **Join consultation** → you see and hear each other (LiveKit).
- [ ] Open the consultation link while logged in as a different patient → "not found".

## 9b. Patient file (run `0009_patient_file.sql` first)

- [ ] Patient → **History** → **My details** → choose a **Blood group** → **Save details** → "Saved".
- [ ] Patient → **Check symptoms** → open a doctor from the results → above the times it says "Once you've paid, Dr. … will see the symptoms you checked…". Book and pay.
- [ ] Doctor → **Consultations** → the booking shows "Symptoms: “…”" and a **Patient file** button (before the call opens) → the page shows age, sex, blood group, the symptoms, urgency and the AI suggestion. Only this one symptom check is there, not the patient's older ones.
- [ ] A patient who didn't check their symptoms first → the file says "The patient didn't check their symptoms before booking."

## 9c. Install on a phone (open the ngrok https:// address on the phone)

- [ ] Android (Chrome): log in → the dashboard shows "Install AfyaLink on this device…" → **Install** → AfyaLink appears on the home screen with the green plus icon and opens without the address bar.
- [ ] iPhone (Safari): log in → the bar says "tap Share, then Add to Home Screen" → do that → the AfyaLink icon opens it full screen.
- [ ] **Not now** hides the bar on that phone, also after a reload.

## 10. Prescription (during the call; run `0008_prescription_completes_consultation.sql` first)

- [ ] While both of you are in the call, the doctor's call page has the **Prescription** form next to the video. Submit with no medicine → error. Add 2 medicines (remove an empty row with ✕) → **Issue prescription**.
- [ ] The call keeps going on both sides. The doctor's panel says "Issued. This consultation is complete." and shows the prescription with **Download PDF** (opens in a new tab, so the call isn't left) → the PDF has the doctor, registration no., patient, diagnosis, medicines table and notes.
- [ ] The patient taps **Leave**, then **Rejoin** → they get back in, because the doctor is still in the call.
- [ ] Both tap **Leave**, then the patient taps **Rejoin** → "The consultation is complete and the call has ended."
- [ ] Patient → the booking → "Your consultation is complete.", **Your prescription** with **Download PDF**, and **Rate your consultation** straight away (even if the slot time isn't over). No **Join video call** button.
- [ ] Doctor → **Consultations** → the consultation is under **Past** with **Prescription ✓**. Before a consultation starts there's no **Write prescription** button.

## 11. Follow-up chat

- [ ] Patient → the booking → **Request a follow-up chat** → "Waiting for the doctor to accept".
- [ ] Request again for the same doctor → "You already have a request waiting".
- [ ] Doctor A → dashboard shows "1 waiting" → **Follow-up chats** → **Accept**. Within seconds, the patient's page switches to the chat **without reloading**.
- [ ] Send messages both ways. They appear in the other window **without reloading**.
- [ ] Make a second request and have the doctor **Reject** it → the patient sees "Please book a consultation to communicate with the doctor."
- [ ] (Optional, to test the 3-hour limit faster) In Supabase SQL Editor: `update chat_requests set responded_at = now() - interval '3 hours 1 minute' where status = 'accepted';` → reload: "This chat closed after 3 hours", no message box, and the patient can request again.

## 12. Reviews (needs a paid consultation whose time has passed)

- [ ] Patient → that booking → **Rate your consultation** → choose stars, add a comment → **Submit review** → it shows your review.
- [ ] Find a doctor → that doctor shows ★ with the review count; their profile lists the comment **without your name**.
- [ ] The doctor's dashboard shows the average rating.

## 13. Medical history

- [ ] Patient → **Medical history** → set date of birth, sex and phone → **Save details** → "Saved".
- [ ] The timeline lists symptom checks (with urgency) and consultations (with prescription and a **Prescription PDF** button).

## 14. Admin: users and analytics (run `0004_admin_analytics.sql` first)

- [ ] Admin → **Platform overview** shows revenue, stat tiles and three charts. Hovering a bar shows its value; **Show as table** lists the numbers.
- [ ] **Manage users** → filter by Patients/Doctors, search by name.
- [ ] **Suspend** a test patient → logging in as them says "This account has been suspended". **Reactivate** → login works again.
- [ ] **Platform overview** → the **AI overview** box first says "Gemini is reading the latest numbers…", then shows a headline and three lists that quote the numbers on the page. Reloading shows the same text straight away.
- [ ] **Download PDF report** → a 2-page PDF with the same AI overview, the key figures and the charts. Logged in as a doctor, `/api/admin/report` says "Only admins can download reports."
- [ ] Tap the **Average rating** card (or **Reviews** in the menu) → every review, with rating bars and filter chips. **1–2 ★** shows only low ratings, each tagged "low rating".
- [ ] **Doctors** filter → a doctor with reviews shows their rating and **View reviews** → each review shows the stars, comment, date and patient, and the patient's name opens them in the user list.
- [ ] (Run `0007_suspended_doctors.sql` first.) **Suspend** a verified doctor → as a patient, they're gone from search and the symptom-check results, and their page shows "not found". A "Book" button left open in another tab says "This doctor is not taking bookings." **Reactivate** → they're back.
- [ ] Suspend a doctor who has a **paid consultation coming up** → the patient's **My consultations** shows "Doctor unavailable"; the booking says the consultation won't take place and AfyaLink will refund the amount, with no Join or chat button, and the dashboard no longer counts it as the next consultation. Admin → **Manage users** shows "Refund due: KES … to <patient>" under that doctor. Reactivate → back to normal.
- [ ] Phone numbers: **Manage users** and **Verify doctors** still show phone numbers to the admin, and a patient's pay form is still filled in with their own number.

## 15. Role checks

- [ ] Logged in as the patient, open `/doctor` and `/admin` → you're sent back to /patient.
- [ ] Logged in as Doctor A, open `/admin` → sent back to /doctor.

---

**All ticked?** Commit, and note the date you last passed this script.
