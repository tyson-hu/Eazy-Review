import {
  restoreSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '@/src/features/auth/api';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

function mockClient(auth: {
  signInWithPassword?: jest.Mock;
  signUp?: jest.Mock;
  signOut?: jest.Mock;
  getSession?: jest.Mock;
}): AppSupabaseClient {
  return {
    auth: {
      signInWithPassword:
        auth.signInWithPassword ?? jest.fn(async () => ({ data: {}, error: null })),
      signUp: auth.signUp ?? jest.fn(async () => ({ data: {}, error: null })),
      signOut: auth.signOut ?? jest.fn(async () => ({ error: null })),
      getSession:
        auth.getSession ??
        jest.fn(async () => ({ data: { session: null }, error: null })),
    },
  } as unknown as AppSupabaseClient;
}

describe('auth api', () => {
  it('signs in with an immediate session', async () => {
    const client = mockClient({
      signInWithPassword: jest.fn(async () => ({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
        },
        error: null,
      })),
    });

    const result = await signInWithPassword(
      { email: 'a@example.com', password: 'secret-pass' },
      { client, isOnline: () => true },
    );

    expect(result).toEqual({
      kind: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
    });
  });

  it('maps invalid credentials', async () => {
    const client = mockClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400,
          code: 'invalid_credentials',
        },
      })),
    });

    await expect(
      signInWithPassword(
        { email: 'a@example.com', password: 'wrong' },
        { client, isOnline: () => true },
      ),
    ).rejects.toMatchObject({
      code: 'invalid-credentials',
      message: AUTH_USER_MESSAGES.invalidCredentials,
    });
  });

  it('rejects offline sign-in without calling the client', async () => {
    const signIn = jest.fn();
    const client = mockClient({ signInWithPassword: signIn });

    await expect(
      signInWithPassword(
        { email: 'a@example.com', password: 'secret' },
        { client, isOnline: () => false },
      ),
    ).rejects.toBeInstanceOf(AuthError);

    expect(signIn).not.toHaveBeenCalled();
  });

  it('signs up with an immediate session', async () => {
    const client = mockClient({
      signUp: jest.fn(async () => ({
        data: {
          session: { user: { id: 'new', email: 'new@example.com' } },
          user: { id: 'new', email: 'new@example.com' },
        },
        error: null,
      })),
    });

    await expect(
      signUpWithPassword(
        { email: 'new@example.com', password: 'secret-pass' },
        { client, isOnline: () => true },
      ),
    ).resolves.toEqual({
      kind: 'signed-in',
      user: { id: 'new', email: 'new@example.com' },
    });
  });

  it('returns confirmation-required when session is null', async () => {
    const client = mockClient({
      signUp: jest.fn(async () => ({
        data: {
          session: null,
          user: { id: 'pending', email: 'pending@example.com' },
        },
        error: null,
      })),
    });

    await expect(
      signUpWithPassword(
        { email: 'pending@example.com', password: 'secret-pass' },
        { client, isOnline: () => true },
      ),
    ).resolves.toEqual({
      kind: 'confirmation-required',
      email: 'pending@example.com',
    });
  });

  it('signs out and restores empty sessions', async () => {
    const signOutMock = jest.fn(async () => ({ error: null }));
    const client = mockClient({
      signOut: signOutMock,
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    });

    await signOut({ client });
    expect(signOutMock).toHaveBeenCalled();
    await expect(restoreSession({ client })).resolves.toBeNull();
  });

  it('restores a persisted session user', async () => {
    const client = mockClient({
      getSession: jest.fn(async () => ({
        data: {
          session: { user: { id: 'restored', email: 'r@example.com' } },
        },
        error: null,
      })),
    });

    await expect(restoreSession({ client })).resolves.toEqual({
      id: 'restored',
      email: 'r@example.com',
    });
  });
});
