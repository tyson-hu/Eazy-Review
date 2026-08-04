import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Auth session storage adapter for Supabase Auth.
 *
 * Native: Expo SecureStore (encrypted/keychain-backed where the OS provides it).
 * Web: `localStorage` (SecureStore is not available in browsers).
 *
 * Known limitation (iOS SecureStore): individual values are limited to about
 * 2048 bytes. A full Supabase session JSON can approach or exceed that limit
 * once access + refresh tokens and user metadata grow. If setItem fails with a
 * size-related error, the failure surfaces in development rather than
 * silently discarding the session. Switch this adapter in isolation if a
 * larger-capacity store becomes necessary (for example SQLite-backed
 * localStorage via `expo-sqlite`).
 *
 * Values are stored as plain strings. Callers (supabase-js) own JSON encoding;
 * this adapter does not double-encode.
 */

export type AuthStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const webStorage: AuthStorageAdapter = {
  async getItem(key) {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage === 'undefined') {
      throw new Error(
        'Auth storage is unavailable: localStorage is not defined on web.',
      );
    }
    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(key);
  },
};

const secureStorage: AuthStorageAdapter = {
  async getItem(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      // Missing key is returned as null by SecureStore; rethrow hard failures.
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
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `[authStorage] setItem failed for key "${key}" (value length ${value.length}; iOS SecureStore ~2048-byte limit may apply)`,
          error instanceof Error ? error.message : 'unknown error',
        );
      }
      throw error;
    }
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // deleteItem on a missing key is often a no-op; propagate unexpected errors.
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

/** Singleton adapter wired into the app Supabase client. */
export const authStorage: AuthStorageAdapter =
  Platform.OS === 'web' ? webStorage : secureStorage;
