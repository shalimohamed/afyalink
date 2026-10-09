@AGENTS.md

# AfyaLink — project context for Claude Code

## About me and this project
- I'm Shali, a software engineering student at USIU-Africa. AfyaLink is my project, and I need a **working demo in 7 weeks** (deadline around mid-November 2026).
- I know **JavaScript/React**. Explain new concepts (Supabase, server actions, RLS, Daraja) briefly as you use them, so I can defend the work in a presentation.
- Keep explanations short and plain. Build in small steps I can run and test, and tell me exactly which commands to run.
- I'm on **Windows** and use the VS Code terminal.

## What AfyaLink is
A telemedicine web app for Kenya. A patient describes their symptoms, AI suggests what type of doctor they need, and they browse verified doctors and pick one. They pay via M-Pesa, have a video consultation, and receive a digital prescription. Past patients can also send free follow-up text messages if the doctor accepts.

**Who it's for:** patients with mild issues that don't need a hospital visit: flu, skin conditions, mental health, follow-up consultations, lab result discussions and second opinions. It is **not for emergencies**.

## The three roles
- **Patient:** registers, describes symptoms, gets the AI suggestion, books a doctor, pays, consults, gets a prescription, rates the doctor, and views their medical history.
- **Doctor:** registers with credentials (KMPDC registration upload) and their consultation fee, publishes availability slots, conducts consultations and writes prescriptions. They can't take bookings until an admin verifies them.
- **Admin:** verifies doctor credentials, manages users and views platform analytics.

## Key features
- AI symptom checker that returns **possible conditions**, a suggested **specialty** and an **urgency level** (routine / within 24 hrs / emergency)
- M-Pesa payment (STK Push)
- Video consultations (every paid booking) and free follow-up text chat
- Digital prescriptions (PDF)
- Doctor ratings and reviews
- Medical history tracking
- Admin verification and analytics dashboard

