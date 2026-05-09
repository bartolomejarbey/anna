import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

// TODO: remove this cast once F1.B applies and Database types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

/**
 * Loosely-typed admin client for use in server actions before Database types
 * are generated (F1.B deferred). Returns the same underlying client as
 * createAdminClient() but without strict table typing.
 */
export function supabaseAdmin(): AnySupabase {
  return createAdminClient() as unknown as AnySupabase;
}
