import {
  restoreSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  validateSessionSnapshotIsolated,
} from '@/src/features/auth/api';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import type { Session } from '@supabase/supabase-js';

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
      stopAutoRefresh: jest.fn(),
      admin: {
        signOut: jest.fn(async () => ({ data: null, error: null })),
      },
    },
  } as unknown as AppSupabaseClient;
}

function testOptions(client: AppSupabaseClient, online: boolean) {
  return {
    client,
    isOnline: () => online,
    createIsolatedAuthClient: () => client,
    storageKey: 'sb-test-auth-token',
    removeStoredSessionIfExact: jest.fn(async () => 'removed' as const),
    adoptExplicitSession: jest.fn(async () => 'not-guarded' as const),
  };
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
      testOptions(client, true),
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
        testOptions(client, true),
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
        testOptions(client, false),
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
        testOptions(client, true),
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
        testOptions(client, true),
      ),
    ).resolves.toEqual({
      kind: 'confirmation-required',
      email: 'pending@example.com',
    });
  });

  it('settles signed out without shared-client signOut when no session is stored', async () => {
    const signOutMock = jest.fn(async () => ({ error: null }));
    const client = mockClient({
      signOut: signOutMock,
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    });

    await signOut({ client });
    expect(signOutMock).not.toHaveBeenCalled();
    await expect(
      restoreSession(testOptions(client, true)),
    ).resolves.toBeNull();
  });

  describe('restoreSession', () => {
    const localSession = {
      access_token: 'restored-access-token',
      refresh_token: 'restored-refresh-token',
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
        restoreSession(testOptions(client, true)),
      ).resolves.toBeNull();
      expect(getUser).not.toHaveBeenCalled();
    });

    it('keeps bootstrap non-authoritative when stored-session access fails', async () => {
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: null },
          error: { status: 500, code: 'storage_unavailable' },
        })),
      });

      await expect(
        restoreSession(testOptions(client, true)),
      ).rejects.toMatchObject({ code: 'temporary-failure' });
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
        restoreSession(testOptions(client, true)),
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
        restoreSession(testOptions(client, true)),
      ).resolves.toBeNull();
      expect(signOutMock).not.toHaveBeenCalled();
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
        restoreSession(testOptions(client, false)),
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
        restoreSession(testOptions(client, true)),
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
        restoreSession(testOptions(client, true)),
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
              session: {
                access_token: 'zombie-access-a',
                refresh_token: 'zombie-refresh-a',
                user: { id: 'zombie-a', email: 'a@example.com' },
              },
            },
            error: null,
          })
          // Principal re-check after definitive invalid: B signed in mid-flight.
          .mockResolvedValueOnce({
            data: {
              session: {
                access_token: 'access-b',
                refresh_token: 'refresh-b',
                user: { id: 'user-b', email: 'b@example.com' },
              },
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
        restoreSession({
          ...testOptions(client, true),
          removeStoredSessionIfExact: jest.fn(async () => 'changed' as const),
        }),
      ).resolves.toEqual({
        id: 'user-b',
        email: 'b@example.com',
      });
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('does not clear a fresh same-user recovery session after delayed invalid validation', async () => {
      const signOutMock = jest.fn(async () => ({ error: null }));
      const client = mockClient({
        getSession: jest
          .fn()
          .mockResolvedValueOnce({
            data: {
              session: {
                access_token: 'expired-access-token',
                refresh_token: 'expired-refresh-token',
                user: { id: 'user-a', email: 'a@example.com' },
              },
            },
            error: null,
          })
          // Recovery replaced the expired session while getUser was in flight.
          .mockResolvedValueOnce({
            data: {
              session: {
                access_token: 'recovery-access-token',
                refresh_token: 'recovery-refresh-token',
                user: { id: 'user-a', email: 'a@example.com' },
              },
            },
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
        restoreSession({
          ...testOptions(client, true),
          removeStoredSessionIfExact: jest.fn(async () => 'changed' as const),
        }),
      ).resolves.toEqual({
        id: 'user-a',
        email: 'a@example.com',
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
        restoreSession(testOptions(client, true)),
      ).resolves.toBeNull();
      expect(signOutMock).not.toHaveBeenCalled();
    });

    it('does not claim signed-out when exact invalid-session cleanup is unavailable', async () => {
      const client = mockClient({
        getSession: jest.fn(async () => ({
          data: { session: localSession },
          error: null,
        })),
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: {
            name: 'AuthSessionMissingError',
            message: 'Auth session missing!',
            status: 400,
          },
        })),
      });

      await expect(
        restoreSession({
          ...testOptions(client, true),
          removeStoredSessionIfExact: jest.fn(async () => 'unavailable' as const),
        }),
      ).rejects.toMatchObject({ code: 'temporary-failure' });
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
        restoreSession(testOptions(client, true)),
      ).resolves.toBeNull();
      expect(signOutMock).not.toHaveBeenCalled();
    });
  });
});

