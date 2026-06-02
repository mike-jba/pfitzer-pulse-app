/**
 * Next.js proxy (formerly middleware) — runs on every request before the page renders.
 *
 * Responsibilities:
 * 1. Refresh the Supabase Auth session token so it doesn't expire mid-visit.
 * 2. (Future) Redirect unauthenticated users to /login for protected routes.
 *
 * Must use @supabase/ssr createServerClient (not the service client) here
 * because middleware has access to request/response cookies, not next/headers.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not remove this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TODO (Chunk auth): Uncomment to enforce login on all dashboard routes.
  // if (!user && !request.nextUrl.pathname.startsWith("/login")) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = "/login";
  //   return NextResponse.redirect(url);
  // }

  void user; // suppress unused variable warning until auth is enabled

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except static files, images, and favicon
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
