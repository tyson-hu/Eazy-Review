import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { PublicSupabaseEnv } from '@/src/lib/env/publicEnv';
import { authStorage } from '@/src/lib/supabase/authStorage';
import type { Database } from '@/src/types/database.generated';

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Builds a typed Supabase client. Does not issue network requests.
 * Prefer the singleton from `client.ts` in application code.
 */
export function createAppSupabaseClient(
  env: PublicSupabaseEnv,
): AppSupabaseClient {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Expo native has no OAuth redirect URL detection on cold start.
      detectSessionInUrl: false,
    },
  });
}
