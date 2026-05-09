import "server-only";

import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/**
 * Service-role client. BYPASSUJE RLS — nikdy v 'use client', nikdy v NEXT_PUBLIC_*.
 * Používej jen pro super-admin akce, batch operace, seedy.
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
