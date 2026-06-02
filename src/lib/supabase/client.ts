/**
 * Browser-side Supabase client.
 *
 * Uses NEXT_PUBLIC_SUPABASE_ANON_KEY — safe for client components.
 * This client respects Row Level Security policies.
 * NEVER import the service role key here.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
