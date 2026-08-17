import { act, waitFor } from '@testing-library/react-native';
import { useEffect, type MutableRefObject } from 'react';
import { Text } from 'react-native';

import {
  AuthProvider,
  useAuth,
  type AuthContextValue,
} from '@/src/features/auth/AuthProvider';
import type { SignInResult, SignUpResult } from '@/src/features/auth/types';
import { accountKeys, catalogKeys, ratingKeys } from '@/src/lib/query/keys';
import { createAppQueryClient } from '@/src/lib/query/client';
import * as userScopedCache from '@/src/lib/query/userScopedCache';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import { renderWithProviders } from '@/src/test/renderWithProviders';

type MockSession = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
};

type Listener = (event: string, session: MockSession | null) => void;

function createMockAuthClient(options: {
  initialUser?: { id: string; email: string } | null;
  /**
   * When true, getSession does not resolve until completeRestore is called.
   */
  delayRestore?: boolean;
  /**
   * Override online `getUser` validation. Default: accept current sessionUser.
   */
  getUser?: jest.Mock;
}) {
  let listeners: Listener[] = [];
  let sessionUser = options.initialUser ?? null;
  const sessionsByAccessToken = new Map<string, MockSession>();
  const sessionForUser = (user: { id: string; email: string }): MockSession => {
    const session = {
      access_token: `access-${user.id}`,
      refresh_token: `refresh-${user.id}`,
      user,
    };
    sessionsByAccessToken.set(session.access_token, session);
    return session;
  };
  let resolveRestore:
    | ((user: { id: string; email: string } | null) => void)
    | null = null;

  const getSession = options.delayRestore
    ? jest.fn(
        () =>
          new Promise<{
            data: { session: { user: { id: string; email: string } } | null };
            error: null;
          }>((resolve) => {
            resolveRestore = (user) => {
              // Keep getUser principal in sync with the restored session shape.
              sessionUser = user;
              resolve({
                data: {
                  session: user ? sessionForUser(user) : null,
                },
                error: null,
              });
            };
          }),
      )
    : jest.fn(async () => ({
        data: {
          session: sessionUser ? sessionForUser(sessionUser) : null,
        },
        error: null,
      }));

  const getUser =
    options.getUser ??
    jest.fn(async () => {
      if (!sessionUser) {
        return {
          data: { user: null },
          error: {
            name: 'AuthSessionMissingError',
            message: 'Auth session missing!',
            status: 400,
          },
        };
      }
      return { data: { user: sessionUser }, error: null };
    });

  const client = {
    auth: {
      getSession,
      getUser,
      onAuthStateChange: jest.fn((callback: Listener) => {
        listeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners = listeners.filter((l) => l !== callback);
              },
            },
          },
        };
      }),
      signInWithPassword: jest.fn(async ({ email }: { email: string }) => {
        sessionUser = { id: `id-${email}`, email };
        const session = sessionForUser(sessionUser);
        for (const listener of listeners) {
          listener('SIGNED_IN', session);
        }
        return { data: { session, user: sessionUser }, error: null };
      }),
      signUp: jest.fn(async ({ email }: { email: string }) => {
        sessionUser = { id: `id-${email}`, email };
        const session = sessionForUser(sessionUser);
        for (const listener of listeners) {
          listener('SIGNED_IN', session);
        }
        return { data: { session, user: sessionUser }, error: null };
      }),
      signOut: jest.fn(async () => {
        sessionUser = null;
        for (const listener of listeners) {
          listener('SIGNED_OUT', null);
        }
        return { error: null };
      }),
      setSession: jest.fn(
        async ({ access_token }: { access_token: string }) => {
          const session = sessionsByAccessToken.get(access_token) ?? null;
          if (!session) {
            return {
              data: { session: null, user: null },
              error: { message: 'Unknown mock session' },
            };
          }
          sessionUser = session.user;
          for (const listener of listeners) {
            listener('SIGNED_IN', session);
          }
          return { data: { session, user: session.user }, error: null };
        },
      ),
    },
  } as unknown as AppSupabaseClient;

  return {
    client,
    emit(event: string, user: { id: string; email: string } | null) {
      sessionUser = user;
      const session = user ? sessionForUser(user) : null;
      for (const listener of listeners) {
        listener(event, session);
      }
    },
    completeRestore(user: { id: string; email: string } | null) {
      if (!resolveRestore) {
        throw new Error('Restore was not delayed or already completed.');
      }
      resolveRestore(user);
      resolveRestore = null;
    },
    getListenerCount: () => listeners.length,
  };
}

function AuthProbe() {
  const auth = useAuth();
  return (
    <Text testID="auth-probe">
      {`${auth.status}|${auth.user?.id ?? 'none'}|${auth.user?.email ?? ''}|${auth.recoveryPhase}`}
    </Text>
  );
}

function AuthControllerProbe({
  authRef,
}: {
  authRef: MutableRefObject<AuthContextValue | null>;
}) {
  const auth = useAuth();
  useEffect(() => {
    authRef.current = auth;
  }, [auth, authRef]);
  return (
    <Text testID="auth-probe">
      {`${auth.status}|${auth.user?.id ?? 'none'}|${auth.user?.email ?? ''}|${auth.recoveryPhase}`}
    </Text>
  );
}

function mockSessionUser(id: string, email: string) {
  return { id, email };
}

function mockSignedInResponse(id: string, email: string) {
  const user = mockSessionUser(id, email);
  return {
    data: { session: { user }, user },
    error: null,
  };
}

