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

Test accounts to create (any emails work; nothing is sent):

| Who | Email | Notes |
|---|---|---|
| Patient | `patient1@test.com` | your real Safaricom number (for the M-Pesa prompt) |
| Doctor A | `doctor1@test.com` | **General practitioner**, per session, **KES 100**, any small PDF as certificate |
| Doctor B | `doctor2@test.com` | any specialty, never approved (to check unverified doctors stay hidden) |
| Admin | `admin@test.com` | created in Supabase (step 3) |

---

## 1. Patient registration and login

- [ ] `/register` → register the patient → you land on **/patient** with "Hi, *name*".
- [ ] **Log out** → you land on /login. Log in again → back on /patient.
- [ ] Log in with a wrong password → "Wrong email or password."
- [ ] While logged out, open `/patient` → you're sent to /login.

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
- [ ] Doctor A → **Consultations** → **Join call**. Both windows show the Daily call; allow camera and mic; you see and hear each other.
- [ ] Open the consultation link while logged in as a different patient → "not found".

## 10. Prescription

- [ ] Doctor A → Consultations → **Write prescription** → submit with no medicine → error. Add 2 medicines (remove an empty row with ✕) → **Issue prescription**.
- [ ] The prescription shows with **Download PDF** → the PDF has the doctor, registration no., patient, diagnosis, medicines table and notes.
- [ ] Patient → the booking → **Your prescription** shows with **Download PDF**.

## 11. Follow-up chat

- [ ] Patient → the booking → **Request a follow-up chat** → "Waiting for the doctor to accept".
- [ ] Request again for the same doctor → "You already have a request waiting".
- [ ] Doctor A → dashboard shows "1 waiting" → **Follow-up chats** → **Accept**. Within seconds, the patient's page switches to the chat **without reloading**.
- [ ] Send messages both ways. They appear in the other window **without reloading**.
- [ ] Make a second request and have the doctor **Reject** it → the patient sees "Please book a consultation to communicate with the doctor."
- [ ] (Optional, to test the 3-hour limit faster) In Supabase SQL Editor: `update chat_requests set responded_at = now() - interval '3 hours 1 minute' where status = 'accepted';` → reload: "This chat closed after 3 hours", no message box, and the patient can request again.

## 12. Role checks

- [ ] Logged in as the patient, open `/doctor` and `/admin` → you're sent back to /patient.
- [ ] Logged in as Doctor A, open `/admin` → sent back to /doctor.

---

**All ticked?** Commit, and note the date you last passed this script.
