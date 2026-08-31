import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { PublicSupabaseEnv } from '@/src/lib/env/publicEnv';
import { appSupabaseAuthLock } from '@/src/lib/supabase/authCoordination';
import { authStorage } from '@/src/lib/supabase/authStorage';
import type { Database } from '@/src/types/database.generated';

export type AppSupabaseClient = SupabaseClient<Database>;

export function deriveSupabaseAuthStorageKey(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  return `sb-${hostname.split('.')[0]}-auth-token`;
}

function createMemoryAuthStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string): Promise<string | null> {
      return Promise.resolve(values.get(key) ?? null);
    },
    setItem(key: string, value: string): Promise<void> {
      values.set(key, value);
      return Promise.resolve();
    },
    removeItem(key: string): Promise<void> {
      values.delete(key);
      return Promise.resolve();
    },
  };
}

/**
 * Builds a typed Supabase client. Does not issue network requests.
 * Prefer the singleton from `client.ts` in application code.
 *
 * Auth uses the guarded AsyncStorage-backed adapter plus the same non-stealing
 * platform lock used by Task 19 principal-bound settlement.
 */
export function createAppSupabaseClient(
  env: PublicSupabaseEnv,
): AppSupabaseClient {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: authStorage,
      storageKey: deriveSupabaseAuthStorageKey(env.supabaseUrl),
      autoRefreshToken: true,
      persistSession: true,
      // Expo native has no OAuth redirect URL detection on cold start.
      detectSessionInUrl: false,
      lock: appSupabaseAuthLock,
      lockAcquireTimeout: -1,
    },
  });
}

export function createIsolatedAuthSupabaseClient(
  env: PublicSupabaseEnv,
): AppSupabaseClient {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      storage: createMemoryAuthStorage(),
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function createIsolatedFunctionsSupabaseClient(
  env: PublicSupabaseEnv,
  accessToken: string,
): AppSupabaseClient {
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: () => Promise.resolve(accessToken),
  });
}
