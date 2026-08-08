import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Task 14/16 auth session storage adapter for Supabase Auth.
 *
 * HUMAN ACCEPTED (Task 16 MVP tradeoff — not final product-wide acceptance):
 * keep AsyncStorage for session persistence despite being unencrypted at rest.
 *
 * - Access and refresh tokens are sensitive authentication material.
 * - AsyncStorage is not encrypted at rest on device.
 * - Profile display data does not drive this decision; token storage does.
 * - Device compromise / local storage inspection remain relevant risks.
 * - Server-side RLS remains mandatory regardless of local encryption.
 * - A SecureStore lifecycle experiment was proposed but explicitly waived by
 *   the human for Task 16. Do not claim that experiment was performed, and do
 *   not claim Expo enforces a universal hard 2048-byte SecureStore limit as the
 *   Task 16 rejection reason.
 * - SecureStore / platform-secure storage may be reconsidered during later
 *   security/release hardening if a simple, tested Supabase session-storage path
 *   is available without fragile chunking or custom encryption.
 * - Static web export must remain valid; AsyncStorage covers RN + web with
 *   the existing SSR-safe no-window guard.
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
