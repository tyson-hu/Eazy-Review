import 'react-native-url-polyfill/auto';

import { getPublicEnv } from '@/src/lib/env/publicEnv';
import {
  createAppSupabaseClient,
  type AppSupabaseClient,
} from '@/src/lib/supabase/createClient';

let client: AppSupabaseClient | undefined;

/**
 * Application-owned Supabase singleton accessor.
 *
 * - Uses validated public URL + publishable key only.
 * - Typed against generated `Database` from the local schema.
 * - Does not query the database when the module is imported; the client is
 *   created on first access (still does not issue a query).
 * - Do not create additional clients inside React components.
 *
 * Screens remain on mock data until Task 15+. Accessing the client does not
 * wire Browse, Product Detail, auth, or rating flows.
 */
export function getSupabase(): AppSupabaseClient {
  if (!client) {
    client = createAppSupabaseClient(getPublicEnv());
  }
  return client;
}

/**
 * Stable singleton property. Resolves lazily so passive imports (tests that
 * never touch Supabase) do not require env vars.
 */
export const supabase: AppSupabaseClient = new Proxy({} as AppSupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabase(), property, receiver);
  },
});

/** Test-only: drop the singleton between cases. */
export function resetSupabaseClientForTests(): void {
  client = undefined;
}
