import { act, waitFor } from '@testing-library/react-native';
import { useEffect, type MutableRefObject } from 'react';
import { Text } from 'react-native';

import {
  AuthProvider,
  useAuth,
  type AuthContextValue,
} from '@/src/features/auth/AuthProvider';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { DeleteAccountOutcome } from '@/src/features/auth/types';
import { accountKeys, catalogKeys } from '@/src/lib/query/keys';
import { createAppQueryClient } from '@/src/lib/query/client';
import * as userScopedCache from '@/src/lib/query/userScopedCache';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import { renderWithProviders } from '@/src/test/renderWithProviders';

const mockRestoreSession = jest.fn();
const mockReauthenticate = jest.fn();
const mockDeleteCurrentUser = jest.fn();
const mockPreflight = jest.fn();
const mockArm = jest.fn();
const mockMarkDispatched = jest.fn();
const mockSettleGuard = jest.fn();
const mockDisarm = jest.fn();
const mockSettleSession = jest.fn();
const mockIsBlocked = jest.fn();
const mockReconcile = jest.fn();
const mockSubscribe = jest.fn();
const mockGuardListeners: (() => void)[] = [];
const mockRunAuthOperation = jest.fn();
let mockAuthOperationDepth = 0;

jest.mock('@/src/features/auth/api', () => {
  const actual = jest.requireActual<typeof import('@/src/features/auth/api')>(
    '@/src/features/auth/api',
  );
  return {
    ...actual,
    restoreSession: (...args: unknown[]) => mockRestoreSession(...args),
  };
});

jest.mock('@/src/features/auth/deletion.api', () => ({
  reauthenticateForAccountDeletion: (...args: unknown[]) =>
    mockReauthenticate(...args),
  deleteCurrentUser: (...args: unknown[]) => mockDeleteCurrentUser(...args),
}));

jest.mock('@/src/lib/supabase/authCoordination', () => {
  const actual = jest.requireActual<
    typeof import('@/src/lib/supabase/authCoordination')
  >('@/src/lib/supabase/authCoordination');
  return {
    ...actual,
    runSupabaseAuthOperation: (...args: unknown[]) =>
      mockRunAuthOperation(...args),
  };
});

jest.mock('@/src/lib/supabase/authStorage', () => {
  const actual = jest.requireActual<
    typeof import('@/src/lib/supabase/authStorage')
  >('@/src/lib/supabase/authStorage');
  return {
    ...actual,
    preflightPrincipalBoundAuthStorage: (...args: unknown[]) =>
      mockPreflight(...args),
    armPrincipalDeletionGuard: (...args: unknown[]) => mockArm(...args),
    markPrincipalDeletionDispatched: (...args: unknown[]) =>
      mockMarkDispatched(...args),
    settlePrincipalDeletionGuard: (...args: unknown[]) => mockSettleGuard(...args),
    disarmPrincipalDeletionGuard: (...args: unknown[]) => mockDisarm(...args),
    settleGuardedPrincipalSession: (...args: unknown[]) =>
      mockSettleSession(...args),
    isSessionBlockedByDeletionGuard: (...args: unknown[]) => mockIsBlocked(...args),
    reconcileGuardedAuthStorage: (...args: unknown[]) => mockReconcile(...args),
    reconcileGuardedSignedOutEvent: (...args: unknown[]) => mockReconcile(...args),
    subscribePrincipalDeletionGuardChanges: (...args: unknown[]) =>
      mockSubscribe(...args),
  };
});

jest.mock('@/src/lib/supabase/client', () => {
  const actual = jest.requireActual<typeof import('@/src/lib/supabase/client')>(
    '@/src/lib/supabase/client',
  );
  return {
    ...actual,
    getSupabaseAuthStorageKey: jest.fn(
      () => 'sb-configured-public-auth-token',
    ),
  };
});

type MockSession = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
};

type Listener = (event: string, session: MockSession | null) => void;

