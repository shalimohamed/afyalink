-- AfyaLink database, part 5: remember when the patient first downloaded their
-- prescription (2026-10-11). Run this in the Supabase SQL Editor after 0001–0004.
--
-- Used so the dashboard guide stops saying "your prescription is ready" once
-- it has been downloaded. It's a fact about the prescription itself (3NF).
-- Patients can't write it directly: the app's download route records it on
-- the server after checking the patient may see the prescription.

alter table public.prescriptions add column if not exists downloaded_at timestamptz;
