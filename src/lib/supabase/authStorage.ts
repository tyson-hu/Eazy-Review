import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Task 14 auth session storage adapter for Supabase Auth.
 *
 * Decision (Task 16 recommendation — human acceptance pending): keep
 * AsyncStorage for the MVP. A SecureStore experiment was evaluated and
 * rejected without adding a second package:
 *
 * - Access and refresh tokens are sensitive authentication material.
 * - AsyncStorage is not encrypted at rest on device.
 * - profile display data does not drive this decision; token storage does.
 * - Device compromise / local storage inspection remain relevant risks.
 * - Server-side RLS remains mandatory regardless of local encryption.
 * - iOS SecureStore has a ~2048-byte value limit. A full Supabase session
 *   JSON can exceed that limit, which would force fragile custom chunking
 *   or partial token storage — both rejected by the Task 16 decision rule.
 * - Static web export must remain valid; AsyncStorage covers RN + web with
 *   the existing SSR-safe no-window guard.
 *
 * If a future task proves a chunk-free, Expo-compatible secure session store
 * that restores refresh and clears on sign-out, revisit this choice then.
 *
 * Values are stored as plain strings. Callers (supabase-js) own JSON encoding;
 * this adapter does not double-encode. Storage errors propagate to the caller.
 * Key names may appear in __DEV__ diagnostics; token or session body content
 * never does.
 */

export type AuthStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * Node SSR (Expo static web export) has no DOM `window`. Client web and React
 * Native runtimes define it, so session persistence can use AsyncStorage.
 * During SSR, treat storage as empty and no-op so provider bootstrap can
 * construct the Supabase client without crashing.
 */
export function isAuthStorageRuntimeAvailable(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Builds an auth storage adapter against an AsyncStorage-compatible backend.
 * Production uses the package singleton; tests inject a mock store.
 */
export function createAuthStorageAdapter(
  store: Pick<
    typeof AsyncStorage,
    'getItem' | 'setItem' | 'removeItem'
  > = AsyncStorage,
  options: { skipWhenNoWindow?: boolean } = {},
): AuthStorageAdapter {
  // Injected test stores always run; the production singleton guards SSR.
  const skipWhenNoWindow = options.skipWhenNoWindow === true;

  return {
    async getItem(key) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) {
        return null;
      }
      try {
        return await store.getItem(key);
      } catch (error) {
        if (__DEV__) {
          console.warn(
            `[authStorage] getItem failed for key "${key}"`,
            error instanceof Error ? error.message : 'unknown error',
          );
        }
        throw error;
      }
    },
    async setItem(key, value) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) {
        return;
      }
      try {
        // Store the string as-is; do not JSON.stringify again.
        await store.setItem(key, value);
      } catch (error) {
        if (__DEV__) {
          console.warn(
            `[authStorage] setItem failed for key "${key}" (value length ${value.length})`,
            error instanceof Error ? error.message : 'unknown error',
          );
        }
        throw error;
      }
    },
    async removeItem(key) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) {
        return;
      }
      try {
        await store.removeItem(key);
      } catch (error) {
        if (__DEV__) {
          console.warn(
            `[authStorage] removeItem failed for key "${key}"`,
            error instanceof Error ? error.message : 'unknown error',
          );
        }
        throw error;
      }
    },
  };
}

/** Singleton adapter wired into the app Supabase client. */
export const authStorage: AuthStorageAdapter = createAuthStorageAdapter(
  AsyncStorage,
  { skipWhenNoWindow: true },
);