function session(principalId: string, version: string): MockSession {
  return {
    access_token: `access-${principalId}-${version}`,
    refresh_token: `refresh-${principalId}-${version}`,
    user: { id: principalId, email: `${principalId}-email-label` },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createMockAuthClient(initialSession: MockSession) {
  let currentSession: MockSession | null = initialSession;
  let listeners: Listener[] = [];
  const known = new Map([[initialSession.access_token, initialSession]]);
  const emit = (event: string, next: MockSession | null) => {
    currentSession = next;
    if (next) known.set(next.access_token, next);
    for (const listener of listeners) listener(event, next);
  };
  const sharedSignOut = jest.fn(async () => ({ error: null }));
  const setSession = jest.fn(async ({ access_token }: { access_token: string }) => {
    if (mockAuthOperationDepth !== 0) {
      throw new Error('setSession re-entered the shared Auth operation lock');
    }
    const next = known.get(access_token) ?? null;
    if (next) emit('SIGNED_IN', next);
    return { data: { session: next, user: next?.user ?? null }, error: null };
  });
  const client = {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: currentSession },
        error: null,
      })),
      getUser: jest.fn(async (accessToken: string) => {
        const knownSession = known.get(accessToken) ?? null;
        return knownSession == null
          ? {
              data: { user: null },
              error: { status: 401, code: 'session_not_found' },
            }
          : { data: { user: knownSession.user }, error: null };
      }),
      stopAutoRefresh: jest.fn(),
      onAuthStateChange: jest.fn((callback: Listener) => {
        listeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners = listeners.filter((listener) => listener !== callback);
              },
            },
          },
        };
      }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: sharedSignOut,
      setSession,
    },
  } as unknown as AppSupabaseClient;
  return {
    client,
    emit,
    remember(next: MockSession) {
      known.set(next.access_token, next);
    },
    setSession,
    sharedSignOut,
  };
}

function Probe({
  authRef,
  states,
}: {
  authRef: MutableRefObject<AuthContextValue | null>;
  states?: string[];
}) {
  const auth = useAuth();
  const snapshot = `${auth.status}|${auth.user?.id ?? 'none'}|${auth.recoveryPhase}`;
  useEffect(() => {
    authRef.current = auth;
  }, [auth, authRef]);
  useEffect(() => {
    states?.push(snapshot);
  }, [snapshot, states]);
  return <Text testID="auth-probe">{snapshot}</Text>;
}

async function renderSignedIn(states?: string[]) {
  const initial = session('principal-a', 'initial');
  const mock = createMockAuthClient(initial);
  const queryClient = createAppQueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  const authRef: MutableRefObject<AuthContextValue | null> = { current: null };
  const rendered = await renderWithProviders(
    <AuthProvider client={mock.client} enableSession linking={null}>
      <Probe authRef={authRef} states={states} />
    </AuthProvider>,
    { queryClient },
  );
  await waitFor(() =>
    expect(rendered.getByTestId('auth-probe').props.children).toContain(
      'signed-in|principal-a',
    ),
  );
  return { mock, queryClient, authRef, rendered };
}

function deletionMethod(auth: AuthContextValue | null) {
  return auth?.deleteAccount ?? null;
}

async function invokeInAct<T>(operation: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  let failure: unknown;
  let failed = false;
  await act(async () => {
    try {
      value = await operation();
    } catch (error) {
      failed = true;
      failure = error;
    }
  });
  if (failed) throw failure;
  return value as T;
}

function expectCalledBefore(first: jest.Mock, second: jest.Mock): void {
  expect(first.mock.invocationCallOrder[0]).toBeLessThan(
    second.mock.invocationCallOrder[0],
  );
}

