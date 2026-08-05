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
 * - Uses validated public URL + publishable key only (static Expo env source).
 * - Typed against generated `Database` from the local schema.
 * - Returns one real client instance (not a Proxy). Identity is stable across
 *   calls: `getSupabase() === getSupabase()`.
 * - Module import and first `createClient` do not issue a database query.
 * - Invalid public environment configuration throws `PublicEnvError` (or the
 *   underlying failure) synchronously — callers must not silently swallow it.
 * - Do not create additional clients inside React components.
 *
 * Task 15 catalog APIs use this client for anonymous Browse and Product Detail
 * reads. Accessing the client alone does not wire auth or rating flows.
 */
export function getSupabase(): AppSupabaseClient {
  if (!client) {
    client = createAppSupabaseClient(getPublicEnv());
  }
  return client;
}

/** Test-only: drop the singleton between cases. */
export function resetSupabaseClientForTests(): void {
  client = undefined;
}
