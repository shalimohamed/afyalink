import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client with the service-role key, which SKIPS row-level security.
// Only for trusted server jobs: uploading a doctor's licence at signup, and
// (later) the M-Pesa callback. "server-only" makes the build fail if a client
// component ever imports this file, so the key can't leak to the browser.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
