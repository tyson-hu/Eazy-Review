import { act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AuthProvider, useAuth } from '@/src/features/auth/AuthProvider';
import { accountKeys, catalogKeys, ratingKeys } from '@/src/lib/query/keys';
import { createAppQueryClient } from '@/src/lib/query/client';
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
}) {
  let listeners: Listener[] = [];
  let sessionUser = options.initialUser ?? null;

  const client = {
    auth: {
      getSession: jest.fn(async () => ({
        data: {
          session: sessionUser
            ? { user: sessionUser }
            : null,
        },
        error: null,
      })),
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
});
