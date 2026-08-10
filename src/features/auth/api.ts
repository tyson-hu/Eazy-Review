import { onlineManager } from '@tanstack/react-query';

import {
  AuthError,
  AUTH_USER_MESSAGES,
  isDefinitiveInvalidSessionError,
  normalizeAuthError,
} from '@/src/features/auth/errors';
import type {
  AuthUser,
  SignInCredentials,
  SignInSuccess,
  SignUpCredentials,
  SignUpResult,
} from '@/src/features/auth/types';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type AuthApiOptions = {
  client?: AppSupabaseClient;
  isOnline?: () => boolean;
};

function resolveClient(options?: AuthApiOptions): AppSupabaseClient {
  return options?.client ?? getSupabase();
}

function isOnline(options?: AuthApiOptions): boolean {
  if (options?.isOnline) {
    return options.isOnline();
  }
  return onlineManager.isOnline();
}

function toAuthUser(user: {
  id: string;
  email?: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

/**
 * Email/password sign-in. Does not retry. Throws AuthError with safe copy.
 */
export async function signInWithPassword(
  credentials: SignInCredentials,
  options?: AuthApiOptions,
): Promise<SignInSuccess> {
  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  try {
    const client = resolveClient(options);
    const { data, error } = await client.auth.signInWithPassword({
      email: credentials.email.trim(),
      password: credentials.password,
    });

    if (error) {
      throw normalizeAuthError(error, {
        operation: 'sign-in',
        isOffline: !isOnline(options),
      });
    }

    if (!data.session?.user) {
      throw new AuthError(
        'temporary-failure',
        AUTH_USER_MESSAGES.signInFailed,
      );
    }

    return {
      kind: 'signed-in',
      user: toAuthUser(data.session.user),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw normalizeAuthError(error, {
      operation: 'sign-in',
      isOffline: !isOnline(options),
    });
  }
}

/**
 * Email/password sign-up. Handles immediate session and confirmation-required.
 * Does not retry. Never claims signed-in without a session.
 */
export async function signUpWithPassword(
  credentials: SignUpCredentials,
  options?: AuthApiOptions,
): Promise<SignUpResult> {
  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  const email = credentials.email.trim();

  try {
    const client = resolveClient(options);
    const { data, error } = await client.auth.signUp({
      email,
      password: credentials.password,
    });

    if (error) {
      throw normalizeAuthError(error, {
        operation: 'sign-up',
        isOffline: !isOnline(options),
      });
    }

    if (data.session?.user) {
      return {
        kind: 'signed-in',
        user: toAuthUser(data.session.user),
      };
    }

    // Account may exist while email confirmation is required.
    if (data.user && !data.session) {
      return {
        kind: 'confirmation-required',
        email,
      };
    }

    throw new AuthError(
      'account-creation-failed',
      AUTH_USER_MESSAGES.accountCreationFailed,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw normalizeAuthError(error, {
      operation: 'sign-up',
      isOffline: !isOnline(options),
    });
  }
}

/**
 * Current-device (local) sign-out. Explicit `scope: 'local'` keeps other
 * device sessions intact; Task 16 does not implement global revocation.
 * Does not perform account deletion.
 */
export async function signOut(options?: AuthApiOptions): Promise<void> {
  try {
    const client = resolveClient(options);
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      throw normalizeAuthError(error, {
        operation: 'sign-out',
        isOffline: !isOnline(options),
      });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw normalizeAuthError(error, {
      operation: 'sign-out',
      isOffline: !isOnline(options),
    });
  }
}

/**
 * Best-effort local session wipe (current device only). Used when Auth
 * definitively rejects a restored principal. Does not require a successful
 * remote revoke — supabase-js still clears storage for 401/403/404 / missing
 * session and on many network failures (`scope: 'local'` only).
 */
async function clearInvalidLocalSession(
  client: AppSupabaseClient,
): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // Best-effort. The restore path still returns signed-out so the UI does
    // not publish a known-invalid principal even if storage wipe fails once.
  }
}

/**
 * Best-effort session restoration on launch.
 *
 * 1. No local session → signed out
 * 2. Local session + explicitly offline → keep local principal (no getUser)
 * 3. Local session + online getUser success → server-backed principal
 * 4. Local session + definitive Auth rejection → local sign-out, signed out
 * 5. Local session + transient validation failure → keep local principal
 *
 * Does not use profiles (or any app table) as the identity validity check.
 * Identity validity is Auth-server only via `getUser()`.
 */
export async function restoreSession(
  options?: AuthApiOptions,
): Promise<AuthUser | null> {
  try {
    const client = resolveClient(options);
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) {
      return null;
    }

    const localUser = toAuthUser(data.session.user);

    // Offline: cannot validate without risking false logout. Keep local state.
    if (!isOnline(options)) {
      return localUser;
    }

    let userData: { user: { id: string; email?: string | null } | null } | null =
      null;
    let userError: unknown = null;
    try {
      const result = await client.auth.getUser();
      userData = result.data;
      userError = result.error;
    } catch {
      // Network throws (TypeError, etc.) — preserve local session.
      return localUser;
    }

    if (userData?.user) {
      return toAuthUser(userData.user);
    }

    // Definitive invalid principal/session — clear only if the same principal
    // is still restored. A newer sign-in while getUser was in flight must not
    // be wiped by stale zombie cleanup.
    if (isDefinitiveInvalidSessionError(userError)) {
      try {
        const current = await client.auth.getSession();
        const currentId = current.data.session?.user?.id ?? null;
        if (currentId != null && currentId !== localUser.id) {
          // Principal changed during validation; keep the newer local session.
          return current.data.session?.user
            ? toAuthUser(current.data.session.user)
            : null;
        }
      } catch {
        // Fall through to cleanup of the known-invalid principal.
      }

      await clearInvalidLocalSession(client);
      return null;
    }

    // Transient / unclassifiable: preserve local restored principal.
    return localUser;
  } catch {
    return null;
  }
}

export function mapAuthUserFromSessionUser(user: {
  id: string;
  email?: string | null;
}): AuthUser {
  return toAuthUser(user);
}
