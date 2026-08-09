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

type Listener = (
  event: string,
  session: {
    user: { id: string; email?: string | null };
  } | null,
) => void;

function createMockAuthClient(options: {
  initialUser?: { id: string; email: string } | null;
  /**
   * When true, getSession does not resolve until completeRestore is called.
   */
  delayRestore?: boolean;
}) {
  let listeners: Listener[] = [];
  let sessionUser = options.initialUser ?? null;
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
              resolve({
                data: {
                  session: user ? { user } : null,
                },
                error: null,
              });
            };
          }),
      )
    : jest.fn(async () => ({
        data: {
          session: sessionUser ? { user: sessionUser } : null,
        },
        error: null,
      }));

  const client = {
    auth: {
      getSession,
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
        const session = { user: sessionUser };
        for (const listener of listeners) {
          listener('SIGNED_IN', session);
        }
        return { data: { session, user: sessionUser }, error: null };
      }),
      signUp: jest.fn(async ({ email }: { email: string }) => {
        sessionUser = { id: `id-${email}`, email };
        const session = { user: sessionUser };
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
    },
  } as unknown as AppSupabaseClient;

  return {
    client,
    emit(event: string, user: { id: string; email: string } | null) {
      sessionUser = user;
      const session = user ? { user } : null;
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
      {`${auth.status}|${auth.user?.id ?? 'none'}|${auth.user?.email ?? ''}`}
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
      {`${auth.status}|${auth.user?.id ?? 'none'}|${auth.user?.email ?? ''}`}
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
      <AuthProvider client={mock.client} enableSession>
        <AuthProbe />
      </AuthProvider>,
      { queryClient },
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-in|user-a|a@example.com',
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
      <AuthProvider client={mock.client} enableSession>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|',
      ),
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
    queryClient.setQueryData(ratingKeys.mine('user-a', 'p1'), { overall: 9 });

    const rendered = await renderWithProviders(
      <AuthProvider client={mock.client} enableSession>
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
        'signed-out|none|',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-b|b@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-new|new@example.com',
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
        'signed-in|user-new|new@example.com',
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
      <AuthProvider client={mock.client} enableSession>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      mock.emit('SIGNED_OUT', null);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|',
      ),
    );

    await act(async () => {
      mock.completeRestore({ id: 'user-stale', email: 'stale@example.com' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-out|none|',
      ),
    );

    // Give any stale B commit a chance to overwrite; it must not.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-out|none|',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-c|c@example.com',
      ),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(rendered.getByTestId('auth-probe').props.children).toBe(
      'signed-in|user-c|c@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-out|none|',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-c|c@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-b|b@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-b|b@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-b|b@example.com',
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
        'signed-in|user-b|b-refreshed@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-b|b@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-in|user-c|c@example.com',
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
      <AuthProvider client={mock.client} enableSession>
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
        'signed-out|none|',
      ),
    );

    removeSpy.mockRestore();
    await rendered.cleanup();
  });
});