describe('AuthProvider guarded account deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of [
      mockRestoreSession,
      mockReauthenticate,
      mockDeleteCurrentUser,
      mockPreflight,
      mockArm,
      mockMarkDispatched,
      mockSettleGuard,
      mockDisarm,
      mockSettleSession,
      mockIsBlocked,
      mockReconcile,
      mockSubscribe,
      mockRunAuthOperation,
    ]) {
      mock.mockReset();
    }
    mockRestoreSession.mockResolvedValue({
      id: 'principal-a',
      email: 'principal-a-email-label',
    });
    mockPreflight.mockResolvedValue('ready');
    mockArm.mockResolvedValue({ kind: 'armed', guardRevision: 1 });
    mockMarkDispatched.mockResolvedValue('pending');
    mockSettleGuard.mockResolvedValue('settled');
    mockDisarm.mockResolvedValue({ kind: 'disarmed' });
    mockSettleSession.mockResolvedValue({
      kind: 'removed-a',
      companionCleanup: 'removed',
    });
    mockIsBlocked.mockResolvedValue(false);
    mockReconcile.mockResolvedValue({ kind: 'unavailable' });
    mockSubscribe.mockReturnValue(() => undefined);
    mockAuthOperationDepth = 0;
    mockRunAuthOperation.mockImplementation(
      async (_storageKey: string, operation: () => Promise<unknown>) => {
        mockAuthOperationDepth += 1;
        try {
          return await operation();
        } finally {
          mockAuthOperationDepth -= 1;
        }
      },
    );
    mockGuardListeners.splice(0);
    mockSubscribe.mockImplementation((_storageKey: string, listener: () => void) => {
      mockGuardListeners.push(listener);
      return () => undefined;
    });
    mockReauthenticate.mockResolvedValue({
      user: { id: 'principal-a', email: 'principal-a-email-label' },
      accessToken: 'fresh-access-token-a',
    });
    mockDeleteCurrentUser.mockResolvedValue({ kind: 'deleted' });
  });

  it('publishes a token-free provider deletion method', async () => {
    const harness = await renderSignedIn();
    expect(deletionMethod(harness.authRef.current)).toEqual(expect.any(Function));
    expect(harness.authRef.current).not.toHaveProperty('accessToken');
    expect(harness.authRef.current).not.toHaveProperty('session');
    await harness.rendered.cleanup();
  });

  it('orders preparing reauth pending dispatch guard settlement and exact A cleanup', async () => {
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    harness.queryClient.setQueryData(catalogKeys.product('product-a'), { id: 'product-a' });
    const method = deletionMethod(harness.authRef.current);
    if (!method) throw new Error('deleteAccount is missing');

    let outcome: DeleteAccountOutcome | undefined;
    await act(async () => {
      outcome = await method(' password-bytes-a ');
    });

    expect(outcome).toEqual({ kind: 'deleted' });
    expectCalledBefore(mockPreflight, mockArm);
    expectCalledBefore(mockArm, mockReauthenticate);
    expectCalledBefore(mockReauthenticate, mockMarkDispatched);
    expectCalledBefore(mockMarkDispatched, mockDeleteCurrentUser);
    expectCalledBefore(mockDeleteCurrentUser, mockSettleGuard);
    expectCalledBefore(mockSettleGuard, mockSettleSession);
    expect(mockReauthenticate).toHaveBeenCalledWith(
      {
        email: 'principal-a-email-label',
        password: ' password-bytes-a ',
        expectedPrincipalId: 'principal-a',
      },
      expect.any(Object),
    );
    expect(mockDeleteCurrentUser).toHaveBeenCalledWith(
      'fresh-access-token-a',
      expect.any(Object),
    );
    expect(harness.mock.sharedSignOut).not.toHaveBeenCalled();
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toBeUndefined();
    expect(harness.queryClient.getQueryData(catalogKeys.product('product-a'))).toEqual({
      id: 'product-a',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    await harness.rendered.cleanup();
  });

  it('arms inside a short Auth-operation section and reauthenticates after release', async () => {
    const armDepths: number[] = [];
    const reauthenticationDepths: number[] = [];
    mockArm.mockImplementationOnce(async () => {
      armDepths.push(mockAuthOperationDepth);
      return { kind: 'armed', guardRevision: 1 };
    });
    mockReauthenticate.mockImplementationOnce(async () => {
      reauthenticationDepths.push(mockAuthOperationDepth);
      return {
        user: { id: 'principal-a', email: 'principal-a-email-label' },
        accessToken: 'fresh-access-token-a',
      };
    });
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current);
    if (!method) throw new Error('deleteAccount is missing');

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'deleted',
    });

    expect(armDepths).toEqual([1]);
    expect(reauthenticationDepths).toEqual([0]);
    expect(mockPreflight).toHaveBeenCalledWith(
      'sb-injected-auth-token',
      'principal-a',
    );
    expect(mockArm).toHaveBeenCalledWith(
      'sb-injected-auth-token',
      'principal-a',
    );
    await harness.rendered.cleanup();
  });

  it('fails before reauthentication or dispatch when coordination preflight is unavailable', async () => {
    mockPreflight.mockRejectedValueOnce(new Error('coordination unavailable'));
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;
    await expect(invokeInAct(() => method('password-a'))).rejects.toMatchObject({
      code: 'account-deletion-failed',
    });
    expect(mockArm).not.toHaveBeenCalled();
    expect(mockReauthenticate).not.toHaveBeenCalled();
    expect(mockDeleteCurrentUser).not.toHaveBeenCalled();
    await harness.rendered.cleanup();
  });

  it('maps guard-busy before reauthentication to the fixed in-progress error', async () => {
    mockPreflight.mockResolvedValueOnce('guard-busy');
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;
    await expect(invokeInAct(() => method('password-a'))).rejects.toEqual(
      new AuthError(
        'account-deletion-in-progress',
        AUTH_USER_MESSAGES.accountDeletionInProgress,
      ),
    );
    expect(mockReauthenticate).not.toHaveBeenCalled();
    await harness.rendered.cleanup();
  });

  it('disarms the exact preparing revision after fixed pre-revocation failure', async () => {
    mockDeleteCurrentUser.mockRejectedValueOnce(
      new AuthError(
        'account-deletion-failed',
        AUTH_USER_MESSAGES.accountDeletionFailed,
        { source: 'server', status: 503 },
      ),
    );
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    const method = deletionMethod(harness.authRef.current)!;
    await expect(invokeInAct(() => method('password-a'))).rejects.toMatchObject({
      code: 'account-deletion-failed',
    });
    expect(mockDisarm).toHaveBeenCalledWith(
      'sb-injected-auth-token',
      'principal-a',
      1,
    );
    expect(mockSettleSession).not.toHaveBeenCalled();
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toEqual({
      id: 'a',
    });
    await harness.rendered.cleanup();
  });

  it('disarms and preserves A when Functions client construction fails before invocation', async () => {
    mockDeleteCurrentUser.mockImplementationOnce(
      async (_accessToken: string, options: { onInvocationStart?: () => void }) => {
        expect(options.onInvocationStart).toEqual(expect.any(Function));
        throw new AuthError(
          'account-deletion-failed',
          AUTH_USER_MESSAGES.accountDeletionFailed,
        );
      },
    );
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).rejects.toMatchObject({
      code: 'account-deletion-failed',
    });
    expect(mockDisarm).toHaveBeenCalledWith(
      'sb-injected-auth-token',
      'principal-a',
      1,
    );
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toEqual({
      id: 'a',
    });
    expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
      'signed-in|principal-a',
    );
    await harness.rendered.cleanup();
  });

  it('reconciles blocked A after an unconfirmed disarm clears the owner exemption', async () => {
    mockDeleteCurrentUser.mockRejectedValueOnce(
      new AuthError(
        'account-deletion-failed',
        AUTH_USER_MESSAGES.accountDeletionFailed,
        { source: 'server', status: 503 },
      ),
    );
    mockDisarm.mockResolvedValueOnce({ kind: 'unconfirmed' });
    mockReconcile
      .mockResolvedValueOnce({ kind: 'unavailable' })
      .mockResolvedValueOnce({
        kind: 'blocked',
        principalId: 'principal-a',
        guardRevision: 1,
        guardState: 'preparing',
      });
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).rejects.toMatchObject({
      code: 'account-deletion-failed',
    });

    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    expect(mockReconcile).toHaveBeenCalledTimes(2);
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toBeUndefined();
    await harness.rendered.cleanup();
  });

  it('keeps the destructive server outcome when A cleanup is quarantined', async () => {
    mockDeleteCurrentUser.mockResolvedValueOnce({
      kind: 'unconfirmed-signed-out',
    });
    mockSettleSession.mockResolvedValueOnce({
      kind: 'quarantined-unavailable',
    });
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'unconfirmed-signed-out',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    expect(harness.mock.sharedSignOut).not.toHaveBeenCalled();
    await harness.rendered.cleanup();
  });

  it('never disarms after a destructive outcome when local settlement throws', async () => {
    mockSettleGuard.mockRejectedValueOnce(new Error('local settlement failed'));
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'deleted',
    });

    expect(mockDeleteCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockDisarm).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    await harness.rendered.cleanup();
  });

  it('rejects duplicate deletion while isolated reauthentication is pending', async () => {
    const reauth = deferred<unknown>();
    mockReauthenticate.mockImplementationOnce(() => reauth.promise);
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;
    let first!: Promise<DeleteAccountOutcome>;
    await act(async () => {
      first = method('password-a');
      await Promise.resolve();
    });
    await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledTimes(1));
    await expect(invokeInAct(() => method('password-a'))).rejects.toMatchObject({
      code: 'account-deletion-in-progress',
    });
    await act(async () => {
      reauth.reject(
        new AuthError(
          'invalid-credentials',
          AUTH_USER_MESSAGES.accountDeletionWrongPassword,
        ),
      );
      await first.catch(() => undefined);
    });
    await expect(first).rejects.toMatchObject({ code: 'invalid-credentials' });
    await harness.rendered.cleanup();
  });

  it.each([
    [{ kind: 'signed-out' }, { kind: 'unconfirmed' }],
    [
      { kind: 'preserved-guarded', principalId: 'principal-b' },
      { kind: 'preserved-guarded', principalId: 'principal-b' },
    ],
  ])(
    'does not dispatch when final storage arbitration returns %o',
    async (dispatchResult, disarmResult) => {
      mockMarkDispatched.mockResolvedValueOnce(dispatchResult);
      mockDisarm.mockResolvedValueOnce(disarmResult);
      const harness = await renderSignedIn();
      const method = deletionMethod(harness.authRef.current)!;

      await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
        kind: 'superseded',
      });
      expect(mockDeleteCurrentUser).not.toHaveBeenCalled();
      await harness.rendered.cleanup();
    },
  );

  it('exempts only the initiating preparing revision from self-reconciliation', async () => {
    const reauth = deferred<unknown>();
    mockReauthenticate.mockImplementationOnce(() => reauth.promise);
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;
    let pending!: Promise<DeleteAccountOutcome>;
    await act(async () => {
      pending = method('password-a');
      await Promise.resolve();
    });
    await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledTimes(1));
    mockReconcile.mockResolvedValueOnce({
      kind: 'blocked',
      principalId: 'principal-a',
      guardRevision: 1,
      guardState: 'preparing',
    });

    await act(async () => {
      mockGuardListeners[0]();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
      'signed-in|principal-a',
    );

    await act(async () => {
      reauth.reject(
        new AuthError(
          'invalid-credentials',
          AUTH_USER_MESSAGES.accountDeletionWrongPassword,
        ),
      );
      await pending.catch(() => undefined);
    });
    await expect(pending).rejects.toMatchObject({ code: 'invalid-credentials' });
    await harness.rendered.cleanup();
  });

  it('clears A when a newer same-principal guard revision replaces the attempt', async () => {
    const reauth = deferred<unknown>();
    mockReauthenticate.mockImplementationOnce(() => reauth.promise);
    const harness = await renderSignedIn();
    const method = deletionMethod(harness.authRef.current)!;
    let pending!: Promise<DeleteAccountOutcome>;
    await act(async () => {
      pending = method('password-a');
      await Promise.resolve();
    });
    await waitFor(() => expect(mockReauthenticate).toHaveBeenCalledTimes(1));
    mockReconcile.mockResolvedValueOnce({
      kind: 'blocked',
      principalId: 'principal-a',
      guardRevision: 2,
      guardState: 'pending',
    });

    await act(async () => {
      mockGuardListeners[0]();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );

    await act(async () => {
      reauth.reject(
        new AuthError(
          'invalid-credentials',
          AUTH_USER_MESSAGES.accountDeletionWrongPassword,
        ),
      );
      await pending.catch(() => undefined);
    });
    await expect(pending).rejects.toMatchObject({ code: 'invalid-credentials' });
    await harness.rendered.cleanup();
  });

  it('keeps the server request pinned to A and preserves B arriving during invocation', async () => {
    const invocation = deferred<{ kind: 'deleted' }>();
    mockDeleteCurrentUser.mockImplementationOnce(() => invocation.promise);
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    harness.queryClient.setQueryData(accountKeys.profile('principal-b'), { id: 'b' });
    const sessionB = session('principal-b', 'external');
    harness.mock.remember(sessionB);
    const method = deletionMethod(harness.authRef.current)!;
    let pending!: Promise<DeleteAccountOutcome>;
    await act(async () => {
      pending = method('password-a');
      await Promise.resolve();
    });
    await waitFor(() => expect(mockDeleteCurrentUser).toHaveBeenCalledTimes(1));
    mockReconcile.mockResolvedValue({
      kind: 'allowed-session',
      principalId: 'principal-b',
      session: sessionB,
      sessionId: null,
      guardRevision: null,
    });
    let outcome: DeleteAccountOutcome | undefined;
    await act(async () => {
      harness.mock.emit('SIGNED_IN', sessionB);
      invocation.resolve({ kind: 'deleted' });
      outcome = await pending;
    });
    expect(outcome).toEqual({ kind: 'superseded' });
    expect(mockDeleteCurrentUser).toHaveBeenCalledWith(
      'fresh-access-token-a',
      expect.any(Object),
    );
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-b',
      ),
    );
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toBeUndefined();
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-b'))).toEqual({
      id: 'b',
    });
    await harness.rendered.cleanup();
  });

  it('returns superseded when B wins while final A-cache cleanup is pending', async () => {
    const cleanupHold = deferred<void>();
    const originalRemovePrincipal = userScopedCache.removePrincipalScopedQueries;
    let holdFirstCleanup = true;
    const cleanupSpy = jest
      .spyOn(userScopedCache, 'removePrincipalScopedQueries')
      .mockImplementation(async (...args) => {
        if (holdFirstCleanup) {
          holdFirstCleanup = false;
          await cleanupHold.promise;
        }
        await originalRemovePrincipal(...args);
      });
    const harness = await renderSignedIn();
    const sessionB = session('principal-b', 'cleanup-race');
    harness.mock.remember(sessionB);
    const method = deletionMethod(harness.authRef.current)!;
    let pending!: Promise<DeleteAccountOutcome>;
    await act(async () => {
      pending = method('password-a');
      await Promise.resolve();
    });
    await waitFor(() => expect(cleanupSpy).toHaveBeenCalledTimes(1));

    await act(async () => {
      harness.mock.emit('SIGNED_IN', sessionB);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-b',
      ),
    );

    let outcome: DeleteAccountOutcome | undefined;
    await act(async () => {
      cleanupHold.resolve();
      outcome = await pending;
    });
    expect(outcome).toEqual({ kind: 'superseded' });
    cleanupSpy.mockRestore();
    await harness.rendered.cleanup();
  });

  it('promotes a stored B returned before its Auth event without removing it', async () => {
    const storedB = session('principal-b', 'stored');
    mockSettleSession.mockResolvedValueOnce({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    const harness = await renderSignedIn();
    harness.mock.remember(storedB);
    mockReconcile.mockResolvedValue({
      kind: 'allowed-session',
      principalId: 'principal-b',
      session: storedB,
      sessionId: null,
      guardRevision: null,
    });
    const method = deletionMethod(harness.authRef.current)!;
    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'superseded',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-b',
      ),
    );
    expect(mockReconcile).toHaveBeenCalledWith('sb-injected-auth-token');
    expect(mockReconcile.mock.calls.map(([storageKey]) => storageKey)).not.toContain(
      'sb-configured-public-auth-token',
    );
    expect(harness.mock.setSession).not.toHaveBeenCalled();
    expect(harness.mock.client.auth.getUser).toHaveBeenCalledWith(
      storedB.access_token,
    );
    await harness.rendered.cleanup();
  });

  it('restarts winner restoration from C when stored B changes before publication', async () => {
    const storedB = session('principal-b', 'stored');
    const storedC = session('principal-c', 'newer');
    mockSettleSession.mockResolvedValueOnce({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    const harness = await renderSignedIn();
    harness.mock.remember(storedB);
    harness.mock.remember(storedC);
    mockReconcile
      .mockResolvedValueOnce({
        kind: 'allowed-session',
        principalId: 'principal-c',
        session: storedC,
        sessionId: null,
        guardRevision: null,
      })
      .mockResolvedValue({
        kind: 'allowed-session',
        principalId: 'principal-c',
        session: storedC,
        sessionId: null,
        guardRevision: null,
      });
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'superseded',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-c',
      ),
    );
    expect(harness.mock.setSession).not.toHaveBeenCalled();
    await harness.rendered.cleanup();
  });

  it('preserves raw C already stored before deletion winner B restoration', async () => {
    const storedB = session('principal-b', 'stale-restore');
    const storedC = session('principal-c', 'already-stored');
    let rawAuthority = storedC;
    mockSettleSession.mockResolvedValueOnce({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    const states: string[] = [];
    const harness = await renderSignedIn(states);
    harness.mock.remember(storedB);
    harness.mock.remember(storedC);
    harness.mock.setSession.mockImplementation(
      async ({ access_token }: { access_token: string }) => {
        const next = access_token === storedB.access_token ? storedB : storedC;
        rawAuthority = next;
        harness.mock.emit('SIGNED_IN', next);
        return { data: { session: next, user: next.user }, error: null };
      },
    );
    mockReconcile.mockImplementation(async () => ({
      kind: 'allowed-session',
      principalId: rawAuthority.user.id,
      session: rawAuthority,
      sessionId: null,
      guardRevision: null,
    }));

    states.length = 0;
    const method = deletionMethod(harness.authRef.current)!;
    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'superseded',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-c',
      ),
    );
    expect(rawAuthority).toBe(storedC);
    expect(states).not.toContain('signed-in|principal-b|idle');
    await harness.rendered.cleanup();
  });

  it('restarts winner restoration when the guard revision changes with the same tokens', async () => {
    const storedB = session('principal-b', 'stored');
    mockSettleSession.mockResolvedValueOnce({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    const harness = await renderSignedIn();
    harness.mock.remember(storedB);
    mockReconcile
      .mockResolvedValueOnce({
        kind: 'allowed-session',
        principalId: 'principal-b',
        session: storedB,
        sessionId: 'session-b',
        guardRevision: 7,
      })
      .mockResolvedValueOnce({
        kind: 'allowed-session',
        principalId: 'principal-b',
        session: storedB,
        sessionId: 'session-b',
        guardRevision: 8,
      })
      .mockResolvedValue({
        kind: 'allowed-session',
        principalId: 'principal-b',
        session: storedB,
        sessionId: 'session-b',
        guardRevision: 8,
      });
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'superseded',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-b',
      ),
    );
    expect(harness.mock.setSession).not.toHaveBeenCalled();
    await harness.rendered.cleanup();
  });

  it('does not publish B when B becomes guarded before final restoration', async () => {
    const storedB = session('principal-b', 'stored');
    mockSettleSession.mockResolvedValueOnce({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    const harness = await renderSignedIn();
    harness.mock.remember(storedB);
    mockReconcile.mockResolvedValue({
      kind: 'blocked',
      principalId: 'principal-b',
      guardRevision: 9,
      guardState: 'pending',
    });
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'superseded',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    expect(
      harness.rendered.getByTestId('auth-probe').props.children,
    ).not.toContain('principal-b');
    await harness.rendered.cleanup();
  });

  it('preserves already-current B when isolated winner validation is unavailable', async () => {
    const storedB = session('principal-b', 'stored');
    mockSettleSession.mockResolvedValueOnce({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    const harness = await renderSignedIn();
    harness.mock.remember(storedB);
    mockReconcile.mockResolvedValue({
      kind: 'allowed-session',
      principalId: 'principal-b',
      session: storedB,
      sessionId: null,
      guardRevision: null,
    });
    (harness.mock.client.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: { status: 503, code: 'temporarily_unavailable' },
    });
    const method = deletionMethod(harness.authRef.current)!;

    await expect(invokeInAct(() => method('password-a'))).resolves.toEqual({
      kind: 'superseded',
    });
    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toContain(
        'signed-in|principal-b',
      ),
    );
    await harness.rendered.cleanup();
  });

  it('clears only blocked A after a payload-free guard signal and keeps catalog', async () => {
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    harness.queryClient.setQueryData(catalogKeys.product('product-a'), { id: 'product-a' });
    expect(mockGuardListeners).toHaveLength(1);
    mockReconcile.mockResolvedValueOnce({
      kind: 'blocked',
      principalId: 'principal-a',
      guardRevision: 2,
      guardState: 'pending',
    });

    await act(async () => {
      mockGuardListeners[0]();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toBeUndefined();
    expect(harness.queryClient.getQueryData(catalogKeys.product('product-a'))).toEqual({
      id: 'product-a',
    });
    await harness.rendered.cleanup();
  });

  it('clears displayed A when guarded primary storage is empty', async () => {
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    mockReconcile.mockResolvedValueOnce({
      kind: 'empty',
      guardedPrincipalIds: ['principal-a'],
    });

    await act(async () => {
      mockGuardListeners[0]();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toBeUndefined();
    await harness.rendered.cleanup();
  });

  it('clears displayed A when storage contains guarded B without publishing B', async () => {
    const harness = await renderSignedIn();
    harness.queryClient.setQueryData(accountKeys.profile('principal-a'), { id: 'a' });
    harness.queryClient.setQueryData(accountKeys.profile('principal-b'), { id: 'b' });
    mockReconcile.mockResolvedValueOnce({
      kind: 'blocked',
      principalId: 'principal-b',
      guardRevision: 4,
      guardState: 'settled',
    });

    await act(async () => {
      mockGuardListeners[0]();
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(harness.rendered.getByTestId('auth-probe').props.children).toBe(
        'signed-out|none|idle',
      ),
    );
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-a'))).toBeUndefined();
    expect(harness.queryClient.getQueryData(accountKeys.profile('principal-b'))).toEqual({
      id: 'b',
    });
    await harness.rendered.cleanup();
  });
});
