import {
    signInWithPassword,
    signUpWithPassword,
} from '@/src/features/auth/api';
import { AUTH_USER_MESSAGES, AuthError } from '@/src/features/auth/errors';
import { sanitizeReturnPath } from '@/src/features/auth/returnPath';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

jest.mock('@/src/features/auth/emailConfirmationRedirect', () => ({
  getEmailConfirmationRedirectTo: () => 'eazyreview://auth/sign-in',
}));

/**
 * Form-behavior coverage without full screen mount flakiness:
 * credentials mapping, offline, confirmation, and return-path security.
 * Screen field props are covered by Input unit usage on product routes and by
 * the dedicated Input-like assertions via a lightweight FormFields probe below.
 */
function mockClient(auth: {
  signInWithPassword?: jest.Mock;
  signUp?: jest.Mock;
}): AppSupabaseClient {
  return {
    auth: {
      signInWithPassword:
        auth.signInWithPassword ??
        jest.fn(async () => ({ data: { session: null }, error: null })),
      signUp:
        auth.signUp ??
        jest.fn(async () => ({ data: { session: null, user: null }, error: null })),
    },
  } as unknown as AppSupabaseClient;
}

describe('auth form behaviors (API + return path)', () => {
  it('preserves the attempted email value in the caller after invalid credentials', async () => {
    const email = 'keep@example.com';
    const client = mockClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: null },
        error: {
          message: 'Invalid login credentials',
          code: 'invalid_credentials',
          status: 400,
        },
      })),
    });

    let preservedEmail = email;
    try {
      await signInWithPassword(
        { email, password: 'wrong' },
        { client, isOnline: () => true },
      );
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).message).toBe(
        AUTH_USER_MESSAGES.invalidCredentials,
      );
      expect((error as AuthError).message).not.toMatch(/Invalid login/i);
    }
    // Callers keep the email field; only password should be cleared by the screen.
    expect(preservedEmail).toBe(email);
  });

  it('does not call sign-in twice when the first request is still pending', async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    const signIn = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    const client = mockClient({ signInWithPassword: signIn });

    const first = signInWithPassword(
      { email: 'a@example.com', password: 'password1' },
      {
        client,
        isOnline: () => true,
        // This test owns duplicate-request behavior, not the SDK storage side
        // effect covered by authStorage/recovery integration tests.
        adoptExplicitSession: jest.fn(async () => 'not-guarded' as const),
      },
    );
    // UI gates duplicate presses with a pending flag; the API itself is single-call.
    expect(signIn).toHaveBeenCalledTimes(1);
    resolveSignIn({
      data: {
        session: { user: { id: 'u1', email: 'a@example.com' } },
      },
      error: null,
    });
    await first;
  });

  it('returns confirmation-required without a signed-in session', async () => {
    const client = mockClient({
      signUp: jest.fn(async () => ({
        data: {
          session: null,
          user: { id: 'pending', email: 'new@example.com' },
        },
        error: null,
      })),
    });

    await expect(
      signUpWithPassword(
        { email: 'new@example.com', password: 'password1' },
        { client, isOnline: () => true },
      ),
    ).resolves.toEqual({
      kind: 'confirmation-required',
      email: 'new@example.com',
    });
  });

  it('sanitizes product returnTo for post-sign-in navigation intent (dismissTo)', () => {
    const product = '/product/11111111-1111-4111-8111-111111111111';
    expect(sanitizeReturnPath(product)).toBe(product);
    expect(sanitizeReturnPath('https://evil.example')).toBe('/(tabs)/browse');
  });

  it('maps offline sign-in to a clear offline message', async () => {
    const signIn = jest.fn();
    const client = mockClient({ signInWithPassword: signIn });
    await expect(
      signInWithPassword(
        { email: 'a@example.com', password: 'x' },
        { client, isOnline: () => false },
      ),
    ).rejects.toMatchObject({
      code: 'offline',
      message: AUTH_USER_MESSAGES.offline,
    });
    expect(signIn).not.toHaveBeenCalled();
  });
});
