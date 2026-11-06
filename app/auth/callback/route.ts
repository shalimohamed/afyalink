import { NextResponse, type NextRequest } from "next/server";
import { HOME_FOR_ROLE, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Two kinds of login links come back here with a one-time ?code=:
// - Google, after the user picks their account. New Google users become
//   patients: the handle_new_user trigger never makes anyone a doctor or admin
//   without the registration form.
// - The "forgot password" email, with ?next=/reset-password.
// We swap the code for a login session (saved in cookies), then send the user
// on: to /reset-password, or to their dashboard.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  // Only this one "next" page is allowed, so nobody can edit the link to send
  // people somewhere else after logging in.
  const isReset = request.nextUrl.searchParams.get("next") === "/reset-password";
  const failed = NextResponse.redirect(new URL(isReset ? "/forgot-password?error=link" : "/login?error=google", request.url));
  if (!code) return failed;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error || !data.user) {
    console.error(isReset ? "Password reset link failed:" : "Google login failed:", error);
    return failed;
  }
  if (isReset) return NextResponse.redirect(new URL("/reset-password", request.url));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single<{ role: Role }>();
  return NextResponse.redirect(new URL(HOME_FOR_ROLE[profile?.role ?? "patient"], request.url));
}
