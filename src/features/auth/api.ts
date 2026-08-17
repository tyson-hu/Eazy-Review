import { onlineManager } from '@tanstack/react-query';

import {
  isValidEmailFormat,
  normalizeEmail,
} from '@/src/features/auth/email';
import {
  AuthError,
  AUTH_USER_MESSAGES,
  isAccountExistenceError,
  isDefinitiveInvalidSessionError,
  normalizeAuthError,
} from '@/src/features/auth/errors';
import { getPasswordRecoveryRedirectTo } from '@/src/features/auth/recoveryRedirect';
import {
  classifyAuthCallback,
  isAuthCallbackUrl,
  parseAuthCallbackParams,
} from '@/src/features/auth/recoveryUrl';
import type {
  AuthCallbackProcessResult,
  AuthUser,
  PasswordResetRequestResult,
  PasswordUpdateSuccess,
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

type RestoreSessionOptions = AuthApiOptions & {
  onInvalidLocalSessionCleanupChange?: (isCleaning: boolean) => void;
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
  options?: RestoreSessionOptions,
): Promise<AuthUser | null> {
  try {
    const client = resolveClient(options);
    const { data, error } = await client.auth.getSession();
    if (error || !data.session?.user) {
      return null;
    }

    const restoredSession = data.session;
    const localUser = toAuthUser(restoredSession.user);

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

    // Definitive invalid principal/session — clear only if the exact session
    // is still restored. A newer sign-in or same-user recovery session while
    // getUser was in flight must not be wiped by stale zombie cleanup.
    if (isDefinitiveInvalidSessionError(userError)) {
      try {
        const current = await client.auth.getSession();
        const currentSession = current.data.session;
        if (
          currentSession &&
          (currentSession.user.id !== restoredSession.user.id ||
            currentSession.access_token !== restoredSession.access_token ||
            currentSession.refresh_token !== restoredSession.refresh_token)
        ) {
          // Session changed during validation; keep the newer local session.
          return toAuthUser(currentSession.user);
        }
      } catch {
        // Fall through to cleanup of the known-invalid principal.
      }

      options?.onInvalidLocalSessionCleanupChange?.(true);
      try {
        await clearInvalidLocalSession(client);
      } finally {
        options?.onInvalidLocalSessionCleanupChange?.(false);
      }
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

/**
 * Request a password-reset email. Always resolves with a non-enumerating
 * success result when the provider accepts the request. Client-side malformed
 * email fails before the network call.
 *
 * Does not retry. Does not reveal account existence.
 */
export async function requestPasswordReset(
  email: string,
  options?: AuthApiOptions & { redirectTo?: string },
): Promise<PasswordResetRequestResult> {
  if (!isValidEmailFormat(email)) {
    throw new AuthError('invalid-email', AUTH_USER_MESSAGES.invalidEmail, {
      source: 'credentials',
    });
  }

  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  const normalized = normalizeEmail(email);
  const redirectTo =
    options?.redirectTo ?? getPasswordRecoveryRedirectTo();

  try {
    const client = resolveClient(options);
    const { error } = await client.auth.resetPasswordForEmail(normalized, {
      redirectTo,
    });

    if (error) {
      if (isAccountExistenceError(error)) {
        return { kind: 'submitted' };
      }
      // Provider errors must not become account-existence signals.
      throw normalizeAuthError(error, {
        operation: 'password-reset-request',
        isOffline: !isOnline(options),
      });
    }

    return { kind: 'submitted' };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw normalizeAuthError(error, {
      operation: 'password-reset-request',
      isOffline: !isOnline(options),
    });
  }
}

/**
 * Update password after a verified PASSWORD_RECOVERY session.
 * Callers must gate the form on recovery phase `verified`.
 * Does not retry and does not queue offline mutations.
 */
export async function updatePasswordFromRecovery(
  newPassword: string,
  options?: AuthApiOptions,
): Promise<PasswordUpdateSuccess> {
  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  try {
    const client = resolveClient(options);
    const { data, error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw normalizeAuthError(error, {
        operation: 'password-update',
        isOffline: !isOnline(options),
      });
    }

    if (!data.user) {
      throw new AuthError(
        'password-update-failed',
        AUTH_USER_MESSAGES.passwordUpdateFailed,
      );
    }

    return {
      kind: 'updated',
      user: toAuthUser(data.user),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw normalizeAuthError(error, {
      operation: 'password-update',
      isOffline: !isOnline(options),
    });
  }
}

/**
 * Exchange or apply auth tokens/code from a recovery (or other) callback URL.
 * Never logs the URL or raw tokens. Returns a coarse kind for callers.
 *
 * When the URL has no processable auth payload, returns `{ kind: 'ignored' }`.
 */
export async function processAuthCallbackUrl(
  url: string,
  options?: AuthApiOptions,
): Promise<AuthCallbackProcessResult> {
  if (!isAuthCallbackUrl(url)) {
    return { kind: 'ignored' };
  }

  const params = parseAuthCallbackParams(url);
  const classified = classifyAuthCallback(params);

  if (classified.kind === 'empty') {
    return { kind: 'ignored' };
  }

  if (classified.kind === 'error') {
    throw normalizeAuthError(
      {
        message: classified.error,
        code: classified.errorCode,
      },
      {
        operation: 'recovery-callback',
        isOffline: !isOnline(options),
      },
    );
  }

  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  try {
    const client = resolveClient(options);

    if (classified.kind === 'pkce') {
      const { data, error } = await client.auth.exchangeCodeForSession(
        classified.code,
      );
      if (error) {
        throw normalizeAuthError(error, {
          operation: 'recovery-callback',
          isOffline: !isOnline(options),
        });
      }
      if (!data.session?.user) {
        throw new AuthError(
          'recovery-link-invalid',
          AUTH_USER_MESSAGES.recoveryLinkInvalid,
        );
      }
      // auth-js 2.112 returns `redirectType` here at runtime, but its public
      // AuthTokenResponse type omits the field. Read it through a narrow
      // structural guard until the dependency type matches the runtime shape.
      const redirectType = (
        data as typeof data & { redirectType?: unknown }
      ).redirectType;
      // PKCE recovery emails typically establish a recovery session; callers
      // may also observe PASSWORD_RECOVERY from the SDK auth listener.
      return {
        kind:
          redirectType === 'recovery' ? 'password-recovery' : 'session',
        user: toAuthUser(data.session.user),
      };
    }

    const { data, error } = await client.auth.setSession({
      access_token: classified.accessToken,
      refresh_token: classified.refreshToken,
    });

    if (error) {
      throw normalizeAuthError(error, {
        operation: 'recovery-callback',
        isOffline: !isOnline(options),
      });
    }

    if (!data.session?.user) {
      throw new AuthError(
        'recovery-link-invalid',
        AUTH_USER_MESSAGES.recoveryLinkInvalid,
      );
    }

    return {
      kind:
        classified.type === 'recovery' ? 'password-recovery' : 'session',
      user: toAuthUser(data.session.user),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw normalizeAuthError(error, {
      operation: 'recovery-callback',
      isOffline: !isOnline(options),
    });
  }
}
