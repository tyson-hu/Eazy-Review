import { onlineManager } from '@tanstack/react-query';

import {
  AuthError,
  AUTH_USER_MESSAGES,
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
 * Best-effort session restoration. Failures resolve to signed-out rather than
 * blocking anonymous Browse.
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
    return toAuthUser(data.session.user);
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
