import { NextResponse, type NextRequest } from "next/server";
import { HOME_FOR_ROLE, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Google sends the user back here after they pick their account, with a
// one-time ?code=. We swap it for a login session (saved in cookies), then send
// the user to their dashboard. New Google users become patients: the
// handle_new_user trigger never makes anyone a doctor or admin without the
// registration form.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const failed = NextResponse.redirect(new URL("/login?error=google", request.url));
  if (!code) return failed;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error || !data.user) {
    console.error("Google login failed:", error);
    return failed;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single<{ role: Role }>();
  return NextResponse.redirect(new URL(HOME_FOR_ROLE[profile?.role ?? "patient"], request.url));
}
