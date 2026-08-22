import { onlineManager } from '@tanstack/react-query';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import {
  AuthError,
  AUTH_USER_MESSAGES,
  normalizeAuthError,
} from '@/src/features/auth/errors';
import type {
  AuthUser,
  DeleteCurrentUserApiOutcome,
} from '@/src/features/auth/types';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/src/lib/network/requestTimeout';
import {
  createIsolatedAuthClient,
  createIsolatedFunctionsClient,
} from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type AccountDeletionReauthentication = {
  user: AuthUser;
  accessToken: string;
};

export type AccountDeletionApiOptions = {
  isOnline?: () => boolean;
  createIsolatedAuthClient?: () => AppSupabaseClient;
  createIsolatedFunctionsClient?: (
    accessToken: string,
  ) => Pick<AppSupabaseClient['functions'], 'invoke'>;
  onInvocationStart?: () => void;
};

function isOnline(options?: AccountDeletionApiOptions): boolean {
  return options?.isOnline ? options.isOnline() : onlineManager.isOnline();
}

function fixedDeletionError(status?: number): AuthError {
  return new AuthError(
    'account-deletion-failed',
    AUTH_USER_MESSAGES.accountDeletionFailed,
    { source: 'server', status },
  );
}

function sanitizeReauthenticationError(error: unknown, offline: boolean): AuthError {
  const normalized = normalizeAuthError(error, {
    operation: 'account-deletion-reauthentication',
    isOffline: offline,
  });
  return new AuthError(normalized.code, normalized.message, {
    source: normalized.source,
    status: normalized.status,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function readHttpError(
  error: FunctionsHttpError,
): Promise<{ status: number; body: Record<string, unknown> | null } | null> {
  if (!(error.context instanceof Response)) return null;
  const response = error.context.clone();
  let body: Record<string, unknown> | null = null;
  try {
    body = asRecord(await response.json());
  } catch {
    // Gateway responses may omit JSON. HTTP 401 still proves pre-handler rejection.
  }
  return { status: response.status, body };
}

const preRevocationPairs = new Set([
  '400:invalid-request',
  '401:unauthorized',
  '403:reauthentication-required',
  '405:method-not-allowed',
  '500:configuration-failure',
  '502:revocation-failed',
  '503:validation-unavailable',
]);

function exactOutcome(
  status: number,
  body: Record<string, unknown> | null,
): DeleteCurrentUserApiOutcome | null {
  if (status === 200 && body?.ok === true && body.outcome === 'deleted') {
    return { kind: 'deleted' };
  }
  if (body?.ok !== false || typeof body.code !== 'string') return null;
  if (status === 409 && body.code === 'revoked-not-deleted') {
    return { kind: 'not-deleted-signed-out' };
  }
  if (
    status === 503 &&
    (body.code === 'revocation-unconfirmed' ||
      body.code === 'revoked-delete-unconfirmed')
  ) {
    return { kind: 'unconfirmed-signed-out' };
  }
  return null;
}

export async function reauthenticateForAccountDeletion(
  credentials: {
    email: string;
    password: string;
    expectedPrincipalId: string;
  },
  options?: AccountDeletionApiOptions,
): Promise<AccountDeletionReauthentication> {
  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  const isolatedClient = options?.createIsolatedAuthClient?.() ??
    createIsolatedAuthClient();
  try {
    const { data, error } = await isolatedClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) {
      throw sanitizeReauthenticationError(error, !isOnline(options));
    }
    const session = data.session;
    if (
      session?.user == null ||
      session.user.id !== credentials.expectedPrincipalId ||
      typeof session.access_token !== 'string' ||
      session.access_token.length === 0
    ) {
      throw fixedDeletionError();
    }
    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? null,
      },
      accessToken: session.access_token,
    };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw sanitizeReauthenticationError(error, !isOnline(options));
  } finally {
    try {
      isolatedClient.auth.stopAutoRefresh();
    } catch {
      // The isolated client owns only memory state; disposal failure is non-authoritative.
    }
  }
}

export async function deleteCurrentUser(
  accessToken: string,
  options?: AccountDeletionApiOptions,
): Promise<DeleteCurrentUserApiOutcome> {
  if (!isOnline(options)) {
    throw new AuthError('offline', AUTH_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  let functions: Pick<AppSupabaseClient['functions'], 'invoke'>;
  try {
    functions = options?.createIsolatedFunctionsClient?.(accessToken) ??
      createIsolatedFunctionsClient(accessToken).functions;
  } catch {
    throw fixedDeletionError();
  }
  let result;
  try {
    options?.onInvocationStart?.();
    result = await functions.invoke('delete-current-user', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: DEFAULT_REQUEST_TIMEOUT_MS,
    });
  } catch {
    return { kind: 'unconfirmed-signed-out' };
  }

  if (result.error == null) {
    const status = result.response?.status;
    const outcome = status == null ? null : exactOutcome(status, asRecord(result.data));
    return outcome ?? { kind: 'unconfirmed-signed-out' };
  }

  if (result.error instanceof FunctionsHttpError) {
    const failure = await readHttpError(result.error);
    if (failure == null) return { kind: 'unconfirmed-signed-out' };
    const outcome = exactOutcome(failure.status, failure.body);
    if (outcome != null) return outcome;
    if (failure.status === 401) {
      throw fixedDeletionError(401);
    }
    const code = typeof failure.body?.code === 'string' ? failure.body.code : null;
    if (
      failure.body?.ok === false &&
      code != null &&
      preRevocationPairs.has(`${failure.status}:${code}`)
    ) {
      throw fixedDeletionError(failure.status);
    }
    return { kind: 'unconfirmed-signed-out' };
  }

  if (
    result.error instanceof FunctionsFetchError ||
    result.error instanceof FunctionsRelayError
  ) {
    return { kind: 'unconfirmed-signed-out' };
  }
  return { kind: 'unconfirmed-signed-out' };
}