describe('AuthProvider', () => {
  it('restores a signed-in session and sets up one listener', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|idle',
      ),
    );
    expect(mock.client.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mock.getListenerCount()).toBe(1);

    await rendered.cleanup();
    expect(mock.getListenerCount()).toBe(0);
  });

  it('initializes signed-out when no session exists', async () => {
    const mock = createMockAuthClient({ initialUser: null });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );
    await rendered.cleanup();
  });

  it('clears zombie restored session online and removes user-scoped cache', async () => {
    const zombie = { id: 'user-zombie', email: 'zombie@example.com' };
    const getUser = jest.fn(async () => ({
      data: { user: null },
      error: {
        name: 'AuthApiError',
        code: 'user_not_found',
        status: 403,
        message: 'User from sub claim in JWT does not exist',
      },
    }));
    const mock = createMockAuthClient({
      initialUser: zombie,
      getUser,
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(catalogKeys.products(), [{ id: 'p1' }]);
    queryClient.setQueryData(accountKeys.profile('user-zombie'), {
      id: 'user-zombie',
      displayName: 'Ghost',
    });
    queryClient.setQueryData(ratingKeys.mine('user-zombie', 'p1'), {
      score100: 80,
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );
    expect(mock.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(queryClient.getQueryData(catalogKeys.products())).toEqual([
      { id: 'p1' },
    ]);
    expect(
      queryClient.getQueryData(accountKeys.profile('user-zombie')),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(ratingKeys.mine('user-zombie', 'p1')),
    ).toBeUndefined();

    await rendered.cleanup();
  });

  it('does not let delayed zombie cleanup sign out a newer signed-in principal', async () => {
    const delayedGetUser = jest.fn(
      () =>
        new Promise<{
          data: { user: null };
          error: {
            name: string;
            code: string;
            status: number;
            message: string;
          };
        }>((resolve) => {
          setTimeout(() => {
            resolve({
              data: { user: null },
              error: {
                name: 'AuthApiError',
                code: 'user_not_found',
                status: 403,
                message: 'User from sub claim in JWT does not exist',
              },
            });
          }, 40);
        }),
    );

    const mock = createMockAuthClient({
      initialUser: { id: 'zombie-a', email: 'a@example.com' },
      getUser: delayedGetUser,
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('zombie-a'), {
      id: 'zombie-a',
    });

    const authRef: MutableRefObject<AuthContextValue | null> = {
      current: null,
    };
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    // While zombie validation is still in flight, a real user signs in.
    await act(async () => {
      await authRef.current?.signIn({
        email: 'fresh@example.com',
        password: 'secret-pass',
      });
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|id-fresh@example.com|fresh@example.com|idle',
      ),
    );

    // Let delayed zombie getUser finish + any cleanup attempt settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });

    // Newer principal must remain signed in; only a same-principal cleanup
    // is allowed to wipe storage, and re-check must skip when ids diverge.
    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-in|id-fresh@example.com|fresh@example.com|idle',
    );

    await rendered.cleanup();
  });

  it('clears user-scoped cache on sign-out and keeps public catalog cache', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(catalogKeys.products(), [{ id: 'p1' }]);
    queryClient.setQueryData(accountKeys.profile('user-a'), {
      id: 'user-a',
      displayName: 'A',
    });
    queryClient.setQueryData(ratingKeys.mine('user-a', 'p1'), { score100: 90 });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_OUT', null);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    expect(queryClient.getQueryData(catalogKeys.products())).toEqual([
      { id: 'p1' },
    ]);
    expect(
      queryClient.getQueryData(accountKeys.profile('user-a')),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(ratingKeys.mine('user-a', 'p1')),
    ).toBeUndefined();

    await rendered.cleanup();
  });

  it('clears prior user cache when switching A → B', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });
    queryClient.setQueryData(catalogKeys.product('p1'), { id: 'p1' });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );

    expect(
      queryClient.getQueryData(accountKeys.profile('user-a')),
    ).toBeUndefined();
    expect(queryClient.getQueryData(catalogKeys.product('p1'))).toEqual({
      id: 'p1',
    });

    await rendered.cleanup();
  });

  it('does not clear user-scoped cache on same-user token refresh', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-b', email: 'b@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-b'), {
      id: 'user-b',
      displayName: 'Bee',
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'user-b',
      ),
    );

    await act(async () => {
      mock.emit('TOKEN_REFRESHED', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
    });

    expect(queryClient.getQueryData(accountKeys.profile('user-b'))).toEqual({
      id: 'user-b',
      displayName: 'Bee',
    });

    await rendered.cleanup();
  });

  it('lets a newer SIGNED_IN win over a delayed bootstrap restore', async () => {
    const mock = createMockAuthClient({
      initialUser: null,
      delayRestore: true,
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
    );

    // Still initializing while restore is pending.
    expect(rendered.getByTestId('auth-probe').props.children).toContain(
      'initializing',
    );

    // Newer event arrives while restore is still in flight.
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-new', email: 'new@example.com' });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-new|new@example.com|idle',
      ),
    );

    // Stale bootstrap reports signed-out after the event.
    await act(async () => {
      mock.completeRestore(null);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Newest authentication event must still win.
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-new|new@example.com|idle',
      ),
    );

    await rendered.cleanup();
  });

  it('lets a newer SIGNED_OUT win over a delayed signed-in restore', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-stale', email: 'stale@example.com' },
      delayRestore: true,
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      mock.emit('SIGNED_OUT', null);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    await act(async () => {
      mock.completeRestore({ id: 'user-stale', email: 'stale@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    await rendered.cleanup();
  });

  it('lets a newer SIGNED_OUT win over a stale in-flight SIGNED_IN cleanup', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    // SIGNED_IN B starts applySession and pauses inside user-scoped cleanup.
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(removeSpy).toHaveBeenCalled());

    // Newer SIGNED_OUT becomes authoritative while B cleanup is still held.
    await act(async () => {
      mock.emit('SIGNED_OUT', null);
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    // Give any stale B commit a chance to overwrite; it must not.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-out|none||idle',
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('lets a newer SIGNED_IN principal win over a stale in-flight principal cleanup', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(removeSpy).toHaveBeenCalled());

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-c', email: 'c@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-c|c@example.com|idle',
      ),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-in|user-c|c@example.com|idle',
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('returns superseded when explicit signIn B is overtaken by SIGNED_OUT', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });

    // Do not auto-emit; the test injects the superseding transition.
    (mock.client.auth.signInWithPassword as jest.Mock).mockImplementation(
      async () => mockSignedInResponse('user-b', 'b@example.com'),
    );

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const authRef = { current: null as AuthContextValue | null };
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    let signInResult: SignInResult | undefined;
    await act(async () => {
      const pending = authRef.current!.signIn({
        email: 'b@example.com',
        password: 'password1',
      });
      await Promise.resolve();
      await Promise.resolve();
      await waitFor(() => expect(removeSpy).toHaveBeenCalled());

      mock.emit('SIGNED_OUT', null);
      await Promise.resolve();
      await Promise.resolve();

      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
      signInResult = await pending;
    });

    expect(signInResult).toEqual({ kind: 'superseded' });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('returns superseded when explicit signIn B is overtaken by principal C', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });

    (mock.client.auth.signInWithPassword as jest.Mock).mockImplementation(
      async () => mockSignedInResponse('user-b', 'b@example.com'),
    );

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const authRef = { current: null as AuthContextValue | null };
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    let signInResult: SignInResult | undefined;
    await act(async () => {
      const pending = authRef.current!.signIn({
        email: 'b@example.com',
        password: 'password1',
      });
      await Promise.resolve();
      await Promise.resolve();
      await waitFor(() => expect(removeSpy).toHaveBeenCalled());

      mock.emit('SIGNED_IN', { id: 'user-c', email: 'c@example.com' });
      await Promise.resolve();
      await Promise.resolve();

      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
      signInResult = await pending;
    });

    expect(signInResult).toEqual({ kind: 'superseded' });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-c|c@example.com|idle',
      ),
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('keeps signed-in success when a same-principal SIGNED_IN advances generation', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });

    (mock.client.auth.signInWithPassword as jest.Mock).mockImplementation(
      async () => mockSignedInResponse('user-b', 'b@example.com'),
    );

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const authRef = { current: null as AuthContextValue | null };
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    let signInResult: SignInResult | undefined;
    await act(async () => {
      const pending = authRef.current!.signIn({
        email: 'b@example.com',
        password: 'password1',
      });
      await Promise.resolve();
      await Promise.resolve();
      await waitFor(() => expect(removeSpy).toHaveBeenCalled());

      // Normal SDK confirmation for the same principal B.
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();

      // B must not publish while A→B cache purge is still held.
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'user-a',
      );
      expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
        'user-b',
      );

      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
      signInResult = await pending;
    });

    expect(signInResult).toEqual({
      kind: 'signed-in',
      user: { id: 'user-b', email: 'b@example.com' },
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('does not publish B while A→B purge is held on duplicate SIGNED_IN B', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });
    queryClient.setQueryData(catalogKeys.products(), [{ id: 'p1' }]);

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(removeSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Critical: B must not publish while the serialized A→B purge is held.
    expect(rendered.getByTestId('auth-probe').props.children).toContain(
      'user-a',
    );
    expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
      'user-b',
    );

    await act(async () => {
      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('does not publish TOKEN_REFRESHED B early during an A→B purge', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });
    queryClient.setQueryData(accountKeys.profile('user-b'), {
      id: 'user-b',
      displayName: 'Bee',
    });

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(removeSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      mock.emit('TOKEN_REFRESHED', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).toContain(
      'user-a',
    );
    expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
      'user-b',
    );

    await act(async () => {
      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );

    // A→B purge ran once; same-user TOKEN_REFRESHED after cache prep must not
    // start a second destructive purge.
    expect(removeSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      mock.emit('TOKEN_REFRESHED', {
        id: 'user-b',
        email: 'b-refreshed@example.com',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b-refreshed@example.com|idle',
      ),
    );
    expect(removeSpy).toHaveBeenCalledTimes(1);

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('leaves no stale purge that can remove B queries after B is visible', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });
    queryClient.setQueryData(catalogKeys.products(), [{ id: 'p1' }]);

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(removeSpy).toHaveBeenCalled());

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
      'user-b',
    );

    await act(async () => {
      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );

    queryClient.setQueryData(accountKeys.profile('user-b'), { id: 'user-b' });

    // Flush any lingering transition tail work — nothing should remove B data.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(queryClient.getQueryData(accountKeys.profile('user-b'))).toEqual({
      id: 'user-b',
    });
    expect(queryClient.getQueryData(catalogKeys.products())).toEqual([
      { id: 'p1' },
    ]);

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('serializes A → B → C cache transitions without publishing during open purges', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });
    queryClient.setQueryData(catalogKeys.products(), [{ id: 'p1' }]);

    const cleanupHolds: (() => void)[] = [];
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            cleanupHolds.push(resolve);
          }),
      );

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(cleanupHolds.length).toBe(1));

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-c', email: 'c@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Neither B nor C may publish while purge #1 (A→B) is still open.
    expect(rendered.getByTestId('auth-probe').props.children).toContain(
      'user-a',
    );
    expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
      'user-b',
    );
    expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
      'user-c',
    );

    await act(async () => {
      cleanupHolds[0]!();
      await Promise.resolve();
      await Promise.resolve();
    });

    // After A→B purge, C's transition may need a second purge (B→C).
    await waitFor(() => expect(cleanupHolds.length).toBe(2));

    expect(rendered.getByTestId('auth-probe').props.children).not.toContain(
      'user-c',
    );

    await act(async () => {
      cleanupHolds[1]!();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-c|c@example.com|idle',
      ),
    );

    queryClient.setQueryData(accountKeys.profile('user-c'), { id: 'user-c' });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(queryClient.getQueryData(accountKeys.profile('user-c'))).toEqual({
      id: 'user-c',
    });
    expect(queryClient.getQueryData(catalogKeys.products())).toEqual([
      { id: 'p1' },
    ]);
    expect(removeSpy).toHaveBeenCalledTimes(2);

    removeSpy.mockRestore();
    await rendered.cleanup();
  });

  it('returns superseded when immediate-session signUp is overtaken by SIGNED_OUT', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    queryClient.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });

    (mock.client.auth.signUp as jest.Mock).mockImplementation(
      async () => mockSignedInResponse('user-b', 'b@example.com'),
    );

    let releaseCleanup: (() => void) | null = null;
    const cleanupHold = new Promise<void>((resolve) => {
      releaseCleanup = resolve;
    });
    const removeSpy = jest
      .spyOn(userScopedCache, 'removeUserScopedQueries')
      .mockImplementation(async () => {
        await cleanupHold;
      });

    const authRef = { current: null as AuthContextValue | null };
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    let signUpResult: SignUpResult | undefined;
    await act(async () => {
      const pending = authRef.current!.signUp({
        email: 'b@example.com',
        password: 'password1',
      });
      await Promise.resolve();
      await Promise.resolve();
      await waitFor(() => expect(removeSpy).toHaveBeenCalled());

      mock.emit('SIGNED_OUT', null);
      await Promise.resolve();
      await Promise.resolve();

      releaseCleanup?.();
      await Promise.resolve();
      await Promise.resolve();
      signUpResult = await pending;
    });

    expect(signUpResult).toEqual({ kind: 'superseded' });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });
});

