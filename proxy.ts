import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that need a logged-in user. Which role may open which page is
// checked again in each dashboard (see lib/auth.ts).
const PROTECTED = ["/patient", "/doctor", "/admin", "/consultation", "/chat"];

// Proxy runs on the server before every page request (it used to be called
// "middleware" in older Next.js). It keeps the Supabase login fresh, because
// login tokens expire after an hour, and sends logged-out visitors to /login.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // A refreshed token goes to the page being rendered (request) and to
        // the browser (response).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Checks the login token's signature and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;
  if (!loggedIn && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // Skip Next.js build files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
