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
  getUser?: jest.Mock;
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
      getUser:
        auth.getUser ??
        jest.fn(async () => ({ data: { user: null }, error: null })),
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

  it('signs out with explicit local scope only', async () => {
    const signOutMock = jest.fn(async () => ({ error: null }));
    const client = mockClient({
      signOut: signOutMock,
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    });

    await signOut({ client });
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    await expect(
      restoreSession({ client, isOnline: () => true }),
    ).resolves.toBeNull();
  });

  describe('restoreSession', () => {
    const localSession = {
      user: { id: 'restored', email: 'r@example.com' },
    };

    it('A: returns null when no stored session', async () => {
      const getUser = jest.fn();
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: null },
          error: null,
        })),
        getUser,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toBeNull();
      expect(getUser).not.toHaveBeenCalled();
    });

    it('B: validates online with getUser and returns the server-backed user', async () => {
      const getUser = jest.fn(async () => ({
        data: { user: { id: 'restored', email: 'r@example.com' } },
        error: null,
      }));
      const signOutMock = jest.fn();
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: localSession },
          error: null,
        })),
        getUser,
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toEqual({
        id: 'restored',
        email: 'r@example.com',
      });
      expect(getUser).toHaveBeenCalledTimes(1);
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('C: clears a zombie local session when getUser definitively rejects it', async () => {
      const signOutMock = jest.fn(async () => ({ error: null }));
      const client = mockClient({
        getSession: jest
          .fn()
          .mockResolvedValueOnce({
            data: { session: localSession },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { session: localSession },
            error: null,
          }),
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: {
            name: 'AuthApiError',
            message: 'User from sub claim in JWT does not exist',
            status: 403,
            code: 'user_not_found',
          },
        })),
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toBeNull();
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('D: preserves local session when offline without calling getUser', async () => {
      const getUser = jest.fn();
      const signOutMock = jest.fn();
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: localSession },
          error: null,
        })),
        getUser,
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => false }),
      ).resolves.toEqual({
        id: 'restored',
        email: 'r@example.com',
      });
      expect(getUser).not.toHaveBeenCalled();
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('E: preserves local session on transient getUser transport failure', async () => {
      const signOutMock = jest.fn();
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: localSession },
          error: null,
        })),
        getUser: jest.fn(async () => {
          throw new TypeError('Network request failed');
        }),
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toEqual({
        id: 'restored',
        email: 'r@example.com',
      });
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('E: preserves local session on transient getUser 5xx error object', async () => {
      const signOutMock = jest.fn();
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: localSession },
          error: null,
        })),
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: {
            name: 'AuthApiError',
            message: 'Internal server error',
            status: 503,
            code: 'unexpected_failure',
          },
        })),
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toEqual({
        id: 'restored',
        email: 'r@example.com',
      });
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('does not clear a newer principal after delayed invalid getUser for an old user', async () => {
      const signOutMock = jest.fn(async () => ({ error: null }));
      const client = mockClient({
        getSession: jest
          .fn()
          .mockResolvedValueOnce({
            data: {
              session: { user: { id: 'zombie-a', email: 'a@example.com' } },
            },
            error: null,
          })
          // Principal re-check after definitive invalid: B signed in mid-flight.
          .mockResolvedValueOnce({
            data: {
              session: { user: { id: 'user-b', email: 'b@example.com' } },
            },
            error: null,
          }),
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: {
            name: 'AuthApiError',
            code: 'user_not_found',
            status: 403,
            message: 'User from sub claim in JWT does not exist',
          },
        })),
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toEqual({
        id: 'user-b',
        email: 'b@example.com',
      });
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('G: still returns signed-out when local cleanup fails after invalid session', async () => {
      const signOutMock = jest.fn(async () => {
        throw new Error('storage write failed');
      });
      const client = mockClient({
        getSession: jest
          .fn()
          .mockResolvedValueOnce({
            data: { session: localSession },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { session: localSession },
            error: null,
          }),
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: {
            name: 'AuthSessionMissingError',
            message: 'Auth session missing!',
            status: 400,
          },
        })),
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toBeNull();
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('clears on session_not_found without leaving signed-in state', async () => {
      const signOutMock = jest.fn(async () => ({ error: null }));
      const client = mockClient({
        getSession: jest
          .fn()
          .mockResolvedValueOnce({
            data: { session: localSession },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { session: localSession },
            error: null,
          }),
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: {
            name: 'AuthApiError',
            code: 'session_not_found',
            status: 403,
            message: 'Session from session_id claim in JWT does not exist',
          },
        })),
        signOut: signOutMock,
      });

      await expect(
        restoreSession({ client, isOnline: () => true }),
      ).resolves.toBeNull();
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    });
  });
});
