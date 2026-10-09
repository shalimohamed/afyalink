import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components (code that runs in the browser). It
// uses the public key plus the user's login cookie, so row-level security
// applies exactly as on the server. Used for live chat (Realtime).
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
