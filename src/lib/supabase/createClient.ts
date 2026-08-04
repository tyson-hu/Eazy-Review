import {
  createClient,
  processLock,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { PublicSupabaseEnv } from '@/src/lib/env/publicEnv';
import { authStorage } from '@/src/lib/supabase/authStorage';
import type { Database } from '@/src/types/database.generated';

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Builds a typed Supabase client. Does not issue network requests.
 * Prefer the singleton from `client.ts` in application code.
 *
 * Auth uses AsyncStorage-backed adapter + processLock (exported by
 * `@supabase/supabase-js` for React Native single-process environments).
 * `processLock` is marked deprecated in supabase-js 2.112 for future removal
 * in v3, but remains the documented RN option in this version and is still
 * accepted by `createClient`.
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
      lock: processLock,
    },
  });
}
