/**
 * Server-side Supabase clients.
 *
 * Two clients are exported:
 *
 * 1. createServerClient() — uses the anon key + user session cookies.
 *    For reading data in Server Components and Route Handlers on behalf of
 *    an authenticated user. Respects RLS.
 *
 * 2. createServiceClient() — uses SUPABASE_SERVICE_ROLE_KEY.
 *    Bypasses RLS. Use ONLY in trusted server contexts:
 *    - /api/ingest/* routes called by n8n
 *    - /api/processing/* routes called by n8n
 *    - Server-side admin operations
 *    NEVER expose this client or its key to the browser.
 *
 * `server-only` prevents this module from being accidentally imported
 * in a client component — it will throw a build-time error if attempted.
 */

import "server-only";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

/** Anon client — reads/writes on behalf of the authenticated user. Respects RLS. */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The middleware handles session refresh.
          }
        },
      },
    }
  );
}

/** Service role client — bypasses RLS. Server-only. Used by n8n ingestion endpoints. */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