## Tech stack (decided, don't change without asking)
| Area | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript. The version is newer than your training data, so read `node_modules/next/dist/docs/` first (see AGENTS.md) |
| Styling | Tailwind CSS v4, plus the design tokens in `app/globals.css` |
| Database, auth, storage | Supabase (Postgres, Supabase Auth, Storage, Realtime) via `@supabase/supabase-js` + `@supabase/ssr` |
| Access control | Postgres row-level security (patients see only their own records, and so on) |
| Chat | Supabase Realtime |
| Video | Daily.co embedded room (free tier), one per paid booking, created server-side with `DAILY_API_KEY`. Replaced Jitsi because the public meet.jit.si limits embedded calls |
| Payments | Safaricom Daraja API, STK Push, **sandbox only** for the demo. The callback needs a public HTTPS URL, so use ngrok in development |
| AI symptom checker | **Google Gemini API, free tier** (`@google/genai`, model `gemini-3.5-flash` with `thinkingLevel: LOW` (about 3 s; the default thinking took about 21 s), then `gemini-3.5-flash-lite` if it's busy; override the first with `GEMINI_MODEL`. `gemini-2.5-flash` is closed to new users and returns a 404. Gemini 3.5 rejects `thinkingBudget`, so use `thinkingLevel`), called server-side only, returning structured JSON. Switched from Claude on 2026-10-08 because there's no budget for a paid API. All AI code is in `lib/symptoms/gemini.ts`, so going back to Claude means rewriting one file. The free tier may use prompts to improve Google's products, so use **made-up symptoms only** in demos |
| Prescriptions | PDF generated with react-pdf or pdfkit and stored in Supabase Storage |
| Hosting | Vercel (app) + Supabase (database) |

## Rules to follow
- **Safety first in the symptom checker.** Hard-coded red-flag rules (chest pain, trouble breathing, heavy bleeding, sudden weakness or confusion, fainting, suicidal thoughts) run *before and regardless of* the AI. They must tell the patient to go to a hospital or call **999 / 112** and must never allow a booking. Always show that the AI suggestion is not a diagnosis.
- **Secrets stay server-side.** The Gemini API key, Daraja keys and the Supabase service-role key go in `.env.local` only, and are never used in client components or committed to git.
- **Unverified doctors** never appear in search results or accept bookings.
- A booking is only confirmed after the M-Pesa callback reports success, never on the client's word.
- Use Kenyan context: prices in **KES**, phone numbers in `2547XXXXXXXX` format for M-Pesa.
- Medical data is sensitive (Kenya Data Protection Act). Keep RLS on every table.
- Prefer simple, readable code over clever abstractions. This is a student demo.

## Environment variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=174379
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://partition-grout-surreal.ngrok-free.dev/api/payments/callback
MPESA_CALLBACK_SECRET=   # random; appended as ?secret=… so only Safaricom can post results
DAILY_API_KEY=
```

## Product decisions (agreed, not built yet)
- **Main patient flow:** the patient writes their symptoms, red-flag rules run first, then the AI lists possible conditions (clearly labelled "not a diagnosis") and suggests a specialty. The patient sees verified doctors in that specialty and books a slot.
- **Booking = confirmed on payment.** When a doctor publishes a slot, they've already agreed to it. There's no separate "doctor accepts the booking" step. A successful M-Pesa callback confirms the booking.
- **Slot hold.** When a patient starts paying, the slot is held for about 5 minutes. If the payment fails or times out, the slot is released so two patients can't pay for the same slot.
- **Doctors set their own fee** at registration (in KES) and choose the fee type:
  - **Per session** (fixed fee), or
  - **Per hour** (for example, therapists). The price is the hourly rate times the slot length the doctor set. The patient doesn't choose a duration.
- **Every paid booking is a video call.** There are no paid text consultations.
- **Follow-up text chat** (only between a patient and a doctor they've booked with before):
  - The patient sends a chat request, and the doctor accepts or rejects it.
  - **Rejected:** the patient gets an automated message: "Please book a consultation to communicate with the doctor."
  - Follow-up chat is **free**.
  - **Accepted:** chat is open for **3 hours**. When that time runs out, it closes, and the doctor has to accept or reject again.
- **Admin accounts** can't be chosen at registration. They're created directly in the database.
- **On hold (not now):** extra features (passing the symptom-check result to the doctor, a demo seed script, a red-flag yes/no checklist, Swahili input, a consent screen, red-flag tests).

## Build plan (7 weeks)
1. **Setup and database:** Supabase project, tables, RLS, and auth with the three roles (patient / doctor / admin), plus `/register` and `/login` pages.
2. **Doctor side:** registration with credential upload, admin verification queue, and availability slots.
3. **Symptom checker:** red-flag rules, the Claude API suggestion (possible conditions, specialty, urgency), and routing to matching verified doctors.
4. **Booking flow:** browse and filter verified doctors, book a slot (with the 5-minute hold), and pay via M-Pesa STK Push with the callback.
5. **Consultation:** Daily.co video room for paid bookings, follow-up text chat requests (3-hour window) over Supabase Realtime, and the doctor writing a prescription (PDF).
6. **Finishing:** ratings and reviews, patient medical history, admin analytics dashboard, and deploying to Vercel.

Each phase should end with something clickable and demo-able.

## Current status
- ✅ Tech stack chosen.
- ✅ **Landing page done** (`app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/SymptomDemo.tsx`). It includes the hero, an interactive symptom-checker demo with **sample data** (`EXAMPLES` in `SymptomDemo.tsx`), how-it-works steps, services, a full-width crossfading slideshow section between the hero and "How it works" (`components/Showcase.tsx`: big photo on the left, headline + text on the right; 4 slides, 5 s each, prev/next arrows, dots and a pause button, paused by default for "reduce motion"; the M-Pesa slide draws our own PIN prompt, no Safaricom logo), a doctor photo in the doctors band (`public/images/doctor.jpg`); photos are free Pexels/Unsplash images credited in the footer, a not-for-emergencies panel, a for-doctors section and trust points. The "Get started" and "Log in" buttons link to `/register` and `/login`, which don't exist yet.
- ✅ **Login and register pages (UI + server-side validation)** in `app/(auth)/`. Register has a patient/doctor toggle (`?role=doctor` preselects doctor) with doctor fields: specialty, registration number, licence upload (PDF/JPG/PNG, max 4 MB), fee type (per session / per hour) and fee in KES. Shared helpers: `lib/phone.ts` (normalises to `2547XXXXXXXX`) and `lib/specialties.ts`. The server actions validate but **don't save anything yet**; see the `TODO(Phase 1)` comments.
- ✅ **Database schema written (not yet run in Supabase).** `supabase/migrations/0001_tables.sql` (14 tables, 3NF) and `0002_security.sql` (RLS on every table, signup trigger `handle_new_user`, functions `hold_slot`, `get_available_slots`, `get_doctor_ratings`, `get_doctor_reviews`, `review_doctor`, `respond_chat_request`, private storage buckets `licences` and `prescriptions`, realtime for chat). Design and 3NF justification: `docs/database.md`. Key choices: `bookings` has no `doctor_id` (go through the slot); derived values (ratings, slot taken, hold expiry, chat expiry) are computed, not stored; bookings/payments are never written from the browser.
- ✅ **Git repo created** (branch `main`). Git isn't on PATH: Shali has GitHub Desktop, whose bundled git is at `%LOCALAPPDATA%\GitHubDesktop\app-<version>\resources\app\git\cmd\git.exe`. Use that path, or commit through GitHub Desktop.
- ✅ **Auth wired to Supabase (code written, not yet tested against the live project):** `lib/supabase/server.ts` (per-request client, RLS applies), `lib/supabase/admin.ts` (service role, `server-only`), `proxy.ts` (Next 16's renamed middleware: refreshes the session, sends logged-out users from `/patient`, `/doctor`, `/admin` to `/login`), `lib/auth.ts` (`requireRole()`, `HOME_FOR_ROLE`). Register calls `signUp` with metadata (the DB trigger creates the profile); doctor licences are uploaded with the service-role client to `licences/<id>/licence.<ext>`. Login redirects by role; `logout` is in `app/(auth)/login/actions.ts`. Placeholder dashboards are in `app/(dashboard)/`.
- ✅ **SQL run in Supabase** (14 tables, RLS and buckets verified via the REST API). `.env.local` has the Supabase URL plus publishable and secret keys. Note: Supabase rejects the secret key from anything with a browser-like User-Agent (including PowerShell's `Invoke-RestMethod` default), so set `-UserAgent` when testing.
- ✅ **Phase 2 written (type-checks and lints, not yet clicked through):** `/admin/doctors` verification queue (signed certificate links, approve/reject with a reason via the `review_doctor` RPC); doctor certificate re-upload on `/doctor` (`lib/licence.ts`, puts rejected doctors back to pending); `/doctor/slots` to add slots (Nairobi time, 30–120 min, repeat 5 days or 4 weeks; overlaps are blocked by the DB) and delete free ones. Shared pieces: `components/ActionButton.tsx` (a one-button server-action form with an error message) and `lib/time.ts` (EAT formatting, `slotPrice`).
- ⚠️ **Nothing since the schema has been tested by hand yet.** Shali chose to test later; the first test should cover register, login, then Phase 2.
- ✅ **Phase 3 written (type-checks and lints; red-flag rules tested with 21 sample sentences; the Gemini key is set, and the SDK call with the app's exact config was tested: valid JSON in about 3 s, and a prompt-injection attempt was ignored. The full in-app flow hasn't been clicked through yet):** `/patient/check` form, then the `checkSymptoms` action: `lib/symptoms/redFlags.ts` runs first (if it matches, no AI and no booking) → `lib/symptoms/gemini.ts` (JSON-schema output, every field validated) → `lib/symptoms/fallback.ts` (keyword specialty if the AI fails), saved to `symptom_checks` + `symptom_check_conditions`, then redirect to `/patient/check/[id]`. The results page shows "not a diagnosis", the conditions, specialty, urgency and matching verified doctors (`lib/doctors.ts` `getVerifiedDoctors`, `components/DoctorList.tsx`), falling back to GPs. Emergency urgency from the AI also blocks booking. Which red flags matched isn't stored; it's recomputed from the text.
- ✅ **Phase 4 written (type-checks and lints; Daraja OAuth works with Shali's sandbox keys; the callback rejects a missing or wrong secret with 401; no real STK push sent yet):** `/patient/doctors` (specialty filter chips), `/patient/doctors/[id]` (free slots via `get_available_slots`, reviews via `get_doctor_reviews`, "Book" → `holdSlot` → `hold_slot` RPC), `/patient/bookings/[id]` (5-min `HoldTimer`, `PayForm` → `startPayment` → STK Push, `PaymentWatcher` refreshes every 4 s, a "check status" button → `checkPayment` → STK Query), `/patient/bookings` list. `lib/mpesa.ts` (sandbox OAuth, STK Push, STK Query), `lib/payments.ts` `recordPaymentResult` (the only place a booking gets confirmed; idempotent; checks the amount; confirms even after the hold expired unless the slot was taken, when the unique index blocks it and a refund is logged), `app/api/payments/callback/route.ts` (constant-time secret check). The callback path avoids the word "mpesa" because Daraja rejects URLs containing it. ngrok (Microsoft Store version; config at `%LOCALAPPDATA%\Packages\ngrok.ngrok_*\LocalCache\Local\ngrok\ngrok.yml`) has its authtoken; free domain `partition-grout-surreal.ngrok-free.dev`. Run `ngrok http 3000 --url https://partition-grout-surreal.ngrok-free.dev` when testing payments.
- ✅ **Phase 5 written (type-checks and lints; the Daily API was tested live with the app's exact room and token settings, including the duplicate-room fallback; the prescription PDF was rendered through the dev server and looks right; the in-app flows haven't been clicked through yet):**
  - **Video:** `lib/daily.ts` (private rooms `consult-<booking id>`, open 15 min before to 30 min after, owner token for the doctor), `lib/videoRoom.ts` `ensureVideoRoom` (called by `recordPaymentResult` after confirmation, and lazily on the consultation page), `/consultation/[id]` (shared by patient and doctor; Daily Prebuilt in an iframe with `?t=token`). Daily domain: `afyalink-team.daily.co`.
  - **Prescriptions:** `lib/prescriptionPdf.tsx` (`@react-pdf/renderer`, which is on Next's built-in server-external list so it needs no config), `/doctor/consultations` (list) and `/doctor/consultations/[id]/prescription` (`PrescriptionForm` with repeating medicine rows → `issuePrescription`, PDF uploaded as the doctor under storage RLS to `prescriptions/<id>/prescription-<ts>.pdf`, "Create PDF" retry), `components/PrescriptionView.tsx` (10-minute signed download link), also shown on the patient's booking page.
  - **Follow-up chat:** `lib/chats.ts` (state waiting/open/closed/rejected computed from `responded_at` + 3 h), `/chat` list (doctor accepts or rejects inline), `/chat/[id]` (`ChatRoom` = Realtime INSERT subscription plus a browser-client insert under RLS `chat_is_open`; `StatusWatcher` refreshes when the doctor answers; rejection shows the automated "Please book a consultation…" message). `lib/supabase/client.ts` is the browser client. `requireUser()` was added to `lib/auth.ts`; `/consultation` and `/chat` were added to `PROTECTED` in `proxy.ts`.
  - `docs/testing.md` has steps 9–11 for this phase.
- ⏭️ **Next: Phase 6:** ratings and reviews (patient reviews a finished consultation), patient medical history page (symptom checks, consultations, prescriptions), admin analytics dashboard (and managing users), then deploying to Vercel (env vars, a stable callback URL instead of ngrok).

## Design notes
- The landing page uses plain CSS classes in `app/globals.css` driven by colour tokens (`--bg`, `--ink`, `--accent`, and so on) with light and dark themes. Reuse those tokens in new pages so the app looks consistent.
- Fonts come from `next/font/google`: Bricolage Grotesque for display, Figtree for body text and JetBrains Mono for labels. They're exposed as `--af-display`, `--af-body` and `--af-mono`.
