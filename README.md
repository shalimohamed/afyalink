# AfyaLink

Telemedicine web app for Kenya (USIU-Africa student project). A patient describes their symptoms, red-flag rules and an AI suggest what kind of doctor they need, they book a verified doctor, pay with M-Pesa, have a video consultation and get a digital prescription.

**This is a demo, not a real medical service.** Use made-up names and symptoms: the AI is Google Gemini's free tier, which may use prompts to improve Google's products. Payments use the M-Pesa **sandbox** (no real money).

## Stack

| Area | Choice |
|---|---|
| App | Next.js 16 (App Router) + TypeScript, Tailwind CSS v4 + the tokens in `app/globals.css` |
| Database, login, files, chat | Supabase (Postgres with row-level security, Auth, Storage, Realtime) |
| Video | LiveKit Cloud |
| Payments | Safaricom Daraja STK Push (sandbox) |
| AI | Google Gemini (`@google/genai`), server-side only |
| PDFs | `@react-pdf/renderer` |

Next.js 16 differs from older versions (e.g. `proxy.ts` replaces middleware). Its docs are in `node_modules/next/dist/docs/`.

## Running it locally

You need **Node.js 22.18 or newer** (24 recommended) and access to the Supabase, LiveKit, Daraja and Gemini accounts (ask Shali).

1. `npm install`
2. Create `.env.local` in the project folder (it's git-ignored; **never commit it**):
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   GEMINI_API_KEY=
   MPESA_CONSUMER_KEY=
   MPESA_CONSUMER_SECRET=
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=
   MPESA_CALLBACK_URL=https://<public https address>/api/payments/callback
   MPESA_CALLBACK_SECRET=
   LIVEKIT_URL=
   LIVEKIT_API_KEY=
   LIVEKIT_API_SECRET=
   ```
   Only the two `NEXT_PUBLIC_` values may ever reach the browser. Everything else is secret.
3. `npm run dev`, then open http://localhost:3000

### A new Supabase project

Run every file in `supabase/migrations/` in the Supabase SQL Editor, **in number order** (0001 to 0010). Then turn off Authentication → Email → "Confirm email", and create an admin as described at the end of `docs/database.md`.

### Test data

- `npm run seed`: 16 doctors (2 waiting for verification), 25 patients and `admin@afyalink.test`, with free slots for the next 5 days. All use `@afyalink.test` emails and the password `AfyaLink-Test-2026`. Re-run it before a demo, because the slots run out.
- `npm run seed:activity` (after `npm run seed`): 30 days of made-up symptom checks, bookings, payments, prescriptions, reviews and chats for the test patients. It deletes and recreates that activity each time, and gives the same numbers every run.

The local app and the hosted one share **one** Supabase project, so anything you do locally shows up on the live site too.

## Checks

- `npm test`: the emergency red-flag rules (`lib/symptoms/redFlags.ts`)
- `npm run lint` and `npx tsc --noEmit`
- `npm run build`: the production build Vercel runs
- `docs/testing.md`: the step-by-step manual test, run before each presentation

## Where things are

- `app/`: pages. `(auth)` = login, register and password reset; `(dashboard)` = patient, doctor and admin areas, `/consultation` (video) and `/chat`; `api/` = M-Pesa callback, prescription download, admin PDF report.
- `lib/`: shared logic (bookings, payments, M-Pesa, LiveKit, symptom checker, analytics).
- `components/`: shared UI.
- `supabase/migrations/`: the database, its security rules and functions. The design and the 3NF reasoning are in `docs/database.md`.
- `scripts/`: the seed scripts.

## Security rules

- Every table has row-level security: patients only see their own records, doctors only their own patients, and admins only aggregated health data.
- Bookings are only confirmed by the server after M-Pesa reports success, never by the browser.
- Red-flag rules run before the AI and block booking. AI suggestions are always labelled "not a diagnosis".