describe('principal-bound exact Auth API', () => {
  const capturedSession = {
    access_token: 'captured-access-a',
    refresh_token: 'captured-refresh-a',
    user: { id: 'principal-a', email: 'a@example.com' },
  } as unknown as Session;

  it('signs out through isolated exact bearer and exact local removal only', async () => {
    const sharedSignOut = jest.fn();
    const client = mockClient({
      getSession: jest.fn(async () => ({
        data: { session: capturedSession },
        error: null,
      })),
      signOut: sharedSignOut,
    });
    const isolatedSignOut = jest.fn(async () => ({ data: null, error: null }));
    const stopAutoRefresh = jest.fn();
    const isolatedClient = {
      auth: {
        admin: { signOut: isolatedSignOut },
        stopAutoRefresh,
      },
    } as unknown as AppSupabaseClient;
    const removeStoredSessionIfExact = jest.fn(async () => 'removed' as const);

    await expect(
      signOut({
        client,
        createIsolatedAuthClient: () => isolatedClient,
        storageKey: 'sb-project-auth-token',
        removeStoredSessionIfExact,
      }),
    ).resolves.toEqual({ kind: 'signed-out' });
    expect(sharedSignOut).not.toHaveBeenCalled();
    expect(isolatedSignOut).toHaveBeenCalledWith('captured-access-a', 'local');
    expect(removeStoredSessionIfExact).toHaveBeenCalledWith(
      'sb-project-auth-token',
      {
        principalId: 'principal-a',
        accessToken: 'captured-access-a',
        refreshToken: 'captured-refresh-a',
      },
    );
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it('preserves and returns replacement B when exact local removal reports changed', async () => {
    const replacement = {
      access_token: 'access-b',
      refresh_token: 'refresh-b',
      user: { id: 'principal-b', email: 'b@example.com' },
    } as unknown as Session;
    const client = mockClient({
      getSession: jest
        .fn()
        .mockResolvedValueOnce({ data: { session: capturedSession }, error: null })
        .mockResolvedValueOnce({ data: { session: replacement }, error: null }),
    });
    const isolatedClient = {
      auth: {
        admin: { signOut: jest.fn(async () => ({ data: null, error: null })) },
        stopAutoRefresh: jest.fn(),
      },
    } as unknown as AppSupabaseClient;

    await expect(
      signOut({
        client,
        createIsolatedAuthClient: () => isolatedClient,
        storageKey: 'sb-project-auth-token',
        removeStoredSessionIfExact: jest.fn(async () => 'changed' as const),
      }),
    ).resolves.toEqual({
      kind: 'superseded',
      user: { id: 'principal-b', email: 'b@example.com' },
    });
  });

  it('does not claim signed-out when stored-session access or exact cleanup is unavailable', async () => {
    const getSessionFailure = mockClient({
      getSession: jest.fn(async () => ({
        data: { session: null },
        error: { status: 500, code: 'storage_unavailable' },
      })),
    });
    await expect(signOut({ client: getSessionFailure })).rejects.toMatchObject({
      code: 'temporary-failure',
      message: AUTH_USER_MESSAGES.signOutFailed,
    });

    const capturedClient = mockClient({
      getSession: jest.fn(async () => ({
        data: { session: capturedSession },
        error: null,
      })),
    });
    await expect(
      signOut({
        client: capturedClient,
        createIsolatedAuthClient: () => ({
          auth: {
            admin: { signOut: jest.fn(async () => ({ error: null })) },
            stopAutoRefresh: jest.fn(),
          },
        }) as unknown as AppSupabaseClient,
        storageKey: 'sb-project-auth-token',
        removeStoredSessionIfExact: jest.fn(async () => 'unavailable' as const),
      }),
    ).rejects.toMatchObject({
      code: 'temporary-failure',
      message: AUTH_USER_MESSAGES.signOutFailed,
    });
  });

  it('still exact-removes local A when isolated revoke fails', async () => {
    const client = mockClient({
      getSession: jest.fn(async () => ({
        data: { session: capturedSession },
        error: null,
      })),
    });
    const removeStoredSessionIfExact = jest.fn(async () => 'removed' as const);

    await expect(
      signOut({
        client,
        createIsolatedAuthClient: () => ({
          auth: {
            admin: {
              signOut: jest.fn(async () => {
                throw new Error('remote unavailable');
              }),
            },
            stopAutoRefresh: jest.fn(),
          },
        }) as unknown as AppSupabaseClient,
        storageKey: 'sb-project-auth-token',
        removeStoredSessionIfExact,
      }),
    ).resolves.toEqual({ kind: 'signed-out' });
    expect(removeStoredSessionIfExact).toHaveBeenCalledTimes(1);
  });

  it('validates the captured bearer on isolated Auth without shared getUser', async () => {
    const sharedGetUser = jest.fn();
    const client = mockClient({ getUser: sharedGetUser });
    const isolatedGetUser = jest.fn(async (jwt: string) => ({
      data: { user: { id: 'principal-a', email: 'a@example.com' } },
      error: null,
    }));
    const isolatedClient = {
      auth: {
        getUser: isolatedGetUser,
        stopAutoRefresh: jest.fn(),
      },
    } as unknown as AppSupabaseClient;

    await expect(
      validateSessionSnapshotIsolated(capturedSession, {
        client,
        createIsolatedAuthClient: () => isolatedClient,
      }),
    ).resolves.toEqual({
      kind: 'valid',
      user: { id: 'principal-a', email: 'a@example.com' },
    });
    expect(isolatedGetUser).toHaveBeenCalledWith('captured-access-a');
    expect(sharedGetUser).not.toHaveBeenCalled();
  });

  it('adopts a fresh explicit sign-in session before reporting success', async () => {
    const fullSession = {
      access_token: 'fresh-access-a',
      refresh_token: 'fresh-refresh-a',
      user: { id: 'principal-a', email: 'a@example.com' },
    } as unknown as Session;
    const client = mockClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: fullSession },
        error: null,
      })),
    });
    const adoptExplicitSession = jest.fn(async () => 'adopted' as const);

    await expect(
      signInWithPassword(
        { email: 'a@example.com', password: 'password-a' },
        {
          client,
          isOnline: () => true,
          storageKey: 'sb-project-auth-token',
          adoptExplicitSession,
        },
      ),
    ).resolves.toEqual({
      kind: 'signed-in',
      user: { id: 'principal-a', email: 'a@example.com' },
    });
    expect(adoptExplicitSession).toHaveBeenCalledWith(
      'sb-project-auth-token',
      fullSession,
    );
  });

  it('returns superseded when guarded adoption observes a newer stored winner', async () => {
    const fullSession = {
      access_token: 'fresh-access-a',
      refresh_token: 'fresh-refresh-a',
      user: { id: 'principal-a', email: 'a@example.com' },
    } as unknown as Session;
    const client = mockClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: fullSession },
        error: null,
      })),
    });

    await expect(
      signInWithPassword(
        { email: 'a@example.com', password: 'password-a' },
        {
          client,
          isOnline: () => true,
          storageKey: 'sb-project-auth-token',
          adoptExplicitSession: jest.fn(async () => 'superseded' as const),
        },
      ),
    ).resolves.toEqual({ kind: 'superseded' });
  });
});
