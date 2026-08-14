import {
  processAuthCallbackUrl,
  requestPasswordReset,
  updatePasswordFromRecovery,
} from '@/src/features/auth/api';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

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

  it('maps backend failure without enumerating accounts', async () => {
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
    ).rejects.toMatchObject({
      message: AUTH_USER_MESSAGES.recoveryRequestFailed,
    });

    const message = AUTH_USER_MESSAGES.recoveryRequestFailed.toLowerCase();
    expect(message).not.toMatch(/not found|no account|exists|does not exist/);
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

    const result = await processAuthCallbackUrl(
      'eazyreview://auth/reset-password?code=AUTH_CODE_VALUE',
      { client, isOnline: () => true },
    );

    expect(result).toEqual({
      kind: 'password-recovery',
      user: { id: 'u1', email: 'a@example.com' },
    });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('AUTH_CODE_VALUE');
  });

  it('applies recovery tokens and reports password-recovery kind', async () => {
    const setSession = jest.fn(async () => ({
      data: {
        session: { user: { id: 'u1', email: 'a@example.com' } },
      },
      error: null,
    }));
    const client = mockClient({ setSession });

    const result = await processAuthCallbackUrl(
      'eazyreview://auth/reset-password#access_token=tok&refresh_token=ref&type=recovery',
      { client, isOnline: () => true },
    );

    expect(result.kind).toBe('password-recovery');
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: 'ref',
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
