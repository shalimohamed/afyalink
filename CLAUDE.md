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
| Video | **LiveKit Cloud, free "Build" plan** ($0, no card, 5,000 WebRTC minutes a month, EU region). Room `consult-<booking id>` is created automatically on first join; access tokens are made server-side with `livekit-server-sdk`; the UI is `@livekit/components-react` (`PreJoin`, then `LiveKitRoom` + `VideoConference`). Switched from Daily.co on 2026-10-11 because Daily required a card (`allow_plan_free: false`, with a $15 charge). Jitsi was dropped earlier because the public meet.jit.si limits embedded calls |
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
LIVEKIT_URL=             # wss://<project>.livekit.cloud (not secret, passed to the browser as a prop)
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
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
- **On hold (not now):** extra features (passing the symptom-check result to the doctor, a red-flag yes/no checklist, Swahili input, a consent screen, red-flag tests).

## Build plan (7 weeks)
1. **Setup and database:** Supabase project, tables, RLS, and auth with the three roles (patient / doctor / admin), plus `/register` and `/login` pages.
2. **Doctor side:** registration with credential upload, admin verification queue, and availability slots.
3. **Symptom checker:** red-flag rules, the Claude API suggestion (possible conditions, specialty, urgency), and routing to matching verified doctors.
4. **Booking flow:** browse and filter verified doctors, book a slot (with the 5-minute hold), and pay via M-Pesa STK Push with the callback.
5. **Consultation:** LiveKit video room for paid bookings, follow-up text chat requests (3-hour window) over Supabase Realtime, and the doctor writing a prescription (PDF).
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
- ✅ **Phase 4 written (type-checks and lints; Daraja OAuth works with Shali's sandbox keys; the callback rejects a missing or wrong secret with 401; no real STK push sent yet):** `/patient/doctors` (specialty filter chips), `/patient/doctors/[id]` (free slots via `get_available_slots`, reviews via `get_doctor_reviews`, "Book" → `holdSlot` → `hold_slot` RPC), `/patient/bookings/[id]` (5-min `HoldTimer`, `PayForm` → `startPayment` → STK Push, `PaymentWatcher` refreshes every 4 s, a "check status" button → `checkPayment` → STK Query), `/patient/bookings` list. `lib/mpesa.ts` (sandbox OAuth, STK Push, STK Query), `lib/payments.ts` `recordPaymentResult` (the only place a booking gets confirmed; idempotent; checks the amount; confirms even after the hold expired unless the slot was taken, when the unique index blocks it and a refund is logged), `app/api/payments/callback/route.ts` (constant-time secret check). The callback path avoids the word "mpesa" because Daraja rejects URLs containing it. ngrok (Microsoft Store version; config at `%LOCALAPPDATA%\Packages\ngrok.ngrok_*\LocalCache\Local\ngrok\ngrok.yml`): until 2026-10-11 the saved authtoken was the literal placeholder `$YOUR_AUTHTOKEN` (copied from a dashboard example), so ngrok had never actually run. It was fixed by putting the real token in `.env.local` as `NGROK_AUTHTOKEN` and running `ngrok config add-authtoken` from it. When checking, compare the value, not just that the line exists. Tunnel verified online that day. **Next 16 blocks dev-server resources for other hostnames**, so on a phone over ngrok the page rendered but never hydrated: the Join button stayed disabled and no camera prompt appeared. Fixed with `allowedDevOrigins: ["partition-grout-surreal.ngrok-free.dev"]` in `next.config.ts` (dev only; restart `npm run dev` after changing it); free domain `partition-grout-surreal.ngrok-free.dev`. Run `ngrok http 3000 --url https://partition-grout-surreal.ngrok-free.dev` when testing payments.
- ✅ **Phase 5 written (type-checks and lints; the prescription PDF was rendered through the dev server and looks right; `next build` passes for all 22 routes; the in-app flows haven't been clicked through yet):**
  - **Video (LiveKit since 2026-10-11; two-person call tested by Shali that day: patient on the laptop, Dr. Amina on an iPhone with Safari over the ngrok HTTPS URL. Passed):** `lib/livekit.ts` (`createVideoToken`: identity = user id, name, TTL until 30 min after the slot ends, `roomAdmin` for the doctor), `/consultation/[id]` (shared by patient and doctor; tokens only issued while `callWindow === "open"`, i.e. 15 min before to 30 min after), `VideoCall.tsx` (client: `PreJoin` → `LiveKitRoom` + `VideoConference`, "Rejoin" after leaving). `supabase/migrations/0003_drop_video_room_url.sql` drops the now-unused `bookings.video_room_url` (run by Shali on 2026-10-11; verified the column is gone). Daily code was removed.
  - **Prescriptions:** `lib/prescriptionPdf.tsx` (`@react-pdf/renderer`, which is on Next's built-in server-external list so it needs no config), `/doctor/consultations` (list) and `/doctor/consultations/[id]/prescription` (`PrescriptionForm` with repeating medicine rows → `issuePrescription`, PDF uploaded as the doctor under storage RLS to `prescriptions/<id>/prescription-<ts>.pdf`, "Create PDF" retry), `components/PrescriptionView.tsx` (10-minute signed download link), also shown on the patient's booking page.
  - **Follow-up chat:** `lib/chats.ts` (state waiting/open/closed/rejected computed from `responded_at` + 3 h), `/chat` list (doctor accepts or rejects inline), `/chat/[id]` (`ChatRoom` = Realtime INSERT subscription plus a browser-client insert under RLS `chat_is_open`; `StatusWatcher` refreshes when the doctor answers; rejection shows the automated "Please book a consultation…" message). Fix on 2026-10-11 after Shali reported "the doctor doesn't receive chats": Realtime itself works (verified from Node), but the `/chat` list never updated and showed no messages. It now shows each chat's latest message (`loadChats` uses a referenced-table order/limit), sorts by latest activity, and `LiveRefresh.tsx` refreshes on Realtime events plus every 15 s. `ChatRoom` also re-fetches messages every 5 s as a fallback. **Shali tested the follow-up chat in the browser on 2026-10-11 (patient ↔ Dr. Amina): passed.** `lib/supabase/client.ts` is the browser client. `requireUser()` was added to `lib/auth.ts`; `/consultation` and `/chat` were added to `PROTECTED` in `proxy.ts`.
  - `docs/testing.md` has steps 9–11 for this phase.
- ✅ **Google login (patients only), added 2026-10-11; code done, the Google Cloud and Supabase provider setup is Shali's to do.** `components/GoogleButton.tsx` → `signInWithGoogle` server action (in `app/(auth)/login/actions.ts`, using `signInWithOAuth` with PKCE and `redirectTo` = `<origin>/auth/callback`) → `app/auth/callback/route.ts` (`exchangeCodeForSession`, then redirect by role; on failure goes to `/login?error=google`). New Google users become patients through the existing trigger (Google's `full_name` metadata fills the profile; phone stays empty, and the pay form asks for it). Doctors must use the form; the doctor tab explains why. The Supabase **Redirect URLs** allow-list must include `http://localhost:3000/auth/callback` (and the Vercel URL later). Google redirect URI: `https://lxmazsnuphsliqhjijgm.supabase.co/auth/v1/callback`.
- ✅ **Google login tested by Shali (2026-10-11):** works, and creates a patient with the Google name. "Confirm email" is now off in Supabase.
- ✅ **Test data seed script:** `npm run seed` (`scripts/seed-test-data.mjs`, service role, safe to re-run) creates 6 verified doctors (one per specialty; Dr. Amina Otieno is a GP at KES 100 for payment tests) with 22 slots each over 5 days, 1 pending doctor (Dr. Lucy Njeri, psychiatry), and `admin@afyalink.test`. All use `@afyalink.test` emails, `TEST-` registration numbers and the password `AfyaLink-Test-2026`. Seeded and checked on 2026-10-11.
- ✅ **Tested by Shali on 2026-10-11:** prescription (written by the doctor, PDF stored and downloaded) and M-Pesa payment (the sandbox test number `0708374149` confirms). Those payments were confirmed by the "check status" button (STK Query, so no receipt) because ngrok wasn't working yet; **a real Safaricom callback through ngrok hasn't been seen yet.**
- ✅ **Admin verification tested by Shali (2026-10-11):** approved Dr. Lucy Njeri, who then appeared on the patient side. The seed now only sets her to pending when it first creates her, so re-running it keeps an admin's decision (she now has slots too).
- 🐞 **Fixed 2026-10-11:** `queryStkPush` treated ResultCode 4999 "still under processing" as failed, and `recordPaymentResult` then ignored a later success, so a patient could pay without getting the booking. Now 4999 counts as pending; a success always overrides an earlier failure; a success is never undone; a late callback fills in a missing receipt. Verified with a temporary booking: cancelled → paid → failed again gives success + receipt + confirmed booking; the test data was deleted.
- ✅ **Phase 6 features written (2026-10-11; type-check and lint pass; charts checked visually in light/dark/narrow via headless Chrome; not yet clicked through by Shali):**
  - **Reviews:** `ReviewForm` on `/patient/bookings/[id]` once the slot has ended (`submitReview`; RLS `booking_has_ended` + unique booking_id); the doctor dashboard shows the average from `get_doctor_ratings`.
  - **Medical history:** `/patient/history` = "My details" (DOB, sex, phone → `updateDetails`) + one timeline of symptom checks and paid consultations with prescriptions (signed PDF links).
  - **Admin users:** `/admin/users` (role filter chips, name search, email and last login from the Auth admin API via the service role, suspend/reactivate = `ban_duration` 876000h / none; admins and yourself can't be suspended). Login shows "account suspended" for `user_banned` (verified with a throwaway user).
  - **Admin analytics:** `/admin` now uses `admin_analytics()` from `supabase/migrations/0004_admin_analytics.sql` (**Shali must run it**), which returns aggregates only (counts, revenue, per-day, per-specialty, urgency). Charts are plain HTML/CSS (`components/charts/ColumnChart.tsx`, `BarList.tsx`) with hover/focus tooltips and a table view. Chart colours are tokens `--chart-*` in `globals.css`, validated with the dataviz validator (light #0E7A5C/#977D00/#B3261E, dark #2A9A76/#B39012/#E5506A; urgency always has a label + icon). Headless Chrome on Windows won't go below 504 px wide, so a "cropped" 390 px screenshot isn't real overflow.
- ✅ **"Extraordinary" interactive layer (2026-10-11, at Shali's and the supervisor's request; type-check, lint and `next build` pass; checked visually with headless Chrome; not yet clicked through by Shali):**
  - **Landing:** big photo hero (`patient-wave.jpg`) with the SymptomDemo card overlapping it, a "Video consultation" chip with a live dot, a 3-photo mosaic section with captions, a larger slideshow photo area (1.45fr, 600px) and a bigger doctors photo (4:3). Only the existing 5 photos are used, so some appear twice; more free photos could be added later.
  - **3D companions:** `components/companion/Figure3D.tsx` (Three.js r186 + @react-three/fiber 9.8; a toon-shaded figure built from primitives, no model files; breathes, blinks, head follows the pointer, waves on tap; `calm` when reduce-motion) and `Companion.tsx` (loaded with `next/dynamic` and `ssr:false`; speech bubble with prioritised messages). "Daktari" (doctor) is on `/patient`; "Mwananchi" (patient figure) is on `/doctor`.
  - **Patient dashboard:** `lib/patientDashboard.ts` (messages: next consultation, prescription ready, review due, open chat, then daily-rotating Kenyan health tips; journey flags), `components/dashboard/Countdown.tsx` (live; "Join video call" once the window opens), `JourneyTracker.tsx` (6 steps, the current one pulses), `BodyMap.tsx` (SVG regions → symptom chips → `/patient/check?symptoms=…` prefill; the chest shows the 999/112 warning), `WellnessCheckin.tsx` (mood, water 8 glasses, streak, confetti; **localStorage only**, through a `useSyncExternalStore` store).
  - **Doctor dashboard:** `lib/doctorDashboard.ts` (today's slots with states and patient names, this week's earnings Mon–Sun, messages: next patient, pending chats, missing prescriptions, no slots, tips), `components/dashboard/DayTimeline.tsx` (07:00–21:00, initials on booked slots, a "now" line updated every 30 s), and the earnings `ColumnChart` (`labelEvery={1}`).
  - Headless screenshot tips: use a **fresh `--user-data-dir`** each time (a reused profile stopped rendering WebGL), use `--use-angle=swiftshader --enable-unsafe-swiftshader`, use `--timeout` (not `--virtual-time-budget`, which never settles with a render loop), and load the page once first so the dev server compiles the Three.js chunk.
- ⏭️ **Next: Phase 6, deployment:** ratings and reviews (patient reviews a finished consultation), patient medical history page (symptom checks, consultations, prescriptions), admin analytics dashboard (and managing users), then deploying to Vercel (env vars, a stable callback URL instead of ngrok).

## Design notes
- The landing page uses plain CSS classes in `app/globals.css` driven by colour tokens (`--bg`, `--ink`, `--accent`, and so on) with light and dark themes. Reuse those tokens in new pages so the app looks consistent.
- Fonts come from `next/font/google`: Bricolage Grotesque for display, Figtree for body text and JetBrains Mono for labels. They're exposed as `--af-display`, `--af-body` and `--af-mono`.