describe('AuthProvider password recovery', () => {
  it('marks recovery verified on PASSWORD_RECOVERY without treating ordinary SIGNED_IN as recovery', async () => {
    const mock = createMockAuthClient({
      initialUser: null,
    });
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-a', email: 'a@example.com' });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|idle',
      ),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|verified',
      ),
    );

    await rendered.cleanup();
  });

  it('processes a cold-start recovery deep link into verified phase', async () => {
    const setSession = jest.fn(async () => ({
      data: {
        session: {
          user: { id: 'user-r', email: 'r@example.com' },
        },
      },
      error: null,
    }));
    const mock = createMockAuthClient({ initialUser: null });
    (mock.client.auth as unknown as { setSession?: jest.Mock }).setSession =
      setSession;

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () =>
        'eazyreview://auth/reset-password#access_token=tok&refresh_token=ref&type=recovery',
      ),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return {
            remove: () => {
              const index = listeners.indexOf(listener);
              if (index >= 0) {
                listeners.splice(index, 1);
              }
            },
          };
        },
      ),
    };

    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });

    const rendered = await renderWithProviders(
      <AuthProvider
        client={mock.client}
        enableSession
        linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|verified',
      ),
    );
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: 'ref',
    });
    expect(linking.getInitialURL).toHaveBeenCalled();

    await rendered.cleanup();
  });

  it('treats a delayed persisted INITIAL_SESSION as pre-link maintenance', async () => {
    type ValidationResult = {
      data: { user: { id: string; email: string } };
      error: null;
    };
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveValidation: ((result: ValidationResult) => void) | null = null;
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const getUser = jest.fn(
      () =>
        new Promise<ValidationResult>((resolve) => {
          resolveValidation = resolve;
        }),
    );
    const mock = createMockAuthClient({
      initialUser: { id: 'user-b', email: 'b@example.com' },
      getUser,
    });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );

    const linking = {
      getInitialURL: jest.fn(async () =>
        'eazyreview://auth/reset-password?code=DELAYED_INITIAL_SESSION_CODE',
      ),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );
    await act(async () => {
      mock.emit('INITIAL_SESSION', {
        id: 'user-b',
        email: 'b@example.com',
      });
      resolveValidation?.({
        data: { user: { id: 'user-b', email: 'b@example.com' } },
        error: null,
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        (
          mock.client.auth as unknown as {
            exchangeCodeForSession: jest.Mock;
          }
        ).exchangeCodeForSession,
      ).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|verified',
      ),
    );
    await rendered.cleanup();
  });

  it('keeps explicit sign-in authoritative while the local snapshot is pending', async () => {
    type SessionResult = {
      data: { session: MockSession | null };
      error: null;
    };
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveLocalSnapshot: ((result: SessionResult) => void) | null = null;
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    const defaultGetSession = mock.client.auth.getSession as jest.Mock;
    (mock.client.auth as unknown as { getSession: jest.Mock }).getSession = jest
      .fn()
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockImplementationOnce(
        () =>
          new Promise<SessionResult>((resolve) => {
            resolveLocalSnapshot = resolve;
          }),
      )
      .mockImplementation(() => defaultGetSession());
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );

    const linking = {
      getInitialURL: jest.fn(async () =>
        'eazyreview://auth/reset-password?code=SNAPSHOT_SIGN_IN_RACE_CODE',
      ),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(mock.client.auth.getSession).toHaveBeenCalledTimes(2),
    );
    await act(async () => {
      await authRef.current?.signIn({
        email: 'c@example.com',
        password: 'correct horse battery staple',
      });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|id-c@example.com|c@example.com|idle',
      ),
    );

    await act(async () => {
      resolveLocalSnapshot?.({ data: { session: null }, error: null });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        (
          mock.client.auth as unknown as {
            exchangeCodeForSession: jest.Mock;
          }
        ).exchangeCodeForSession,
      ).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|id-c@example.com|c@example.com|idle',
      ),
    );
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'id-c@example.com',
      email: 'c@example.com',
    });

    await rendered.cleanup();
  });

  it('allows verified recovery to replace a different session that predates the link', async () => {
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      return {
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      };
    });

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=PREEXISTING_SESSION_CODE',
        });
      }
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|verified',
      ),
    );
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'user-a',
      email: 'a@example.com',
    });

    await rendered.cleanup();
  });

  it.each(['INITIAL_SESSION', 'TOKEN_REFRESHED'] as const)(
    'ignores a pre-existing session %s event during recovery',
    async (maintenanceEvent) => {
      type ExchangeResult = {
        data: {
          session: { user: { id: string; email: string } };
          user: { id: string; email: string };
          redirectType: 'recovery';
        };
        error: null;
      };
      let resolveExchange: ((result: ExchangeResult) => void) | null = null;
      const mock = createMockAuthClient({ initialUser: null });
      (
        mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
      ).exchangeCodeForSession = jest.fn(
        () =>
          new Promise<ExchangeResult>((resolve) => {
            resolveExchange = resolve;
          }),
      );

      const listeners: ((event: { url: string }) => void)[] = [];
      const linking = {
        getInitialURL: jest.fn(async () => null),
        addEventListener: jest.fn(
          (_type: 'url', listener: (event: { url: string }) => void) => {
            listeners.push(listener);
            return { remove: jest.fn() };
          },
        ),
      };
      const queryClient = createAppQueryClient({
        defaultOptions: { queries: { gcTime: Infinity } },
      });
      const rendered = await renderWithProviders(
        <AuthProvider client={mock.client} enableSession linking={linking}>
          <AuthProbe />
        </AuthProvider>,
        { queryClient },
      );

      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toBe(
          'signed-out|none||idle',
        ),
      );
      await act(async () => {
        mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toBe(
          'signed-in|user-b|b@example.com|idle',
        ),
      );
      await act(async () => {
        for (const listener of listeners) {
          listener({
            url: 'eazyreview://auth/reset-password?code=REFRESH_RACE_CODE',
          });
        }
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toContain(
          '|processing',
        ),
      );

      await act(async () => {
        mock.emit(maintenanceEvent, {
          id: 'user-b',
          email: 'b@example.com',
        });
        mock.emit('PASSWORD_RECOVERY', {
          id: 'user-a',
          email: 'a@example.com',
        });
        resolveExchange?.({
          data: {
            session: {
              user: { id: 'user-a', email: 'a@example.com' },
            },
            user: { id: 'user-a', email: 'a@example.com' },
            redirectType: 'recovery',
          },
          error: null,
        });
        await Promise.resolve();
      });

      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toBe(
          'signed-in|user-a|a@example.com|verified',
        ),
      );
      const { data: sessionData } = await mock.client.auth.getSession();
      expect(sessionData.session?.user).toEqual({
        id: 'user-a',
        email: 'a@example.com',
      });

      await rendered.cleanup();
    },
  );

  it('waits for invalid-bootstrap cleanup before exchanging a recovery link', async () => {
    type ValidationResult = {
      data: { user: null };
      error: {
        name: string;
        code: string;
        status: number;
        message: string;
      };
    };
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveValidation: ((result: ValidationResult) => void) | null = null;
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const getUser = jest.fn(
      () =>
        new Promise<ValidationResult>((resolve) => {
          resolveValidation = resolve;
        }),
    );
    const mock = createMockAuthClient({
      initialUser: { id: 'expired-user', email: 'expired@example.com' },
      getUser,
    });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() => expect(getUser).toHaveBeenCalledTimes(1));
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=BOOTSTRAP_CLEANUP_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );
    expect(mock.client.auth.exchangeCodeForSession).not.toHaveBeenCalled();

    await act(async () => {
      resolveValidation?.({
        data: { user: null },
        error: {
          name: 'AuthApiError',
          code: 'user_not_found',
          status: 403,
          message: 'User from sub claim in JWT does not exist',
        },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mock.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }),
    );
    await waitFor(() =>
      expect(mock.client.auth.exchangeCodeForSession).toHaveBeenCalledWith(
        'BOOTSTRAP_CLEANUP_CODE',
      ),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|verified',
      ),
    );
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'user-a',
      email: 'a@example.com',
    });

    await rendered.cleanup();
  });

  it('makes a recovery link retryable when session restore stalls', async () => {
    jest.useFakeTimers();
    try {
      type ValidationResult = {
        data: { user: { id: string; email: string } };
        error: null;
      };
      let resolveValidation: ((result: ValidationResult) => void) | null = null;
      const getUser = jest.fn(
        () =>
          new Promise<ValidationResult>((resolve) => {
            resolveValidation = resolve;
          }),
      );
      const mock = createMockAuthClient({
        initialUser: { id: 'user-b', email: 'b@example.com' },
        getUser,
      });
      const exchangeCodeForSession = jest.fn(async () => ({
        data: { session: null },
        error: {
          message: 'Email link is invalid or has expired',
          code: 'otp_expired',
          status: 403,
        },
      }));
      (
        mock.client.auth as unknown as {
          exchangeCodeForSession?: jest.Mock;
        }
      ).exchangeCodeForSession = exchangeCodeForSession;

      const listeners: ((event: { url: string }) => void)[] = [];
      const linking = {
        getInitialURL: jest.fn(async () => null),
        addEventListener: jest.fn(
          (_type: 'url', listener: (event: { url: string }) => void) => {
            listeners.push(listener);
            return { remove: jest.fn() };
          },
        ),
      };
      const queryClient = createAppQueryClient({
        defaultOptions: { queries: { gcTime: Infinity } },
      });
      const rendered = await renderWithProviders(
        <AuthProvider client={mock.client} enableSession linking={linking}>
          <AuthProbe />
        </AuthProvider>,
        { queryClient },
      );

      await waitFor(() => expect(getUser).toHaveBeenCalledTimes(1));
      await act(async () => {
        for (const listener of listeners) {
          listener({
            url: 'eazyreview://auth/reset-password?code=RESTORE_TIMEOUT_CODE',
          });
        }
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toContain(
          '|processing',
        ),
      );

      await act(async () => {
        jest.advanceTimersByTime(10_000);
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toContain(
          '|temporary-failure',
        ),
      );
      expect(exchangeCodeForSession).not.toHaveBeenCalled();

      await act(async () => {
        resolveValidation?.({
          data: { user: { id: 'user-b', email: 'b@example.com' } },
          error: null,
        });
        await Promise.resolve();
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toBe(
          'signed-in|user-b|b@example.com|temporary-failure',
        ),
      );

      await act(async () => {
        for (const listener of listeners) {
          listener({
            url: 'eazyreview://auth/reset-password?code=RESTORE_TIMEOUT_CODE',
          });
        }
      });
      await waitFor(() =>
        expect(exchangeCodeForSession).toHaveBeenCalledWith(
          'RESTORE_TIMEOUT_CODE',
        ),
      );

      await rendered.cleanup();
    } finally {
      jest.useRealTimers();
    }
  });

  it('marks recovery unavailable when a warm recovery link is expired', async () => {
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(async () => ({
      data: { session: null },
      error: {
        message: 'Email link is invalid or has expired',
        code: 'otp_expired',
        status: 403,
      },
    }));

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return {
            remove: () => {
              const index = listeners.indexOf(listener);
              if (index >= 0) {
                listeners.splice(index, 1);
              }
            },
          };
        },
      ),
    };

    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });

    const rendered = await renderWithProviders(
      <AuthProvider
        client={mock.client}
        enableSession
        linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );

    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=expired-code',
        });
      }
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|unavailable',
      ),
    );

    await rendered.cleanup();
  });

  it('keeps a transient recovery callback retryable when the same warm link is reopened', async () => {
    const exchangeCodeForSession = jest
      .fn()
      .mockResolvedValueOnce({
        data: { session: null, user: null, redirectType: null },
        error: {
          message: 'Internal server error',
          code: 'unexpected_failure',
          status: 503,
        },
      })
      .mockResolvedValueOnce({
        data: {
          session: {
            user: { id: 'user-r', email: 'r@example.com' },
          },
          user: { id: 'user-r', email: 'r@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = exchangeCodeForSession;

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return {
            remove: () => {
              const index = listeners.indexOf(listener);
              if (index >= 0) {
                listeners.splice(index, 1);
              }
            },
          };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );
    const recoveryUrl =
      'eazyreview://auth/reset-password?code=RETRYABLE_CODE_VALUE';

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({ url: recoveryUrl });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|temporary-failure',
      ),
    );

    await act(async () => {
      for (const listener of listeners) {
        listener({ url: recoveryUrl });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|verified',
      ),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(2);

    await rendered.cleanup();
  });

  it('does not promote a late recovery result after another account signs in', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = exchangeCodeForSession;

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return {
            remove: () => {
              const index = listeners.indexOf(listener);
              if (index >= 0) {
                listeners.splice(index, 1);
              }
            },
          };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=LATE_RECOVERY_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|processing',
      ),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-in|user-b|b@example.com|idle',
    );
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'user-b',
      email: 'b@example.com',
    });

    await rendered.cleanup();
  });

  it('keeps the latest explicit same-account sign-in after an earlier sign-out', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=SIGN_OUT_IN_A_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );

    await act(async () => {
      await authRef.current?.signOut();
      await authRef.current?.signIn({
        email: 'a@example.com',
        password: 'correct horse battery staple',
      });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|id-a@example.com|a@example.com|idle',
      ),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'id-a@example.com',
        email: 'a@example.com',
      });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'id-a@example.com', email: 'a@example.com' },
          },
          user: { id: 'id-a@example.com', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|id-a@example.com|a@example.com|idle',
      ),
    );
    expect(mock.client.auth.signOut).toHaveBeenCalledTimes(1);
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'id-a@example.com',
      email: 'a@example.com',
    });

    await rendered.cleanup();
  });

  it('restores a newer sign-in when a stale PKCE recovery emits SIGNED_IN', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = exchangeCodeForSession;

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=LATE_SIGNED_IN_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|processing',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-a', email: 'a@example.com' });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'user-b',
      email: 'b@example.com',
    });

    await rendered.cleanup();
  });

  it('fails closed with local sign-out when recovery reconciliation cannot restore the winner', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    (
      mock.client.auth as unknown as { setSession: jest.Mock }
    ).setSession = jest.fn(async () => ({
      data: { session: null, user: null },
      error: { message: 'Session restore unavailable', status: 503 },
    }));
    (
      mock.client.auth as unknown as { signOut: jest.Mock }
    ).signOut = jest.fn(async () => ({
      error: { message: 'Sign-out unavailable', status: 503 },
    }));

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=FAILED_RECONCILIATION_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|processing',
      ),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-a', email: 'a@example.com' });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );
    expect(mock.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });

    await rendered.cleanup();
  });

  it('processes only one delivery of the same in-flight PKCE recovery link', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const exchangeCodeForSession = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ExchangeResult>((resolve) => {
            resolveExchange = resolve;
          }),
      )
      .mockResolvedValueOnce({
        data: { session: null, user: null, redirectType: null },
        error: {
          message: 'Email link is invalid or has expired',
          code: 'otp_expired',
          status: 403,
        },
      });
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = exchangeCodeForSession;

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );
    const recoveryUrl =
      'eazyreview://auth/reset-password?code=DUPLICATE_IN_FLIGHT_CODE';

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({ url: recoveryUrl });
        listener({ url: recoveryUrl });
      }
    });
    await act(async () => {
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-r', email: 'r@example.com' },
          },
          user: { id: 'user-r', email: 'r@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|verified',
      ),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);

    await rendered.cleanup();
  });

  it('makes the latest different recovery link authoritative while exchanges stay serialized', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveFirstExchange: ((result: ExchangeResult) => void) | null = null;
    let resolveSecondExchange: ((result: ExchangeResult) => void) | null = null;
    const exchangeCodeForSession = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ExchangeResult>((resolve) => {
            resolveFirstExchange = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<ExchangeResult>((resolve) => {
            resolveSecondExchange = resolve;
          }),
      );
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = exchangeCodeForSession;

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=FIRST_RECOVERY_CODE',
        });
      }
    });

    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledTimes(1));
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=SECOND_RECOVERY_CODE',
        });
      }
    });
    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      resolveFirstExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledTimes(2));
    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-in|user-a|a@example.com|processing',
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-b',
        email: 'b@example.com',
      });
      resolveSecondExchange?.({
        data: {
          session: {
            user: { id: 'user-b', email: 'b@example.com' },
          },
          user: { id: 'user-b', email: 'b@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|verified',
      ),
    );
    await expect(mock.client.auth.getSession()).resolves.toMatchObject({
      data: { session: { user: { id: 'user-b' } } },
    });

    await rendered.cleanup();
  });

  it('queues the latest recovery callback until stale-session reconciliation settles', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveFirstExchange: ((result: ExchangeResult) => void) | null = null;
    let resolveRestore: (() => void) | null = null;
    const exchangeCodeForSession = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ExchangeResult>((resolve) => {
            resolveFirstExchange = resolve;
          }),
      )
      .mockResolvedValueOnce({
        data: {
          session: { user: { id: 'user-c', email: 'c@example.com' } },
          user: { id: 'user-c', email: 'c@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = exchangeCodeForSession;
    (mock.client.auth as unknown as { setSession: jest.Mock }).setSession =
      jest.fn(
        () =>
          new Promise((resolve) => {
            resolveRestore = () => {
              mock.emit('SIGNED_IN', {
                id: 'user-b',
                email: 'b@example.com',
              });
              resolve({ data: { session: null, user: null }, error: null });
            };
          }),
      );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=STALE_RECOVERY_CODE',
        });
      }
    });
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      mock.emit('SIGNED_IN', { id: 'user-a', email: 'a@example.com' });
      resolveFirstExchange?.({
        data: {
          session: { user: { id: 'user-a', email: 'a@example.com' } },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(mock.client.auth.setSession).toHaveBeenCalled());

    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=NEW_RECOVERY_CODE',
        });
      }
      await Promise.resolve();
    });
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRestore?.();
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|idle',
      ),
    );

    await waitFor(() =>
      expect(exchangeCodeForSession).toHaveBeenCalledTimes(2),
    );

    await rendered.cleanup();
  });

  it('lets a newer sign-in wait for and then supersede recovery reconciliation', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    let resolveRestore: (() => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    (
      mock.client.auth as unknown as { setSession: jest.Mock }
    ).setSession = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveRestore = () => {
            mock.emit('SIGNED_IN', {
              id: 'user-b',
              email: 'b@example.com',
            });
            resolve({ data: { session: null, user: null }, error: null });
          };
        }),
    );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=RECONCILIATION_RACE_CODE',
        });
      }
    });
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
    });
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-a', email: 'a@example.com' });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });
    await waitFor(() => expect(mock.client.auth.setSession).toHaveBeenCalled());

    await act(async () => {
      const signInPromise = authRef.current?.signIn({
        email: 'c@example.com',
        password: 'correct horse battery staple',
      });
      await Promise.resolve();
      resolveRestore?.();
      await signInPromise;
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|id-c@example.com|c@example.com|idle',
      ),
    );
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'id-c@example.com',
      email: 'c@example.com',
    });

    await rendered.cleanup();
  });

  it('does not let later recovery reconciliation overtake an in-flight sign-in', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    let resolveSignIn: (() => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    (mock.client.auth.signInWithPassword as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = () => {
            mock.emit('SIGNED_IN', {
              id: 'user-c',
              email: 'c@example.com',
            });
            resolve(mockSignedInResponse('user-c', 'c@example.com'));
          };
        }),
    );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=LATE_RECONCILIATION_CODE',
        });
      }
    });
    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
    });

    let signInPromise: Promise<SignInResult> | undefined;
    await act(async () => {
      signInPromise = authRef.current?.signIn({
        email: 'c@example.com',
        password: 'correct horse battery staple',
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mock.client.auth.signInWithPassword).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-a', email: 'a@example.com' });
      resolveExchange?.({
        data: {
          session: {
            user: { id: 'user-a', email: 'a@example.com' },
          },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mock.client.auth.setSession).not.toHaveBeenCalled();

    await act(async () => {
      resolveSignIn?.();
      await signInPromise;
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-c|c@example.com|idle',
      ),
    );
    expect(mock.client.auth.setSession).not.toHaveBeenCalled();
    const { data: sessionData } = await mock.client.auth.getSession();
    expect(sessionData.session?.user).toEqual({
      id: 'user-c',
      email: 'c@example.com',
    });

    await rendered.cleanup();
  });

  it('keeps recovery verified when a concurrently queued sign-in fails', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    let resolveSignInFailure: (() => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    (mock.client.auth.signInWithPassword as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignInFailure = () => {
            resolve({
              data: { session: null, user: null },
              error: {
                name: 'AuthApiError',
                code: 'invalid_credentials',
                status: 400,
                message: 'Invalid login credentials',
              },
            });
          };
        }),
    );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=FAILED_SIGN_IN_RACE_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );

    let signInPromise: Promise<SignInResult> | undefined;
    await act(async () => {
      signInPromise = authRef.current?.signIn({
        email: 'c@example.com',
        password: 'wrong password',
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mock.client.auth.signInWithPassword).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
      resolveExchange?.({
        data: {
          session: { user: { id: 'user-a', email: 'a@example.com' } },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await act(async () => {
      resolveSignInFailure?.();
      await expect(signInPromise).rejects.toMatchObject({
        code: 'invalid-credentials',
      });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|verified',
      ),
    );
    expect(mock.client.auth.setSession).not.toHaveBeenCalled();

    await rendered.cleanup();
  });

  it('ignores a stale password-update event after a new recovery starts', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=NEW_RECOVERY_CODE',
        });
      }
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|processing',
      ),
    );

    await act(async () => {
      mock.emit('USER_UPDATED', { id: 'user-a', email: 'a@example.com' });
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-b',
        email: 'b@example.com',
      });
      resolveExchange?.({
        data: {
          session: { user: { id: 'user-b', email: 'b@example.com' } },
          user: { id: 'user-b', email: 'b@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-b|b@example.com|verified',
      ),
    );
    expect(mock.client.auth.setSession).not.toHaveBeenCalled();

    await rendered.cleanup();
  });

  it('does not add reconciliation-blocked sign-ins to the awaited operation snapshot', async () => {
    type ExchangeResult = {
      data: {
        session: { user: { id: string; email: string } };
        user: { id: string; email: string };
        redirectType: 'recovery';
      };
      error: null;
    };
    let resolveExchange: ((result: ExchangeResult) => void) | null = null;
    let resolveFirstSignIn: (() => void) | null = null;
    const mock = createMockAuthClient({ initialUser: null });
    (
      mock.client.auth as unknown as { exchangeCodeForSession?: jest.Mock }
    ).exchangeCodeForSession = jest.fn(
      () =>
        new Promise<ExchangeResult>((resolve) => {
          resolveExchange = resolve;
        }),
    );
    (mock.client.auth.signInWithPassword as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstSignIn = () => {
              resolve(mockSignedInResponse('user-c', 'c@example.com'));
            };
          }),
      )
      .mockResolvedValueOnce(mockSignedInResponse('user-d', 'd@example.com'));

    const listeners: ((event: { url: string }) => void)[] = [];
    const linking = {
      getInitialURL: jest.fn(async () => null),
      addEventListener: jest.fn(
        (_type: 'url', listener: (event: { url: string }) => void) => {
          listeners.push(listener);
          return { remove: jest.fn() };
        },
      ),
    };
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={linking}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|idle',
      ),
    );
    await act(async () => {
      for (const listener of listeners) {
        listener({
          url: 'eazyreview://auth/reset-password?code=SNAPSHOT_RACE_CODE',
        });
      }
    });

    let firstSignIn: Promise<SignInResult> | undefined;
    await act(async () => {
      firstSignIn = authRef.current?.signIn({
        email: 'c@example.com',
        password: 'correct horse battery staple',
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mock.client.auth.signInWithPassword).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      mock.emit('SIGNED_IN', { id: 'user-b', email: 'b@example.com' });
      resolveExchange?.({
        data: {
          session: { user: { id: 'user-a', email: 'a@example.com' } },
          user: { id: 'user-a', email: 'a@example.com' },
          redirectType: 'recovery',
        },
        error: null,
      });
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'initializing',
      ),
    );

    let secondSignIn: Promise<SignInResult> | undefined;
    await act(async () => {
      secondSignIn = authRef.current?.signIn({
        email: 'd@example.com',
        password: 'correct horse battery staple',
      });
      await Promise.resolve();
    });
    expect(mock.client.auth.signInWithPassword).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirstSignIn?.();
      await firstSignIn;
    });
    await waitFor(() =>
      expect(mock.client.auth.signInWithPassword).toHaveBeenCalledTimes(2),
    );
    await act(async () => {
      await secondSignIn;
    });

    await rendered.cleanup();
  });

  it('clears recovery phase on sign-out', async () => {
    const mock = createMockAuthClient({
      initialUser: { id: 'user-a', email: 'a@example.com' },
    });
    const authRef: { current: AuthContextValue | null } = { current: null };
    const queryClient = createAppQueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession linking={null}>
        <AuthControllerProbe authRef={authRef} />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|user-a',
      ),
    );

    await act(async () => {
      mock.emit('PASSWORD_RECOVERY', {
        id: 'user-a',
        email: 'a@example.com',
      });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toContain(
        '|verified',
      ),
    );

    await act(async () => {
      await authRef.current?.signOut();
    });
    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none||idle',
      ),
    );

    await rendered.cleanup();
  });

  it('settles an ordinary PKCE callback unavailable without authorizing recovery', async () => {
    jest.useFakeTimers();
    try {
      const exchangeCodeForSession = jest.fn(async () => ({
        data: {
          session: {
            user: { id: 'user-p', email: 'p@example.com' },
          },
        },
        error: null,
      }));
      const mock = createMockAuthClient({ initialUser: null });
      (
        mock.client.auth as unknown as {
          exchangeCodeForSession?: jest.Mock;
        }
      ).exchangeCodeForSession = exchangeCodeForSession;

      const listeners: ((event: { url: string }) => void)[] = [];
      const linking = {
        getInitialURL: jest.fn(async () => null),
        addEventListener: jest.fn(
          (_type: 'url', listener: (event: { url: string }) => void) => {
            listeners.push(listener);
            return {
              remove: () => {
                const index = listeners.indexOf(listener);
                if (index >= 0) {
                  listeners.splice(index, 1);
                }
              },
            };
          },
        ),
      };
      const queryClient = createAppQueryClient({
        defaultOptions: { queries: { gcTime: Infinity } },
      });

      const rendered = await renderWithProviders(
        <AuthProvider client={mock.client} enableSession linking={linking}>
          <AuthProbe />
        </AuthProvider>,
        { queryClient },
      );

      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toContain(
          '|idle',
        ),
      );
      await act(async () => {
        for (const listener of listeners) {
          listener({
            url: 'eazyreview://auth/reset-password?code=AUTH_CODE_VALUE',
          });
        }
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toContain(
          '|unavailable',
        ),
      );
      expect(exchangeCodeForSession).toHaveBeenCalledWith('AUTH_CODE_VALUE');

      await act(async () => {
        mock.emit('SIGNED_IN', { id: 'user-p', email: 'p@example.com' });
        jest.advanceTimersByTime(1000);
      });
      await waitFor(() =>
        expect(rendered.getByTestId('auth-probe').props.children).toBe(
          'signed-in|user-p|p@example.com|unavailable',
        ),
      );

      await rendered.cleanup();
    } finally {
      jest.useRealTimers();
    }
  });
});
