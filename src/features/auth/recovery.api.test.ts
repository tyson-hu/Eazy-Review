import {
  processAuthCallbackUrl,
  requestPasswordReset,
  updatePasswordFromRecovery,
} from '@/src/features/auth/api';
import type { AuthApiOptions } from '@/src/features/auth/api';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import { createPrincipalBoundAuthStorage } from '@/src/lib/supabase/authStorage';
import type { Session } from '@supabase/supabase-js';

jest.mock('@/src/features/auth/recoveryRedirect', () => ({
  getPasswordRecoveryRedirectTo: () =>
    'eazyreview://auth/reset-password',
  PASSWORD_RECOVERY_PATH: '/auth/reset-password',
  RECOVERY_REDIRECT_MATRIX_NOTE: 'test',
}));

function mockClient(auth: {
  resetPasswordForEmail?: jest.Mock;
  updateUser?: jest.Mock;
  exchangeCodeForSession?: jest.Mock;
  setSession?: jest.Mock;
}): AppSupabaseClient {
  return {
    auth: {
      resetPasswordForEmail:
        auth.resetPasswordForEmail ??
        jest.fn(async () => ({ data: {}, error: null })),
      updateUser:
        auth.updateUser ??
        jest.fn(async () => ({
          data: { user: { id: 'u1', email: 'a@example.com' } },
          error: null,
        })),
      exchangeCodeForSession:
        auth.exchangeCodeForSession ??
        jest.fn(async () => ({ data: { session: null }, error: null })),
      setSession:
        auth.setSession ??
        jest.fn(async () => ({ data: { session: null }, error: null })),
    },
  } as unknown as AppSupabaseClient;
}

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function authSession(
  principalId: string,
  sessionId: string,
  label: string,
): Session {
  return {
    access_token: `${base64Url({ alg: 'none' })}.${base64Url({
      sub: principalId,
      session_id: sessionId,
    })}.${label}`,
    refresh_token: `refresh-${label}`,
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id: principalId,
      email: `${principalId}@example.com`,
      aud: 'authenticated',
    },
  } as unknown as Session;
}

