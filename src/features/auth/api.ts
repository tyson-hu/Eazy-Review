import { onlineManager } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

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
  ExactLocalSignOutResult,
  PasswordResetRequestResult,
  PasswordUpdateSuccess,
  SignInCredentials,
  SignInResult,
  SignUpCredentials,
  SignUpResult,
} from '@/src/features/auth/types';
import { runSupabaseAuthOperation } from '@/src/lib/supabase/authCoordination';
import {
  createIsolatedAuthClient,
  getSupabase,
  getSupabaseAuthStorageKey,
} from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import {
  adoptRecoverySessionAfterDeletionGuard,
  adoptExplicitSessionAfterDeletionGuard,
  captureRecoveryAdoptionPredecessor,
  removeStoredSessionIfExact,
  type RecoveryAdoptionPredecessor,
  type RecoveryAdoptionResult,
  type RecoveryPredecessorCapture,
} from '@/src/lib/supabase/authStorage';

export type AuthApiOptions = {
  client?: AppSupabaseClient;
  isOnline?: () => boolean;
  createIsolatedAuthClient?: () => AppSupabaseClient;
  storageKey?: string;
  removeStoredSessionIfExact?: (
    storageKey: string,
    expected: {
      principalId: string;
      accessToken: string;
      refreshToken: string;
    },
  ) => Promise<'removed' | 'changed' | 'already-empty' | 'unavailable'>;
  adoptExplicitSession?: (
    storageKey: string,
    session: Session,
  ) => Promise<'not-guarded' | 'adopted' | 'guard-busy' | 'superseded'>;
  captureRecoveryAdoptionPredecessor?: (
    storageKey: string,
  ) => Promise<RecoveryPredecessorCapture>;
  adoptRecoverySession?: (
    storageKey: string,
    predecessor: RecoveryAdoptionPredecessor,
    returnedSession: Session,
  ) => Promise<RecoveryAdoptionResult>;
  runAuthSessionWrite?: <T>(write: () => Promise<T>) => Promise<T>;
  onRecoveryAdoptionPredecessor?: (
    predecessor: RecoveryPredecessorCapture,
  ) => void;
  onRecoverySession?: (session: Session) => void;
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

function isolatedAuthClient(options?: AuthApiOptions): AppSupabaseClient {
  return options?.createIsolatedAuthClient?.() ?? createIsolatedAuthClient();
}

function authStorageKey(options?: AuthApiOptions): string {
  if (options?.storageKey != null) return options.storageKey;
  if (options?.client != null) return 'sb-injected-auth-token';
  return getSupabaseAuthStorageKey();
}

async function adoptAuthenticatedSession(
  session: Session,
  options?: AuthApiOptions,
  predecessor: RecoveryPredecessorCapture = { kind: 'not-guarded' },
): Promise<'adopted' | 'superseded'> {
  const storageKey = authStorageKey(options);
  const guardedPredecessor =
    predecessor.kind === 'settled-allowed' ||
      predecessor.kind === 'expired-pending'
      ? predecessor
      : null;
  const runAdoption = () =>
    runSupabaseAuthOperation(storageKey, () => {
      if (guardedPredecessor != null) {
        const adoptRecovery = options?.adoptRecoverySession ??
          adoptRecoverySessionAfterDeletionGuard;
        return adoptRecovery(storageKey, guardedPredecessor, session);
      }
      const adopt = options?.adoptExplicitSession ??
        adoptExplicitSessionAfterDeletionGuard;
      return adopt(storageKey, session);
    });
  const result = guardedPredecessor != null
    ? await (options?.runAuthSessionWrite ??
      (<T,>(write: () => Promise<T>) => write()))(runAdoption)
    : await runAdoption();
  if (result === 'guard-busy') {
    throw new AuthError(
      'account-deletion-in-progress',
      AUTH_USER_MESSAGES.accountDeletionInProgress,
    );
  }
  if (result === 'unconfirmed') {
    throw new AuthError(
      'temporary-failure',
      AUTH_USER_MESSAGES.recoveryTemporaryFailure,
    );
  }
  return result === 'superseded' ? 'superseded' : 'adopted';
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
): Promise<SignInResult> {
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

    if (await adoptAuthenticatedSession(data.session, options) === 'superseded') {
      return { kind: 'superseded' };
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
      if (await adoptAuthenticatedSession(data.session, options) === 'superseded') {
        return { kind: 'superseded' };
      }
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
export async function signOut(
  options?: AuthApiOptions,
): Promise<ExactLocalSignOutResult> {
  try {
    const client = resolveClient(options);
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new AuthError(
        'temporary-failure',
        AUTH_USER_MESSAGES.signOutFailed,
        { source: 'server' },
      );
    }
    if (data.session == null) {
      return { kind: 'signed-out' };
    }
    const session = data.session;
    const removeExact = options?.removeStoredSessionIfExact ??
      removeStoredSessionIfExact;
    const storageKey = authStorageKey(options);
    const cleanup = await runSupabaseAuthOperation(storageKey, async () => {
      const isolatedClient = isolatedAuthClient(options);
      try {
        await isolatedClient.auth.admin.signOut(session.access_token, 'local');
      } catch {
        // Local user intent still exact-removes the unchanged captured snapshot.
      } finally {
        try {
          isolatedClient.auth.stopAutoRefresh();
        } catch {
          // The isolated client owns memory only.
        }
      }
      return await removeExact(storageKey, {
        principalId: session.user.id,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
    });
    if (cleanup === 'changed') {
      const current = await client.auth.getSession();
      if (current.error) {
        throw new AuthError(
          'temporary-failure',
          AUTH_USER_MESSAGES.signOutFailed,
          { source: 'server' },
        );
      }
      if (current.data.session?.user != null) {
        return {
          kind: 'superseded',
          user: toAuthUser(current.data.session.user),
        };
      }
    }
    if (cleanup === 'unavailable') {
      throw new AuthError(
        'temporary-failure',
        AUTH_USER_MESSAGES.signOutFailed,
        { source: 'server' },
      );
    }
    return { kind: 'signed-out' };
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

export async function validateSessionSnapshotIsolated(
  session: Session,
  options?: AuthApiOptions,
): Promise<
  | { kind: 'valid'; user: AuthUser }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
> {
  if (
    typeof session.access_token !== 'string' ||
    session.access_token.length === 0 ||
    session.user?.id == null
  ) {
    return { kind: 'invalid' };
  }
  const isolatedClient = isolatedAuthClient(options);
  try {
    const { data, error } = await isolatedClient.auth.getUser(
      session.access_token,
    );
    if (data.user != null) {
      return data.user.id === session.user.id
        ? { kind: 'valid', user: toAuthUser(data.user) }
        : { kind: 'invalid' };
    }
    return isDefinitiveInvalidSessionError(error)
      ? { kind: 'invalid' }
      : { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    try {
      isolatedClient.auth.stopAutoRefresh();
    } catch {
      // The isolated client owns memory only.
    }
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
    if (error) {
      throw new AuthError(
        'temporary-failure',
        AUTH_USER_MESSAGES.temporaryFailure,
        { source: 'server' },
      );
    }
    if (!data.session?.user) {
      return null;
    }

    const restoredSession = data.session;
    const localUser = toAuthUser(restoredSession.user);

    // Offline: cannot validate without risking false logout. Keep local state.
    if (!isOnline(options)) {
      return localUser;
    }

    const validation = await validateSessionSnapshotIsolated(
      restoredSession,
      options,
    );
    if (validation.kind === 'valid') return validation.user;
    if (validation.kind === 'unavailable') return localUser;

    options?.onInvalidLocalSessionCleanupChange?.(true);
    try {
      const removeExact = options?.removeStoredSessionIfExact ??
        removeStoredSessionIfExact;
      const storageKey = authStorageKey(options);
      const cleanup = await runSupabaseAuthOperation(storageKey, () =>
        removeExact(storageKey, {
          principalId: restoredSession.user.id,
          accessToken: restoredSession.access_token,
          refreshToken: restoredSession.refresh_token,
        }),
      );
      if (cleanup === 'changed') {
        const current = await client.auth.getSession();
        if (current.error) {
          throw new AuthError(
            'temporary-failure',
            AUTH_USER_MESSAGES.temporaryFailure,
            { source: 'server' },
          );
        }
        return current.data.session?.user
          ? toAuthUser(current.data.session.user)
          : null;
      }
      if (cleanup === 'unavailable') {
        throw new AuthError(
          'temporary-failure',
          AUTH_USER_MESSAGES.temporaryFailure,
          { source: 'server' },
        );
      }
      return null;
    } finally {
      options?.onInvalidLocalSessionCleanupChange?.(false);
    }
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      'temporary-failure',
      AUTH_USER_MESSAGES.temporaryFailure,
      { source: 'server' },
    );
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
    const storageKey = authStorageKey(options);
    const capture = options?.captureRecoveryAdoptionPredecessor ??
      captureRecoveryAdoptionPredecessor;
    const predecessor = await capture(storageKey);
    options?.onRecoveryAdoptionPredecessor?.(predecessor);
    if (predecessor.kind === 'guard-busy') {
      throw new AuthError(
        'account-deletion-in-progress',
        AUTH_USER_MESSAGES.accountDeletionInProgress,
      );
    }
    if (predecessor.kind === 'superseded') {
      return { kind: 'superseded' };
    }
    if (predecessor.kind === 'unavailable') {
      throw new AuthError(
        'temporary-failure',
        AUTH_USER_MESSAGES.recoveryTemporaryFailure,
      );
    }
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
      options?.onRecoverySession?.(data.session);
      if (
        await adoptAuthenticatedSession(data.session, options, predecessor) ===
          'superseded'
      ) {
        return { kind: 'superseded' };
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

    options?.onRecoverySession?.(data.session);

    if (
      await adoptAuthenticatedSession(data.session, options, predecessor) ===
        'superseded'
    ) {
      return { kind: 'superseded' };
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