describe('password recovery api', () => {
  it('requests a reset with trimmed email and local redirect', async () => {
    const resetPasswordForEmail = jest.fn(async () => ({
      data: {},
      error: null,
    }));
    const client = mockClient({ resetPasswordForEmail });

    await expect(
      requestPasswordReset('  User@Example.COM  ', {
        client,
        isOnline: () => true,
      }),
    ).resolves.toEqual({ kind: 'submitted' });

    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'eazyreview://auth/reset-password',
    });
  });

  it('rejects malformed email without calling Supabase', async () => {
    const resetPasswordForEmail = jest.fn();
    const client = mockClient({ resetPasswordForEmail });

    await expect(
      requestPasswordReset('not-an-email', {
        client,
        isOnline: () => true,
      }),
    ).rejects.toMatchObject({
      code: 'invalid-email',
      message: AUTH_USER_MESSAGES.invalidEmail,
    });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('fails offline without calling Supabase', async () => {
    const resetPasswordForEmail = jest.fn();
    const client = mockClient({ resetPasswordForEmail });

    await expect(
      requestPasswordReset('a@example.com', {
        client,
        isOnline: () => false,
      }),
    ).rejects.toBeInstanceOf(AuthError);

    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('treats account-not-found as submitted without enumerating accounts', async () => {
    const client = mockClient({
      resetPasswordForEmail: jest.fn(async () => ({
        data: {},
        error: {
          message: 'User not found',
          status: 400,
          code: 'user_not_found',
        },
      })),
    });

    await expect(
      requestPasswordReset('missing@example.com', {
        client,
        isOnline: () => true,
      }),
    ).resolves.toEqual({ kind: 'submitted' });
  });

  it('keeps recovery-request service failures visible', async () => {
    const client = mockClient({
      resetPasswordForEmail: jest.fn(async () => ({
        data: {},
        error: {
          message: 'Internal server error',
          status: 503,
          code: 'unexpected_failure',
        },
      })),
    });

    await expect(
      requestPasswordReset('user@example.com', {
        client,
        isOnline: () => true,
      }),
    ).rejects.toMatchObject({
      code: 'temporary-failure',
      message: AUTH_USER_MESSAGES.recoveryRequestFailed,
    });
  });

  it('updates password once without automatic retry', async () => {
    const updateUser = jest.fn(async () => ({
      data: { user: { id: 'u1', email: 'a@example.com' } },
      error: null,
    }));
    const client = mockClient({ updateUser });

    const result = await updatePasswordFromRecovery('new-secret', {
      client,
      isOnline: () => true,
    });

    expect(result).toEqual({
      kind: 'updated',
      user: { id: 'u1', email: 'a@example.com' },
    });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret' });
  });

  it('does not call updateUser when offline', async () => {
    const updateUser = jest.fn();
    const client = mockClient({ updateUser });

    await expect(
      updatePasswordFromRecovery('new-secret', {
        client,
        isOnline: () => false,
      }),
    ).rejects.toMatchObject({ code: 'offline' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('preserves failed update as a thrown AuthError for manual retry', async () => {
    const updateUser = jest.fn(async () => ({
      data: { user: null },
      error: { message: 'Network request failed', status: 0 },
    }));
    const client = mockClient({ updateUser });

    await expect(
      updatePasswordFromRecovery('new-secret', {
        client,
        isOnline: () => true,
      }),
    ).rejects.toBeInstanceOf(AuthError);
    expect(updateUser).toHaveBeenCalledTimes(1);
  });

  it('exchanges a recovery code without surfacing token content', async () => {
    const exchangeCodeForSession = jest.fn(async () => ({
      data: {
        session: { user: { id: 'u1', email: 'a@example.com' } },
        user: { id: 'u1', email: 'a@example.com' },
        redirectType: 'recovery',
      },
      error: null,
    }));
    const client = mockClient({ exchangeCodeForSession });
    const adoptExplicitSession = jest.fn(async () => 'adopted' as const);

    const result = await processAuthCallbackUrl(
      'eazyreview://auth/reset-password?code=AUTH_CODE_VALUE',
      {
        client,
        isOnline: () => true,
        storageKey: 'sb-test-auth-token',
        adoptExplicitSession,
      },
    );

    expect(result).toEqual({
      kind: 'password-recovery',
      user: { id: 'u1', email: 'a@example.com' },
    });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('AUTH_CODE_VALUE');
    expect(adoptExplicitSession).toHaveBeenCalledWith(
      'sb-test-auth-token',
      expect.objectContaining({ user: { id: 'u1', email: 'a@example.com' } }),
    );
  });

  it('captures settled S1 before exchange and adopts same-session-ID S2 through the guarded boundary', async () => {
    const storageKey = 'sb-test-auth-token';
    const settledS1 = authSession('principal-a', 'session-a', 'settled-s1');
    const returnedS2 = authSession('principal-a', 'session-a', 'returned-s2');
    const order: string[] = [];
    const predecessor = {
      kind: 'settled-allowed' as const,
      guard: {
        principalId: 'principal-a',
        revision: 7,
        state: 'settled' as const,
        leaseExpiresAt: 0,
        allowedSessionId: 'session-a',
        predecessor: null,
      },
      raw: {
        kind: 'session' as const,
        snapshot: {
          principalId: 'principal-a',
          accessToken: settledS1.access_token,
          refreshToken: settledS1.refresh_token,
          sessionId: 'session-a',
        },
      },
    };
    const captureRecoveryAdoptionPredecessor = jest.fn(async () => {
      order.push('capture');
      return predecessor;
    });
    const exchangeCodeForSession = jest.fn(async () => {
      order.push('exchange');
      return {
        data: {
          session: returnedS2,
          user: returnedS2.user,
          redirectType: 'recovery' as const,
        },
        error: null,
      };
    });
    const adoptRecoverySession = jest.fn(async () => {
      order.push('adopt');
      return 'adopted' as const;
    });
    const onRecoverySession = jest.fn(() => {
      order.push('session');
    });
    const adoptExplicitSession = jest.fn(async () => 'superseded' as const);
    const options = {
      client: mockClient({ exchangeCodeForSession }),
      isOnline: () => true,
      storageKey,
      captureRecoveryAdoptionPredecessor,
      adoptRecoverySession,
      adoptExplicitSession,
      onRecoverySession,
    } as unknown as AuthApiOptions;

    await expect(
      processAuthCallbackUrl(
        'eazyreview://auth/reset-password?code=GUARDED_RECOVERY_CODE',
        options,
      ),
    ).resolves.toEqual({
      kind: 'password-recovery',
      user: { id: 'principal-a', email: 'principal-a@example.com' },
    });
    expect(order).toEqual(['capture', 'exchange', 'session', 'adopt']);
    expect(onRecoverySession).toHaveBeenCalledWith(returnedS2);
    expect(adoptRecoverySession).toHaveBeenCalledWith(
      storageKey,
      predecessor,
      returnedS2,
    );
    expect(adoptExplicitSession).not.toHaveBeenCalled();
  });

  it('keeps unguarded recovery on the exact post-SDK adoption path', async () => {
    const returnedSession = authSession(
      'principal-a',
      'session-a',
      'unguarded-recovery',
    );
    const order: string[] = [];
    const captureRecoveryAdoptionPredecessor = jest.fn(async () => {
      order.push('capture');
      return { kind: 'not-guarded' as const };
    });
    const exchangeCodeForSession = jest.fn(async () => {
      order.push('exchange');
      return {
        data: {
          session: returnedSession,
          user: returnedSession.user,
          redirectType: 'recovery' as const,
        },
        error: null,
      };
    });
    const adoptExplicitSession = jest.fn(async () => {
      order.push('adopt-explicit');
      return 'not-guarded' as const;
    });
    const adoptRecoverySession = jest.fn(async () => 'adopted' as const);

    await expect(
      processAuthCallbackUrl(
        'eazyreview://auth/reset-password?code=UNGUARDED_RECOVERY_CODE',
        {
          client: mockClient({ exchangeCodeForSession }),
          isOnline: () => true,
          storageKey: 'sb-test-auth-token',
          captureRecoveryAdoptionPredecessor,
          adoptExplicitSession,
          adoptRecoverySession,
        },
      ),
    ).resolves.toEqual({
      kind: 'password-recovery',
      user: { id: 'principal-a', email: 'principal-a@example.com' },
    });
    expect(order).toEqual(['capture', 'exchange', 'adopt-explicit']);
    expect(adoptRecoverySession).not.toHaveBeenCalled();
  });

  it('applies recovery tokens and reports password-recovery kind', async () => {
    const setSession = jest.fn(async () => ({
      data: {
        session: { user: { id: 'u1', email: 'a@example.com' } },
      },
      error: null,
    }));
    const client = mockClient({ setSession });
    const adoptExplicitSession = jest.fn(async () => 'adopted' as const);

    const result = await processAuthCallbackUrl(
      'eazyreview://auth/reset-password#access_token=tok&refresh_token=ref&type=recovery',
      {
        client,
        isOnline: () => true,
        storageKey: 'sb-test-auth-token',
        adoptExplicitSession,
      },
    );

    expect(result.kind).toBe('password-recovery');
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: 'ref',
    });
    expect(adoptExplicitSession).toHaveBeenCalledTimes(1);
  });

  it('returns superseded when guarded recovery adoption observes a newer winner', async () => {
    const setSession = jest.fn(async () => ({
      data: {
        session: { user: { id: 'u1', email: 'a@example.com' } },
      },
      error: null,
    }));
    const client = mockClient({ setSession });

    await expect(
      processAuthCallbackUrl(
        'eazyreview://auth/reset-password#access_token=tok&refresh_token=ref&type=recovery',
        {
          client,
          isOnline: () => true,
          storageKey: 'sb-test-auth-token',
          adoptExplicitSession: jest.fn(async () => 'superseded' as const),
        },
      ),
    ).resolves.toEqual({ kind: 'superseded' });
  });

  it('returns superseded when B wins storage after callback exchange but before adoption', async () => {
    const storageKey = 'sb-test-auth-token';
    const callbackA = authSession('principal-a', 'session-a', 'callback-a');
    const storedB = authSession('principal-b', 'session-b', 'winner-b');
    const values = new Map<string, string>();
    const store = {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    };
    const controlled = createPrincipalBoundAuthStorage(store, {
      runStorageOperation: async (_key, operation) => await operation(),
    });
    const exchangeCodeForSession = jest.fn(async () => {
      values.set(storageKey, JSON.stringify(storedB));
      return {
        data: {
          session: callbackA,
          user: callbackA.user,
          redirectType: 'recovery' as const,
        },
        error: null,
      };
    });

    await expect(
      processAuthCallbackUrl(
        'eazyreview://auth/reset-password?code=AUTH_CODE_VALUE',
        {
          client: mockClient({ exchangeCodeForSession }),
          isOnline: () => true,
          storageKey,
          adoptExplicitSession: controlled.adopt,
        },
      ),
    ).resolves.toEqual({ kind: 'superseded' });
    expect(values.get(storageKey)).toBe(JSON.stringify(storedB));
  });

  it('keeps a URL-encoded callback server failure temporary', async () => {
    const client = mockClient({});

    await expect(
      processAuthCallbackUrl(
        'eazyreview://auth/reset-password?error=server_error&error_code=unexpected_failure',
        { client, isOnline: () => true },
      ),
    ).rejects.toMatchObject({
      code: 'temporary-failure',
      source: 'server',
    });
  });

  it('maps expired callback exchange to recovery-link-invalid', async () => {
    const client = mockClient({
      exchangeCodeForSession: jest.fn(async () => ({
        data: { session: null },
        error: {
          message: 'Email link is invalid or has expired',
          code: 'otp_expired',
          status: 403,
        },
      })),
    });

    await expect(
      processAuthCallbackUrl(
        'eazyreview://auth/reset-password?code=stale',
        { client, isOnline: () => true },
      ),
    ).rejects.toMatchObject({
      code: 'recovery-link-invalid',
      message: AUTH_USER_MESSAGES.recoveryLinkInvalid,
    });
  });

  it('ignores unrelated URLs', async () => {
    const client = mockClient({});
    await expect(
      processAuthCallbackUrl('eazyreview://product/123', {
        client,
        isOnline: () => true,
      }),
    ).resolves.toEqual({ kind: 'ignored' });
  });
});
