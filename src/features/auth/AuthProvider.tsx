import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import {
    mapAuthUserFromSessionUser,
    processAuthCallbackUrl,
    restoreSession,
    signInWithPassword,
    signOut as signOutApi,
    signUpWithPassword,
    validateSessionSnapshotIsolated,
} from '@/src/features/auth/api';
import {
    deleteCurrentUser,
    reauthenticateForAccountDeletion,
} from '@/src/features/auth/deletion.api';
import { AUTH_USER_MESSAGES, AuthError } from '@/src/features/auth/errors';
import { isAuthCallbackUrl } from '@/src/features/auth/recoveryUrl';
import type {
    AuthOperationSuperseded,
    AuthStatus,
    AuthUser,
    DeleteAccountOutcome,
    DeleteCurrentUserApiOutcome,
    RecoveryPhase,
    SignInCredentials,
    SignInResult,
    SignInSuccess,
    SignUpCredentials,
    SignUpResult,
} from '@/src/features/auth/types';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/src/lib/network/requestTimeout';
import {
    removePrincipalScopedQueries,
    removeUserScopedQueries,
} from '@/src/lib/query/userScopedCache';
import { runSupabaseAuthOperation } from '@/src/lib/supabase/authCoordination';
import {
    armPrincipalDeletionGuard,
    disarmPrincipalDeletionGuard,
    isSessionBlockedByDeletionGuard,
    markPrincipalDeletionDispatched,
    preflightPrincipalBoundAuthStorage,
    reconcileGuardedAuthStorage,
    removeStoredSessionIfExact,
    replaceDisplacedSessionIfExact,
    settleGuardedPrincipalSession,
    settlePrincipalDeletionGuard,
    subscribePrincipalDeletionGuardChanges,
    type GuardedAuthStorageReconciliation,
    type PrincipalDeletionGuardDisarmResult,
} from '@/src/lib/supabase/authStorage';
import {
    getSupabase,
    getSupabaseAuthStorageKey,
} from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** True when status is signed-in and a user is present. */
  isSignedIn: boolean;
  /**
   * Password-recovery phase (Task 18). Independent of ordinary session status.
   * The reset-password form is enabled only when `verified`.
   */
  recoveryPhase: RecoveryPhase;
  /**
   * Mark recovery as complete after a successful password update so the form
   * cannot be reused until a new recovery deep link arrives.
   */
  clearRecoveryPhase: () => void;
  signIn: (credentials: SignInCredentials) => Promise<SignInResult>;
  signUp: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<DeleteAccountOutcome>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthLinkingAdapter = {
  getInitialURL: () => Promise<string | null>;
  addEventListener: (
    type: 'url',
    listener: (event: { url: string }) => void,
  ) => { remove: () => void };
};

type DeletionWinner =
  | {
      kind: 'session';
      version: number;
      principalId: string;
      session: Session;
    }
  | { kind: 'signed-out'; version: number };

type RecoveryDisplacement =
  | {
      kind: 'exact';
      principalId: string;
      session: Session;
      guardRevision: number | null;
    }
  | { kind: 'unknown'; principalId: string | null };

type GuardReconciliationRequest =
  | { forceSettlement?: false }
  | {
      forceSettlement: true;
      displacement: RecoveryDisplacement;
    };

type GuardReconciliationOutcome =
  | { kind: 'published' }
  | { kind: 'signed-out' }
  | { kind: 'quarantined' }
  | { kind: 'unchanged' };

type ActiveDeletionAttempt = {
  generation: number;
  authGenerationAtStart: number;
  principalId: string;
  principalEmail: string;
  guardRevision: number | null;
  winnerVersion: number;
  winner: DeletionWinner | undefined;
};

type AllowedGuardedSession = Extract<
  GuardedAuthStorageReconciliation,
  { kind: 'allowed-session' }
>;

function sameAllowedGuardedSession(
  current: AllowedGuardedSession,
  expected: AllowedGuardedSession,
): boolean {
  return current.principalId === expected.principalId &&
    current.session.access_token === expected.session.access_token &&
    current.session.refresh_token === expected.session.refresh_token &&
    current.sessionId === expected.sessionId &&
    current.guardRevision === expected.guardRevision;
}

const defaultLinking: AuthLinkingAdapter = {
  getInitialURL: () => Linking.getInitialURL(),
  addEventListener: (type, listener) => Linking.addEventListener(type, listener),
};

export type AuthProviderProps = {
  children: ReactNode;
  /**
   * Injected client for tests. Production uses `getSupabase()`.
   * When `null`, skip Supabase (signed-out shell for UI tests without env).
   */
  client?: AppSupabaseClient | null;
  /**
   * When false, skip session restore and auth listener (tests that only need
   * a static signed-out context). Defaults to true.
   */
  enableSession?: boolean;
  /**
   * Injected deep-link surface for tests. Production uses expo-linking.
   * When `null`, skip recovery deep-link processing.
   */
  linking?: AuthLinkingAdapter | null;
};

function userIdFromSession(session: Session | null): string | null {
  return session?.user?.id ?? null;
}

function recoveryDisplacement(
  principalId: string | null,
  session: Session | null,
  guardRevision: number | null | undefined,
): RecoveryDisplacement {
  return principalId != null && session != null && guardRevision !== undefined
    ? { kind: 'exact', principalId, session, guardRevision }
    : { kind: 'unknown', principalId };
}

function authUserFromSession(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }
  return mapAuthUserFromSessionUser(session.user);
}

function isConfirmedPreRevocationDeletionError(error: unknown): boolean {
  return error instanceof AuthError &&
    (error.code === 'offline' ||
      (error.code === 'account-deletion-failed' &&
        error.source === 'server' &&
        error.status != null));
}

function resolveClient(
  clientProp: AppSupabaseClient | null | undefined,
): AppSupabaseClient | null {
  if (clientProp !== undefined) {
    return clientProp;
  }
  try {
    return getSupabase();
  } catch {
    return null;
  }
}

function resolveProviderStorageKey(
  clientProp: AppSupabaseClient | null | undefined,
): string {
  if (clientProp !== undefined) {
    return 'sb-injected-auth-token';
  }
  return getSupabaseAuthStorageKey();
}

/**
 * Bound only the recovery callback's wait for bootstrap. The restore itself
 * must continue so any stale-session cleanup settles before a retry exchanges
 * the single-use link.
 */
async function waitForSessionRestore(
  restore: Promise<void>,
): Promise<boolean> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      restore.then(() => true),
      new Promise<false>((resolve) => {
        timeoutId = setTimeout(
          () => resolve(false),
          DEFAULT_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Application auth state. Exposes identity presence only — never tokens.
 * Clears user-scoped Query cache on principal change; leaves public catalog.
 *
 * Principal tracking is split into three concepts:
 * - latestAuthPrincipal: newest principal announced by an authoritative auth
 *   transition (used for superseded-operation decisions)
 * - cachePrincipal: principal whose user-scoped cache is already prepared
 * - React user/status: published only after that principal's cache prep finishes
 *
 * Password recovery (Task 18) is a separate phase machine: only an observed
 * PASSWORD_RECOVERY event enables the recovery password form. Ordinary
 * SIGNED_IN / session restore never set recovery to verified.
 */
export function AuthProvider({
  children,
  client: clientProp,
  enableSession = true,
  linking = defaultLinking,
}: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    enableSession ? 'initializing' : 'signed-out',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recoveryPhase, setRecoveryPhase] = useState<RecoveryPhase>('idle');
  /**
   * Newest principal announced by the latest authoritative auth transition.
   * Used for explicit sign-in/up superseded decisions — not for cache ownership.
   */
  const latestAuthPrincipalRef = useRef<string | null>(null);
  /** Full session for restoring a newer principal after a stale SDK recovery. */
  const latestAuthSessionRef = useRef<Session | null>(null);
  /**
   * Principal for which user-scoped cache has been safely transitioned.
   * Advanced only after any prior-principal purge has fully completed.
   */
  const cachePrincipalRef = useRef<string | null>(null);
  /** Serializes principal-cache transitions so only one purge runs at a time. */
  const cacheTransitionTailRef = useRef<Promise<void>>(Promise.resolve());
  /**
   * Monotonic generation so a delayed restoreSession or a stale in-flight
   * applySession / optimistic sign-in/up/out cannot overwrite a newer auth
   * transition that arrived while async cleanup awaited.
   */
  const authGenerationRef = useRef(0);
  /** Ensures only the latest recovery-link processing commit wins. */
  const recoveryGenerationRef = useRef(0);
  /** Active and latest pending callbacks keep single-use exchanges serialized. */
  const activeRecoveryUrlRef = useRef<string | null>(null);
  const pendingRecoveryUrlRef = useRef<string | null>(null);
  /** Prevents recovery exchange from replacing a session during bootstrap cleanup. */
  const sessionRestoreRef = useRef<Promise<void>>(Promise.resolve());
  /** Explicit auth operations wait until stale-session reconciliation settles. */
  const recoveryReconciliationRef = useRef<Promise<void>>(Promise.resolve());
  /** Reconciliation snapshots explicit auth operations that already started. */
  const explicitAuthOperationSettlementsRef = useRef(
    new Set<Promise<void>>(),
  );
  /** Labels restoreSession's automatic cleanup of its pre-existing session. */
  const invalidBootstrapCleanupInFlightRef = useRef(false);
  /** Binds SDK recovery events to the auth state that started the URL attempt. */
  const recoveryAttemptRef = useRef<{
    generation: number;
    authGenerationAtStart: number;
    authPrincipalAtStart: string | null;
    ignoredAuthGenerationAdvances: number;
    authTransitions: {
      session: Session | null;
      isExplicitAuthOperation: boolean;
    }[];
    localSessionSnapshotPending: boolean;
    pendingInitialSession: Session | null | undefined;
    supersededByNewerCallback: boolean;
    passwordRecoveryObserved: boolean;
    passwordRecoveryPrincipalId: string | null;
    passwordRecoverySession: Session | null;
    adoptionSuperseded: boolean;
    guardedRecoveryAdoption: boolean;
    guardedRecoveryPrincipalId: string | null;
  } | null>(null);
  /** Serializes provider-owned writes to the shared Supabase Auth session. */
  const authSessionWriteTailRef = useRef<Promise<void>>(Promise.resolve());
  const deletionGenerationRef = useRef(0);
  const activeDeletionAttemptRef = useRef<ActiveDeletionAttempt | null>(null);
  const deletionInFlightRef = useRef(false);
  const guardedAuthReconciliationTailRef = useRef<Promise<void>>(
    Promise.resolve(),
  );
  const requestGuardReconciliationRef = useRef<
    (
      request?: GuardReconciliationRequest,
    ) => Promise<GuardReconciliationOutcome>
  >(async () => {
    return { kind: 'unchanged' };
  });

  const runAuthSessionWrite = useCallback(
    <T,>(write: () => Promise<T>): Promise<T> => {
      const result = authSessionWriteTailRef.current
        .catch(() => undefined)
        .then(write);
      authSessionWriteTailRef.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    [],
  );

  const enqueueGuardedAuthWork = useCallback(<T,>(work: () => Promise<T>) => {
    const result = guardedAuthReconciliationTailRef.current
      .catch(() => undefined)
      .then(work);
    guardedAuthReconciliationTailRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }, []);

  /**
   * Queue a cache transition for `nextUserId`. Transitions run in order;
   * a failed purge rejects to the current caller but does not poison later
   * transitions (tail continues via catch).
   */
  const prepareUserScopedCacheForPrincipal = useCallback(
    (nextUserId: string | null): Promise<void> => {
      const transition = cacheTransitionTailRef.current
        .catch(() => undefined)
        .then(async () => {
          const previous = cachePrincipalRef.current;
          if (previous === nextUserId) {
            // Same principal is normally a no-op. Settling signed-out while
            // the cache principal was never claimed (null → null) still purges
            // user-scoped keys so orphan zombie-restore data cannot remain.
            if (nextUserId == null) {
              await removeUserScopedQueries(queryClient);
            }
            return;
          }
          // Only purge when leaving a real principal (sign-out or A→B).
          // Do not block null → user bootstrap on a purge (Task 16 contract).
          if (previous != null) {
            if (nextUserId == null) {
              await removeUserScopedQueries(queryClient);
            } else {
              await removePrincipalScopedQueries(queryClient, previous);
            }
          }
          // Claim the cache for the new principal only after cleanup completes.
          cachePrincipalRef.current = nextUserId;
        });

      cacheTransitionTailRef.current = transition;
      return transition;
    },
    [queryClient],
  );

  const applySession = useCallback(
    async (session: Session | null, generation: number) => {
      const nextUser = authUserFromSession(session);
      const nextId = userIdFromSession(session);
      await prepareUserScopedCacheForPrincipal(nextId);
      // A newer auth transition may have started while cleanup awaited.
      if (authGenerationRef.current !== generation) {
        return;
      }
      setUser(nextUser);
      setStatus(nextUser ? 'signed-in' : 'signed-out');
    },
    [prepareUserScopedCacheForPrincipal],
  );

  const beginExplicitAuthOperation = useCallback(() => {
    let settleOperation: () => void = () => undefined;
    const settlement = new Promise<void>((resolve) => {
      settleOperation = resolve;
    });
    explicitAuthOperationSettlementsRef.current.add(settlement);
    let finished = false;

    return () => {
      if (finished) {
        return;
      }
      finished = true;
      explicitAuthOperationSettlementsRef.current.delete(settlement);
      settleOperation();
    };
  }, []);

  /** Promote only the SDK event proven to belong to a successful user action. */
  const markExplicitAuthTransition = useCallback(
    (principal: string | null) => {
      const attempt = recoveryAttemptRef.current;
      if (
        attempt == null ||
        recoveryGenerationRef.current !== attempt.generation
      ) {
        return;
      }
      for (
        let index = attempt.authTransitions.length - 1;
        index >= 0;
        index -= 1
      ) {
        const transition = attempt.authTransitions[index];
        if (userIdFromSession(transition.session) === principal) {
          transition.isExplicitAuthOperation = true;
          return;
        }
      }
    },
    [],
  );

  const reconcileSupersededRecovery = useCallback(
    (
      client: AppSupabaseClient,
      supersedingSession: Session | null,
      displacedPrincipalId: string | null,
      displacedSession: Session | null,
      displacedGuardRevision: number | null | undefined,
    ) => {
      const displacement = recoveryDisplacement(
        displacedPrincipalId,
        displacedSession,
        displacedGuardRevision,
      );
      recoveryGenerationRef.current += 1;
      recoveryAttemptRef.current = null;
      // Invalidate the stale SDK event's already-queued state application.
      authGenerationRef.current += 1;
      const reconciliationGeneration = authGenerationRef.current;
      const explicitOperations = Promise.all([
        ...explicitAuthOperationSettlementsRef.current,
      ]);
      latestAuthPrincipalRef.current = null;
      latestAuthSessionRef.current = null;
      setRecoveryPhase('idle');
      setUser(null);
      setStatus('initializing');
      let settleReconciliation: () => void = () => undefined;
      const reconciliation = new Promise<void>((resolve) => {
        settleReconciliation = resolve;
      });
      recoveryReconciliationRef.current = reconciliation;
      queueMicrotask(() => {
        void (async () => {
          try {
            await explicitOperations;
            if (authGenerationRef.current !== reconciliationGeneration) {
              return;
            }
            if (
              supersedingSession != null &&
              displacement.kind === 'exact'
            ) {
              const storageKey = resolveProviderStorageKey(clientProp);
              const validation = await validateSessionSnapshotIsolated(
                supersedingSession,
                {
                  client,
                  storageKey,
                  createIsolatedAuthClient:
                    clientProp !== undefined ? () => client : undefined,
                },
              );
              if (
                validation.kind === 'valid' &&
                authGenerationRef.current === reconciliationGeneration
              ) {
                await runAuthSessionWrite(() =>
                  runSupabaseAuthOperation(storageKey, () =>
                    replaceDisplacedSessionIfExact(
                      storageKey,
                      displacement.session,
                      supersedingSession,
                      displacement.guardRevision,
                    ),
                  ),
                );
              }
            }

            let outcome: GuardReconciliationOutcome = { kind: 'unchanged' };
            try {
              outcome = await requestGuardReconciliationRef.current({
                forceSettlement: true,
                displacement,
              });
            } catch {
              // Fall through to a token-free signed-out shell.
            }
            if (outcome.kind === 'unchanged') {
              authGenerationRef.current += 1;
              latestAuthPrincipalRef.current = null;
              latestAuthSessionRef.current = null;
              setRecoveryPhase('idle');
              setUser(null);
              setStatus('signed-out');
            }
          } finally {
            settleReconciliation();
          }
        })();
      });
    },
    [
      clientProp,
      runAuthSessionWrite,
    ],
  );

  const clearRecoveryPhase = useCallback(() => {
    setRecoveryPhase('idle');
  }, []);

  useEffect(() => {
    if (!enableSession) {
      return;
    }

    const client = resolveClient(clientProp);
    if (!client) {
      // Bad public env is owned by AppProviders bootstrap. Auth degrades to
      // signed-out so public Browse is not blocked here.
      queueMicrotask(() => {
        setStatus('signed-out');
        setUser(null);
      });
      return;
    }

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    const generationAtBootstrapStart = authGenerationRef.current;

    const bootstrap = async () => {
      const storageKey = resolveProviderStorageKey(clientProp);
      const restore = restoreSession({
        client,
        storageKey,
        createIsolatedAuthClient:
          clientProp !== undefined ? () => client : undefined,
        onInvalidLocalSessionCleanupChange: (isCleaning) => {
          invalidBootstrapCleanupInFlightRef.current = isCleaning;
        },
      });
      sessionRestoreRef.current = restore.then(
        () => undefined,
        () => undefined,
      );
      let restored: AuthUser | null;
      try {
        restored = await restore;
      } catch {
        return;
      }
      if (cancelled) {
        return;
      }

      // A newer auth event already applied — do not clobber with stale restore.
      if (authGenerationRef.current !== generationAtBootstrapStart) {
        return;
      }
      const nextId = restored?.id ?? null;
      latestAuthPrincipalRef.current = nextId;
      await prepareUserScopedCacheForPrincipal(nextId);
      if (cancelled || authGenerationRef.current !== generationAtBootstrapStart) {
        return;
      }
      setUser(restored);
      setStatus(restored ? 'signed-in' : 'signed-out');
    };

    void bootstrap();

    const processDeferredAuthEvent = async (
      rawEvent: AuthChangeEvent,
      rawSession: Session | null,
    ) => {
      let event = rawEvent;
      let session = rawSession;
      // Keep the callback minimal: schedule React state after the event.
      // Do not perform nested Supabase auth calls here.
      // TOKEN_REFRESHED uses the same serialized path as SIGNED_IN so a
      // same-principal refresh cannot publish B while an A→B purge is open.
      if (cancelled) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        const storageKey = resolveProviderStorageKey(clientProp);
        let stored = await runSupabaseAuthOperation(storageKey, () =>
          reconcileGuardedAuthStorage(storageKey),
        );
        while (stored.kind === 'allowed-session') {
          const validation = await validateSessionSnapshotIsolated(
            stored.session,
            {
              client,
              storageKey,
              createIsolatedAuthClient:
                clientProp !== undefined ? () => client : undefined,
            },
          );
          if (validation.kind === 'unavailable') return;
          if (validation.kind === 'invalid') {
            const invalidStoredSession = stored;
            const cleanup = await runSupabaseAuthOperation(storageKey, () =>
              removeStoredSessionIfExact(storageKey, {
                principalId: invalidStoredSession.principalId,
                accessToken: invalidStoredSession.session.access_token,
                refreshToken: invalidStoredSession.session.refresh_token,
              }),
            );
            if (cleanup === 'changed') {
              stored = await runSupabaseAuthOperation(storageKey, () =>
                reconcileGuardedAuthStorage(storageKey),
              );
              continue;
            }
            if (cleanup === 'removed' || cleanup === 'already-empty') {
              stored = { kind: 'empty', guardedPrincipalIds: [] };
              break;
            }
            return;
          }
          const rechecked = await runSupabaseAuthOperation(storageKey, () =>
            reconcileGuardedAuthStorage(storageKey),
          );
          if (
            rechecked.kind === 'allowed-session' &&
            sameAllowedGuardedSession(rechecked, stored)
          ) {
            event = 'SIGNED_IN';
            session = rechecked.session;
            stored = rechecked;
            break;
          }
          stored = rechecked;
        }
        if (stored.kind !== 'empty' && stored.kind !== 'allowed-session') {
          return;
        }
      }
      if (
        session != null &&
        (await runSupabaseAuthOperation(
          resolveProviderStorageKey(clientProp),
          () =>
            isSessionBlockedByDeletionGuard(
              resolveProviderStorageKey(clientProp),
              session,
            ),
        ))
      ) {
        return;
      }

      const deletionAttempt = activeDeletionAttemptRef.current;
      const deletionEventPrincipal = userIdFromSession(session);
      let isDeletionMaintenanceEvent = false;
      if (
        deletionAttempt != null &&
        session != null &&
        deletionEventPrincipal === deletionAttempt.principalId
      ) {
        isDeletionMaintenanceEvent = true;
      } else if (
        deletionAttempt != null &&
        session != null &&
        deletionEventPrincipal != null
      ) {
        deletionAttempt.winnerVersion += 1;
        deletionAttempt.winner = {
          kind: 'session',
          version: deletionAttempt.winnerVersion,
          principalId: deletionEventPrincipal,
          session,
        };
      } else if (deletionAttempt != null && event === 'SIGNED_OUT') {
        deletionAttempt.winnerVersion += 1;
        deletionAttempt.winner = {
          kind: 'signed-out',
          version: deletionAttempt.winnerVersion,
        };
      }

      const currentAttempt = recoveryAttemptRef.current;
      const eventPrincipal = userIdFromSession(session);
      if (
        currentAttempt != null &&
        recoveryGenerationRef.current === currentAttempt.generation &&
        currentAttempt.adoptionSuperseded &&
        event === 'PASSWORD_RECOVERY' &&
        currentAttempt.passwordRecoveryPrincipalId === eventPrincipal
      ) {
        return;
      }
      const isPendingInitialSession =
        currentAttempt != null &&
        recoveryGenerationRef.current === currentAttempt.generation &&
        currentAttempt.localSessionSnapshotPending &&
        event === 'INITIAL_SESSION';
      if (isPendingInitialSession) {
        currentAttempt.pendingInitialSession = session;
      }
      const isGuardedRecoverySessionMaintenance =
        currentAttempt != null &&
        recoveryGenerationRef.current === currentAttempt.generation &&
        currentAttempt.guardedRecoveryAdoption &&
        currentAttempt.guardedRecoveryPrincipalId === eventPrincipal &&
        session != null &&
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'PASSWORD_RECOVERY');
      const isNonSupersedingAttemptMaintenance =
        currentAttempt != null &&
        recoveryGenerationRef.current === currentAttempt.generation &&
        (isPendingInitialSession ||
          ((event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
            eventPrincipal === currentAttempt.authPrincipalAtStart) ||
          (event === 'USER_UPDATED' &&
            eventPrincipal === currentAttempt.authPrincipalAtStart) ||
          (event === 'SIGNED_OUT' &&
            invalidBootstrapCleanupInFlightRef.current &&
            explicitAuthOperationSettlementsRef.current.size === 0) ||
          isGuardedRecoverySessionMaintenance);
      if (
        isGuardedRecoverySessionMaintenance &&
        event !== 'PASSWORD_RECOVERY'
      ) {
        return;
      }
      if (
        currentAttempt != null &&
        recoveryGenerationRef.current === currentAttempt.generation &&
        !isNonSupersedingAttemptMaintenance
      ) {
        const transitions = currentAttempt.authTransitions;
        const lastIndex = transitions.length - 1;
        if (
          lastIndex >= 0 &&
          userIdFromSession(transitions[lastIndex].session) ===
            userIdFromSession(session)
        ) {
          const lastTransition = transitions[lastIndex];
          if (!lastTransition.isExplicitAuthOperation) {
            transitions[lastIndex] = {
              session,
              isExplicitAuthOperation: false,
            };
          }
        } else {
          transitions.push({
            session,
            isExplicitAuthOperation: false,
          });
          if (transitions.length > 2) {
            transitions.shift();
          }
        }
      }

      // Password recovery is distinct from ordinary sign-in/session restore.
      if (event === 'PASSWORD_RECOVERY') {
        const attempt = recoveryAttemptRef.current;
        const attemptWasSuperseded =
          attempt != null &&
          recoveryGenerationRef.current === attempt.generation &&
          authGenerationRef.current !==
            attempt.authGenerationAtStart +
              attempt.ignoredAuthGenerationAdvances &&
          latestAuthPrincipalRef.current !== eventPrincipal;
        if (attemptWasSuperseded) {
          const supersedingSession = latestAuthSessionRef.current;
          reconcileSupersededRecovery(
            client,
            supersedingSession,
            eventPrincipal,
            session,
            attempt?.guardedRecoveryAdoption ? undefined : null,
          );
          return;
        }
        if (
          attempt != null &&
          recoveryGenerationRef.current === attempt.generation
        ) {
          attempt.passwordRecoveryObserved = true;
          attempt.passwordRecoveryPrincipalId = eventPrincipal;
          attempt.passwordRecoverySession = session;
          // The exact guarded-adoption transaction owns publication. An SDK
          // recovery event may arrive before that transaction settles,
          // especially when S2 retains S1's allowed session_id.
          if (attempt.guardedRecoveryAdoption) {
            return;
          }
        } else if (!attempt?.supersededByNewerCallback) {
          setRecoveryPhase('verified');
        }
      } else if (
        event === 'SIGNED_OUT' &&
        !isNonSupersedingAttemptMaintenance
      ) {
        setRecoveryPhase('idle');
      }
      // Do not clear recovery on SIGNED_IN / USER_UPDATED / TOKEN_REFRESHED —
      // recovery session lives as a normal session with a prior PASSWORD_RECOVERY.

      if (isDeletionMaintenanceEvent) {
        return;
      }

      // Invalidate any in-flight bootstrap before scheduling application.
      authGenerationRef.current += 1;
      if (isNonSupersedingAttemptMaintenance) {
        currentAttempt.ignoredAuthGenerationAdvances += 1;
      }
      const appliedGeneration = authGenerationRef.current;
      latestAuthPrincipalRef.current = userIdFromSession(session);
      latestAuthSessionRef.current = session;

      // Defer state application so we avoid nested client work inside the callback.
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        if (authGenerationRef.current !== appliedGeneration) {
          return;
        }
        void applySession(session, appliedGeneration);
      });
    };

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      enqueueGuardedAuthWork(() => processDeferredAuthEvent(event, session));
    });

    subscription = authSubscription;

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [
    applySession,
    clientProp,
    enableSession,
    enqueueGuardedAuthWork,
    prepareUserScopedCacheForPrincipal,
    reconcileSupersededRecovery,
  ]);

  useEffect(() => {
    if (!enableSession) return;
    const client = resolveClient(clientProp);
    if (client == null) return;
    const storageKey = resolveProviderStorageKey(clientProp);
    let cancelled = false;

    const settleSignedOut = async (
      kind: 'signed-out' | 'quarantined',
      principalId: string | null,
    ): Promise<GuardReconciliationOutcome> => {
      authGenerationRef.current += 1;
      const generation = authGenerationRef.current;
      latestAuthPrincipalRef.current = null;
      latestAuthSessionRef.current = null;
      setRecoveryPhase('idle');
      if (principalId != null) {
        try {
          await removePrincipalScopedQueries(queryClient, principalId);
        } catch {
          // The signed-out shell remains safer than publishing stale authority.
        }
      }
      if (cancelled || authGenerationRef.current !== generation) {
        return { kind: 'unchanged' };
      }
      setUser(null);
      setStatus('signed-out');
      return { kind };
    };

    const removeExactCandidate = async (
      candidate: AllowedGuardedSession,
    ): Promise<GuardedAuthStorageReconciliation> =>
      await runSupabaseAuthOperation(storageKey, async () => {
        const current = await reconcileGuardedAuthStorage(storageKey);
        if (
          current.kind !== 'allowed-session' ||
          !sameAllowedGuardedSession(current, candidate)
        ) {
          return current;
        }
        const cleanup = await removeStoredSessionIfExact(storageKey, {
          principalId: candidate.principalId,
          accessToken: candidate.session.access_token,
          refreshToken: candidate.session.refresh_token,
        });
        if (cleanup === 'removed' || cleanup === 'already-empty') {
          return {
            kind: 'empty',
            guardedPrincipalIds: [candidate.principalId],
          };
        }
        if (cleanup === 'changed') {
          return await reconcileGuardedAuthStorage(storageKey);
        }
        return { kind: 'unavailable' };
      });

    const reconcileGuardState = async (
      request: GuardReconciliationRequest = {},
    ): Promise<GuardReconciliationOutcome> => {
      const forcedDisplacement = request.forceSettlement === true
        ? request.displacement
        : null;
      const isUnknownForcedRecovery =
        forcedDisplacement?.kind === 'unknown';
      const displacedPrincipalId = forcedDisplacement?.principalId ?? null;
      const exactDisplacedPrincipal = forcedDisplacement?.kind === 'exact'
        ? forcedDisplacement.principalId
        : null;
      let exactRemovedPrincipal: string | null = null;
      let snapshot = await runSupabaseAuthOperation(storageKey, () =>
        reconcileGuardedAuthStorage(storageKey),
      );
      while (!cancelled) {
        const recoveryAttempt = recoveryAttemptRef.current;
        if (
          snapshot.kind === 'allowed-session' &&
          recoveryAttempt != null &&
          recoveryGenerationRef.current === recoveryAttempt.generation &&
          recoveryAttempt.guardedRecoveryAdoption &&
          recoveryAttempt.guardedRecoveryPrincipalId === snapshot.principalId
        ) {
          return { kind: 'unchanged' };
        }
        if (snapshot.kind === 'blocked') {
          const attempt = activeDeletionAttemptRef.current;
          if (
            attempt?.principalId === snapshot.principalId &&
            attempt.guardRevision === snapshot.guardRevision &&
            (snapshot.guardState === 'preparing' ||
              snapshot.guardState === 'pending')
          ) {
            return { kind: 'unchanged' };
          }
          const displayedPrincipal = latestAuthPrincipalRef.current;
          if (request.forceSettlement || displayedPrincipal != null) {
            const nonmatchingDisplacedCachePrincipal =
              exactDisplacedPrincipal != null &&
                snapshot.principalId !== exactDisplacedPrincipal
                ? exactDisplacedPrincipal
                : null;
            return await settleSignedOut(
              isUnknownForcedRecovery ? 'quarantined' : 'signed-out',
              request.forceSettlement
                ? exactRemovedPrincipal ??
                  nonmatchingDisplacedCachePrincipal
                : displayedPrincipal,
            );
          }
          return { kind: 'unchanged' };
        }
        if (snapshot.kind === 'empty') {
          const principalId = latestAuthPrincipalRef.current;
          if (
            !request.forceSettlement &&
            (principalId == null ||
              !snapshot.guardedPrincipalIds.includes(principalId))
          ) {
            return { kind: 'unchanged' };
          }
          return await settleSignedOut(
            'signed-out',
            request.forceSettlement ? exactRemovedPrincipal : principalId,
          );
        }
        if (snapshot.kind === 'unavailable') {
          return request.forceSettlement
            ? await settleSignedOut(
                'quarantined',
                exactRemovedPrincipal,
              )
            : { kind: 'unchanged' };
        }

        if (
          forcedDisplacement?.kind === 'exact' &&
          snapshot.principalId === forcedDisplacement.principalId &&
          snapshot.session.access_token ===
            forcedDisplacement.session.access_token &&
          snapshot.session.refresh_token ===
            forcedDisplacement.session.refresh_token &&
          snapshot.guardRevision === forcedDisplacement.guardRevision
        ) {
          const afterExactRemoval = await removeExactCandidate(snapshot);
          if (afterExactRemoval.kind === 'empty') {
            exactRemovedPrincipal = forcedDisplacement.principalId;
          }
          snapshot = afterExactRemoval;
          continue;
        }

        const validation = await validateSessionSnapshotIsolated(
          snapshot.session,
          {
            client,
            storageKey,
            createIsolatedAuthClient:
            clientProp !== undefined ? () => client : undefined,
          },
        );
        if (validation.kind === 'unavailable') {
          const current = await runSupabaseAuthOperation(storageKey, () =>
            reconcileGuardedAuthStorage(storageKey),
          );
          if (
            current.kind === 'allowed-session' &&
            sameAllowedGuardedSession(current, snapshot)
          ) {
            const nonmatchingDisplacedCachePrincipal =
              exactDisplacedPrincipal != null &&
                snapshot.principalId !== exactDisplacedPrincipal
                ? exactDisplacedPrincipal
                : null;
            return request.forceSettlement
              ? await settleSignedOut(
                  'quarantined',
                  exactRemovedPrincipal ??
                    nonmatchingDisplacedCachePrincipal,
                )
              : { kind: 'unchanged' };
          }
          snapshot = current;
          continue;
        }
        if (validation.kind === 'invalid') {
          if (request.forceSettlement) {
            if (
              exactDisplacedPrincipal == null ||
              snapshot.principalId === exactDisplacedPrincipal
            ) {
              return await settleSignedOut('quarantined', null);
            }
            const afterInvalidRemoval = await removeExactCandidate(snapshot);
            if (afterInvalidRemoval.kind === 'empty') {
              exactRemovedPrincipal = exactDisplacedPrincipal;
            }
            snapshot = afterInvalidRemoval;
            continue;
          }
          snapshot = await removeExactCandidate(snapshot);
          continue;
        }
        const rechecked = await runSupabaseAuthOperation(storageKey, () =>
          reconcileGuardedAuthStorage(storageKey),
        );
        if (
          rechecked.kind !== 'allowed-session' ||
          !sameAllowedGuardedSession(rechecked, snapshot)
        ) {
          snapshot = rechecked;
          continue;
        }

        const displayedPrincipal = latestAuthPrincipalRef.current;
        if (
          displayedPrincipal != null &&
          displayedPrincipal !== rechecked.principalId &&
          displayedPrincipal !== displacedPrincipalId
        ) {
          await removePrincipalScopedQueries(queryClient, displayedPrincipal);
        }
        if (
          !isUnknownForcedRecovery &&
          displacedPrincipalId != null &&
          displacedPrincipalId !== rechecked.principalId
        ) {
          await removePrincipalScopedQueries(
            queryClient,
            displacedPrincipalId,
          );
        }
        await cacheTransitionTailRef.current.catch(() => undefined);

        const publication = await runSupabaseAuthOperation(
          storageKey,
          async (): Promise<
            | GuardReconciliationOutcome
            | { kind: 'changed'; snapshot: GuardedAuthStorageReconciliation }
          > => {
            const current = await reconcileGuardedAuthStorage(storageKey);
            if (
              current.kind !== 'allowed-session' ||
              !sameAllowedGuardedSession(current, rechecked)
            ) {
              return { kind: 'changed', snapshot: current };
            }
            authGenerationRef.current += 1;
            latestAuthPrincipalRef.current = current.principalId;
            latestAuthSessionRef.current = current.session;
            cachePrincipalRef.current = current.principalId;
            setRecoveryPhase('idle');
            setUser(authUserFromSession(current.session));
            setStatus('signed-in');
            return { kind: 'published' };
          },
        );
        if (publication.kind !== 'changed') {
          return publication;
        }
        snapshot = publication.snapshot;
      }
      return { kind: 'unchanged' };
    };

    const schedule = (request: GuardReconciliationRequest = {}) => {
      return enqueueGuardedAuthWork(() => reconcileGuardState(request));
    };
    requestGuardReconciliationRef.current = schedule;
    const unsubscribe = subscribePrincipalDeletionGuardChanges(
      storageKey,
      () => {
        void schedule();
      },
    );
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState) => {
        if (nextState === 'active') void schedule();
      },
    );
    void schedule();

    return () => {
      cancelled = true;
      if (requestGuardReconciliationRef.current === schedule) {
        requestGuardReconciliationRef.current = async () => {
          return { kind: 'unchanged' };
        };
      }
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [
    clientProp,
    enableSession,
    enqueueGuardedAuthWork,
    queryClient,
  ]);

  /**
   * Cold/warm recovery deep links. Process tokens/codes without logging the URL.
   * Auth route guards must not redirect away — this path only updates recovery
   * phase and session through the normal auth listener.
   */
  useEffect(() => {
    if (!enableSession || linking == null) {
      return;
    }

    const client = resolveClient(clientProp);
    if (!client) {
      return;
    }

    let cancelled = false;
    const handleUrl = async (url: string | null) => {
      if (!url || cancelled || !isAuthCallbackUrl(url)) {
        return;
      }
      const activeRecoveryUrl = activeRecoveryUrlRef.current;
      if (activeRecoveryUrl != null) {
        if (url !== activeRecoveryUrl) {
          pendingRecoveryUrlRef.current = url;
          const activeAttempt = recoveryAttemptRef.current;
          if (
            activeAttempt != null &&
            recoveryGenerationRef.current === activeAttempt.generation
          ) {
            activeAttempt.supersededByNewerCallback = true;
          }
          setRecoveryPhase('processing');
        }
        return;
      }
      activeRecoveryUrlRef.current = url;

      const finishRecoveryExchange = async () => {
        await recoveryReconciliationRef.current;
        activeRecoveryUrlRef.current = null;
        const pendingUrl = pendingRecoveryUrlRef.current;
        pendingRecoveryUrlRef.current = null;
        if (pendingUrl != null) {
          void handleUrl(pendingUrl);
        }
      };

      recoveryGenerationRef.current += 1;
      const generation = recoveryGenerationRef.current;
      const authGenerationAtStart = authGenerationRef.current;
      const authPrincipalAtCallbackStart = latestAuthPrincipalRef.current;
      recoveryAttemptRef.current = {
        generation,
        authGenerationAtStart,
        authPrincipalAtStart: authPrincipalAtCallbackStart,
        ignoredAuthGenerationAdvances: 0,
        authTransitions: [],
        localSessionSnapshotPending: authPrincipalAtCallbackStart == null,
        pendingInitialSession: undefined,
        supersededByNewerCallback: false,
        passwordRecoveryObserved: false,
        passwordRecoveryPrincipalId: null,
        passwordRecoverySession: null,
        adoptionSuperseded: false,
        guardedRecoveryAdoption: false,
        guardedRecoveryPrincipalId: null,
      };
      setRecoveryPhase('processing');

      // A recovery exchange can replace the stored session. Keep it behind
      // bootstrap validation and any conditional stale-session cleanup so a
      // later local sign-out cannot consume the newly exchanged session.
      const restoreSettled = await waitForSessionRestore(
        sessionRestoreRef.current,
      );
      if (!restoreSettled) {
        if (
          !cancelled &&
          recoveryGenerationRef.current === generation &&
          !recoveryAttemptRef.current?.supersededByNewerCallback
        ) {
          setRecoveryPhase('temporary-failure');
        }
        await finishRecoveryExchange();
        return;
      }
      if (cancelled || recoveryGenerationRef.current !== generation) {
        await finishRecoveryExchange();
        return;
      }

      // A cold initial URL can resolve before Auth publishes its persisted
      // INITIAL_SESSION. Snapshot local storage so that delayed notification is
      // classified as pre-link maintenance rather than a newer sign-in.
      let localPrincipalAtStart = authPrincipalAtCallbackStart;
      if (localPrincipalAtStart == null) {
        try {
          const { data } = await client.auth.getSession();
          localPrincipalAtStart = userIdFromSession(data.session);
        } catch {
          // The authoritative listener snapshot remains the safe fallback.
        }
      }
      if (cancelled) {
        await finishRecoveryExchange();
        return;
      }
      const attempt = recoveryAttemptRef.current;
      if (attempt?.generation !== generation) {
        await finishRecoveryExchange();
        return;
      }
      attempt.localSessionSnapshotPending = false;
      attempt.authPrincipalAtStart ??= localPrincipalAtStart;
      if (attempt.pendingInitialSession !== undefined) {
        if (
          userIdFromSession(attempt.pendingInitialSession) !==
          localPrincipalAtStart
        ) {
          attempt.ignoredAuthGenerationAdvances -= 1;
          attempt.authTransitions.unshift({
            session: attempt.pendingInitialSession,
            isExplicitAuthOperation: false,
          });
          if (attempt.authTransitions.length > 2) {
            attempt.authTransitions.shift();
          }
        }
        attempt.pendingInitialSession = undefined;
      }
      if (attempt.supersededByNewerCallback) {
        await finishRecoveryExchange();
        return;
      }

      const releaseGuardedRecoveryQuarantine = async (
        reconcileCurrentAuthority: boolean,
      ): Promise<boolean> => {
        const currentAttempt = recoveryAttemptRef.current;
        if (
          currentAttempt?.generation !== generation ||
          !currentAttempt.guardedRecoveryAdoption
        ) {
          return false;
        }
        currentAttempt.guardedRecoveryAdoption = false;
        currentAttempt.guardedRecoveryPrincipalId = null;
        if (reconcileCurrentAuthority) {
          await requestGuardReconciliationRef.current();
        }
        return true;
      };

      try {
        const result = await processAuthCallbackUrl(url, {
          client,
          storageKey: resolveProviderStorageKey(clientProp),
          createIsolatedAuthClient:
            clientProp !== undefined ? () => client : undefined,
          runAuthSessionWrite,
          onRecoveryAdoptionPredecessor: (predecessor) => {
            const currentAttempt = recoveryAttemptRef.current;
            if (currentAttempt?.generation !== generation) return;
            const guardedPredecessor =
              predecessor.kind === 'settled-allowed' ||
                predecessor.kind === 'expired-pending'
                ? predecessor
                : null;
            currentAttempt.guardedRecoveryAdoption =
              guardedPredecessor != null;
            currentAttempt.guardedRecoveryPrincipalId =
              guardedPredecessor?.guard.principalId ?? null;
          },
          onRecoverySession: (session) => {
            const currentAttempt = recoveryAttemptRef.current;
            if (currentAttempt?.generation !== generation) return;
            currentAttempt.passwordRecoveryPrincipalId =
              userIdFromSession(session);
            currentAttempt.passwordRecoverySession = session;
          },
        });
        const wasGuardedRecovery = await releaseGuardedRecoveryQuarantine(
          result.kind !== 'superseded',
        );
        await guardedAuthReconciliationTailRef.current;
        if (cancelled || recoveryGenerationRef.current !== generation) {
          return;
        }
        if (recoveryAttemptRef.current?.supersededByNewerCallback) {
          return;
        }
        if (result.kind === 'ignored') {
          // Path opened without usable tokens (direct navigation / stripped URL).
          setRecoveryPhase((current) =>
            current === 'verified' ? 'verified' : 'idle',
          );
          return;
        }
        if (result.kind === 'superseded') {
          const attempt = recoveryAttemptRef.current;
          const displacedPrincipalId =
            attempt?.passwordRecoveryPrincipalId ?? null;
          const displacedSession = attempt?.passwordRecoverySession ?? null;
          if (attempt?.generation === generation) {
            attempt.adoptionSuperseded = true;
          }
          // Invalidate an A state application already queued by the SDK event
          // before reconciling the exact authority that superseded adoption.
          authGenerationRef.current += 1;
          latestAuthPrincipalRef.current = null;
          latestAuthSessionRef.current = null;
          setRecoveryPhase('idle');
          setUser(null);
          setStatus('initializing');
          let outcome: GuardReconciliationOutcome = { kind: 'unchanged' };
          try {
            outcome = await requestGuardReconciliationRef.current({
              forceSettlement: true,
              displacement: recoveryDisplacement(
                displacedPrincipalId,
                displacedSession,
                wasGuardedRecovery ? undefined : null,
              ),
            });
          } catch {
            // Fall through to a token-free signed-out shell.
          }
          if (outcome.kind === 'unchanged') {
            authGenerationRef.current += 1;
            latestAuthPrincipalRef.current = null;
            latestAuthSessionRef.current = null;
            setUser(null);
            setStatus('signed-out');
          }
          return;
        }
        const attempt = recoveryAttemptRef.current;
        let foundSupersedingSession = false;
        let supersedingSession: Session | null = null;
        const displacedSession = attempt?.passwordRecoverySession ?? null;
        if (attempt?.generation === generation) {
          for (const transition of attempt.authTransitions) {
            if (
              transition.isExplicitAuthOperation ||
              userIdFromSession(transition.session) !== result.user.id
            ) {
              foundSupersedingSession = true;
              supersedingSession = transition.session;
            }
          }
        }
        if (foundSupersedingSession) {
          reconcileSupersededRecovery(
            client,
            supersedingSession,
            result.user.id,
            displacedSession,
            wasGuardedRecovery ? undefined : null,
          );
          return;
        }
        const authChangedDuringExchange =
          authGenerationRef.current !== authGenerationAtStart;
        const currentPrincipal = latestAuthPrincipalRef.current;
        if (
          (authChangedDuringExchange || currentPrincipal != null) &&
          currentPrincipal !== result.user.id
        ) {
          setRecoveryPhase((current) =>
            current === 'verified' ? 'verified' : 'idle',
          );
          return;
        }
        if (
          result.kind === 'password-recovery' ||
          attempt?.passwordRecoveryObserved
        ) {
          // Token-based recovery with type=recovery; also wait for SDK event.
          setRecoveryPhase('verified');
          return;
        }
        if (result.kind === 'session') {
          // Signup confirmation / ordinary auth callback — not recovery.
          setRecoveryPhase((current) =>
            current === 'verified' ? 'verified' : 'idle',
          );
          return;
        }
        // Non-recovery callback without a settled ordinary session. Only
        // PASSWORD_RECOVERY may promote this phase; ordinary SIGNED_IN must
        // never authorize password update.
        setRecoveryPhase((current) =>
          current === 'verified' ? 'verified' : 'unavailable',
        );
      } catch (error) {
        if (cancelled || recoveryGenerationRef.current !== generation) {
          return;
        }
        if (recoveryAttemptRef.current?.supersededByNewerCallback) {
          return;
        }
        try {
          await releaseGuardedRecoveryQuarantine(true);
        } catch {
          // Keep fixed retryable recovery state when reconciliation is unavailable.
        }
        setRecoveryPhase(
          error instanceof AuthError && error.code === 'recovery-link-invalid'
            ? 'unavailable'
            : 'temporary-failure',
        );
      } finally {
        await finishRecoveryExchange();
      }
    };
    void linking.getInitialURL().then((url) => {
      void handleUrl(url);
    });

    const subscription = linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [
    clientProp,
    enableSession,
    linking,
    reconcileSupersededRecovery,
    runAuthSessionWrite,
  ]);

  /**
   * After optimistic principal cleanup: a generation mismatch means a newer
   * transition arrived. Same principal (SDK SIGNED_IN confirmation / same-user
   * refresh) may still report signed-in success. Different principal or
   * signed-out is superseded for the caller — state must not look successful.
   *
   * Authority is `latestAuthPrincipalRef` (not cache-prepared principal): a
   * newer C may already be announced while cache is still preparing B.
   */
  const resolveOptimisticSignedIn = useCallback(
    (
      result: SignInSuccess,
      generation: number,
    ): SignInSuccess | AuthOperationSuperseded => {
      if (authGenerationRef.current === generation) {
        return result;
      }
      if (latestAuthPrincipalRef.current === result.user.id) {
        return result;
      }
      return { kind: 'superseded' };
    },
    [],
  );

  const publishSignedOutAfterDeletion = useCallback(
    async (principalId: string, attempt?: ActiveDeletionAttempt) => {
      authGenerationRef.current += 1;
      const generation = authGenerationRef.current;
      latestAuthPrincipalRef.current = null;
      latestAuthSessionRef.current = null;
      setRecoveryPhase('idle');
      try {
        await removePrincipalScopedQueries(queryClient, principalId);
      } catch {
        // The exact-principal remover attempts physical removal in `finally`.
        // Guarded auth state remains authoritative even if cancellation fails.
      }
      if (authGenerationRef.current !== generation) {
        return attempt?.winner != null ||
            latestAuthPrincipalRef.current != null
          ? 'superseded' as const
          : 'signed-out' as const;
      }
      setUser(null);
      setStatus('signed-out');
      return 'signed-out' as const;
    },
    [queryClient],
  );

  const quarantineAfterWinnerRestorationFailure = useCallback(
    async (attempt: ActiveDeletionAttempt) => {
      if (latestAuthPrincipalRef.current === attempt.principalId) {
        await publishSignedOutAfterDeletion(attempt.principalId, attempt);
        return;
      }
      await removePrincipalScopedQueries(queryClient, attempt.principalId);
    },
    [publishSignedOutAfterDeletion, queryClient],
  );

  const restoreDeletionWinner = useCallback(
    async (
      client: AppSupabaseClient,
      attempt: ActiveDeletionAttempt,
    ): Promise<'session' | 'signed-out' | 'restore-failed'> => {
      while (true) {
        const winner = attempt.winner;
        if (winner == null || winner.kind === 'signed-out') {
          authGenerationRef.current += 1;
          latestAuthPrincipalRef.current = null;
          latestAuthSessionRef.current = null;
          setRecoveryPhase('idle');
          setUser(null);
          setStatus('signed-out');
          return winner == null ? 'restore-failed' : 'signed-out';
        }

        const capturedVersion = winner.version;
        const capturedSession = winner.session;
        const storageKey = resolveProviderStorageKey(clientProp);
        const candidate = await runSupabaseAuthOperation(storageKey, () =>
          reconcileGuardedAuthStorage(storageKey),
        );
        const winnerBeforeValidation = attempt.winner;
        if (
          winnerBeforeValidation?.kind !== 'session' ||
          winnerBeforeValidation.version !== capturedVersion
        ) {
          continue;
        }
        if (
          candidate.kind !== 'allowed-session' ||
          candidate.principalId !== winner.principalId ||
          candidate.session.access_token !== capturedSession.access_token ||
          candidate.session.refresh_token !== capturedSession.refresh_token
        ) {
          if (candidate.kind === 'allowed-session') {
            attempt.winnerVersion += 1;
            attempt.winner = {
              kind: 'session',
              version: attempt.winnerVersion,
              principalId: candidate.principalId,
              session: candidate.session,
            };
            continue;
          }
          if (candidate.kind === 'empty' || candidate.kind === 'blocked') {
            attempt.winnerVersion += 1;
            attempt.winner = {
              kind: 'signed-out',
              version: attempt.winnerVersion,
            };
            continue;
          }
          await quarantineAfterWinnerRestorationFailure(attempt);
          return 'restore-failed';
        }

        const validation = await validateSessionSnapshotIsolated(
          candidate.session,
          {
            client,
            storageKey,
            createIsolatedAuthClient:
              clientProp !== undefined ? () => client : undefined,
          },
        );
        if (validation.kind === 'unavailable') {
          await quarantineAfterWinnerRestorationFailure(attempt);
          return 'restore-failed';
        }
        if (validation.kind === 'invalid') {
          const afterInvalid = await runSupabaseAuthOperation(
            storageKey,
            async (): Promise<GuardedAuthStorageReconciliation> => {
              const current = await reconcileGuardedAuthStorage(storageKey);
              if (
                current.kind !== 'allowed-session' ||
                !sameAllowedGuardedSession(current, candidate)
              ) {
                return current;
              }
              const cleanup = await removeStoredSessionIfExact(storageKey, {
                principalId: candidate.principalId,
                accessToken: candidate.session.access_token,
                refreshToken: candidate.session.refresh_token,
              });
              if (cleanup === 'removed' || cleanup === 'already-empty') {
                return {
                  kind: 'empty',
                  guardedPrincipalIds: [candidate.principalId],
                };
              }
              if (cleanup === 'changed') {
                return await reconcileGuardedAuthStorage(storageKey);
              }
              return { kind: 'unavailable' };
            },
          );
          if (afterInvalid.kind === 'allowed-session') {
            attempt.winnerVersion += 1;
            attempt.winner = {
              kind: 'session',
              version: attempt.winnerVersion,
              principalId: afterInvalid.principalId,
              session: afterInvalid.session,
            };
            continue;
          }
          if (afterInvalid.kind === 'empty' || afterInvalid.kind === 'blocked') {
            attempt.winnerVersion += 1;
            attempt.winner = {
              kind: 'signed-out',
              version: attempt.winnerVersion,
            };
            continue;
          }
          await quarantineAfterWinnerRestorationFailure(attempt);
          return 'restore-failed';
        }

        const publication = await runSupabaseAuthOperation(
          storageKey,
          async (): Promise<'published' | 'changed' | 'unavailable'> => {
            const newestWinner = attempt.winner;
            if (
              newestWinner?.kind !== 'session' ||
              newestWinner.version !== capturedVersion
            ) {
              return 'changed';
            }
            const stored = await reconcileGuardedAuthStorage(storageKey);
            if (
              stored.kind === 'allowed-session' &&
              sameAllowedGuardedSession(stored, candidate)
            ) {
              authGenerationRef.current += 1;
              latestAuthPrincipalRef.current = winner.principalId;
              latestAuthSessionRef.current = capturedSession;
              setRecoveryPhase('idle');
              setUser(authUserFromSession(capturedSession));
              setStatus('signed-in');
              return 'published';
            }
            if (stored.kind === 'allowed-session') {
              attempt.winnerVersion += 1;
              attempt.winner = {
                kind: 'session',
                version: attempt.winnerVersion,
                principalId: stored.principalId,
                session: stored.session,
              };
              return 'changed';
            }
            if (stored.kind === 'empty' || stored.kind === 'blocked') {
              attempt.winnerVersion += 1;
              attempt.winner = {
                kind: 'signed-out',
                version: attempt.winnerVersion,
              };
              return 'changed';
            }
            return 'unavailable';
          },
        );
        if (publication === 'published') return 'session';
        if (publication === 'unavailable') {
          await quarantineAfterWinnerRestorationFailure(attempt);
          return 'restore-failed';
        }
      }
    },
    [
      clientProp,
      quarantineAfterWinnerRestorationFailure,
    ],
  );

  const settleDeletedPrincipalLocally = useCallback(
    async (
      attempt: ActiveDeletionAttempt,
      storageKey: string,
    ): Promise<'signed-out' | 'superseded' | 'cleanup-unconfirmed'> => {
      if (attempt.winner != null) {
        return 'superseded';
      }

      const cleanup = await settleGuardedPrincipalSession(
        storageKey,
        attempt.principalId,
        attempt.guardRevision!,
      );
      if (cleanup.kind === 'preserved-winner') {
        attempt.winnerVersion += 1;
        attempt.winner = {
          kind: 'session',
          version: attempt.winnerVersion,
          principalId: cleanup.principalId,
          session: cleanup.session,
        };
        return 'superseded';
      }
      if (cleanup.kind === 'preserved-guarded') {
        return 'superseded';
      }
      if (cleanup.kind === 'stale-attempt') {
        return 'superseded';
      }
      if (cleanup.kind === 'quarantined-unavailable') {
        return 'cleanup-unconfirmed';
      }
      return cleanup.companionCleanup === 'unconfirmed'
        ? 'cleanup-unconfirmed'
        : 'signed-out';
    },
    [],
  );

  const resolveDeletionDisarm = useCallback(
    async (
      client: AppSupabaseClient,
      attempt: ActiveDeletionAttempt,
      disarm: PrincipalDeletionGuardDisarmResult,
    ): Promise<{
      kind: 'disarmed' | 'winner-restored' | 'quarantined';
      requiresReconciliation: boolean;
    }> => {
      if (disarm.kind === 'preserved-winner') {
        attempt.winnerVersion += 1;
        attempt.winner = {
          kind: 'session',
          version: attempt.winnerVersion,
          principalId: disarm.principalId,
          session: disarm.session,
        };
      } else if (
        disarm.kind === 'unconfirmed' ||
        disarm.kind === 'stale-attempt' ||
        disarm.kind === 'preserved-guarded'
      ) {
        await publishSignedOutAfterDeletion(attempt.principalId, attempt);
        return { kind: 'quarantined', requiresReconciliation: true };
      }

      await guardedAuthReconciliationTailRef.current;
      if (attempt.winner == null) {
        return { kind: 'disarmed', requiresReconciliation: false };
      }
      try {
        await removePrincipalScopedQueries(queryClient, attempt.principalId);
        const restored = await restoreDeletionWinner(client, attempt);
        return {
          kind: 'winner-restored',
          requiresReconciliation: restored === 'restore-failed',
        };
      } catch {
        await publishSignedOutAfterDeletion(attempt.principalId, attempt);
        return { kind: 'quarantined', requiresReconciliation: true };
      }
    },
    [publishSignedOutAfterDeletion, queryClient, restoreDeletionWinner],
  );

  const deleteAccount = useCallback(
    async (password: string): Promise<DeleteAccountOutcome> => {
      if (deletionInFlightRef.current) {
        throw new AuthError(
          'account-deletion-in-progress',
          AUTH_USER_MESSAGES.accountDeletionInProgress,
        );
      }
      deletionInFlightRef.current = true;
      deletionGenerationRef.current += 1;
      const deletionGeneration = deletionGenerationRef.current;
      const finishExplicitAuthOperation = beginExplicitAuthOperation();
      const storageKey = resolveProviderStorageKey(clientProp);
      let attempt: ActiveDeletionAttempt | null = null;
      let requiresPostFinalizationReconciliation = false;
      let destructiveOutcome: DeleteCurrentUserApiOutcome | null = null;
      let destructiveRequestStarted = false;
      let guardDisarmAttempted = false;
      try {
        await recoveryReconciliationRef.current;
        await sessionRestoreRef.current;
        const client = resolveClient(clientProp);
        const principal = user;
        if (
          client == null ||
          status !== 'signed-in' ||
          principal == null ||
          principal.id !== latestAuthPrincipalRef.current ||
          principal.email == null ||
          principal.email.length === 0
        ) {
          throw new AuthError(
            'account-deletion-failed',
            AUTH_USER_MESSAGES.accountDeletionFailed,
          );
        }

        let preflight: 'ready' | 'guard-busy';
        try {
          preflight = await preflightPrincipalBoundAuthStorage(
            storageKey,
            principal.id,
          );
        } catch {
          throw new AuthError(
            'account-deletion-failed',
            AUTH_USER_MESSAGES.accountDeletionFailed,
          );
        }
        if (preflight === 'guard-busy') {
          throw new AuthError(
            'account-deletion-in-progress',
            AUTH_USER_MESSAGES.accountDeletionInProgress,
          );
        }

        attempt = {
          generation: deletionGeneration,
          authGenerationAtStart: authGenerationRef.current,
          principalId: principal.id,
          principalEmail: principal.email,
          guardRevision: null,
          winnerVersion: 0,
          winner: undefined,
        };
        activeDeletionAttemptRef.current = attempt;

        const arm = await runSupabaseAuthOperation(storageKey, () =>
          armPrincipalDeletionGuard(storageKey, principal.id),
        );
        if (arm.kind === 'guard-busy') {
          throw new AuthError(
            'account-deletion-in-progress',
            AUTH_USER_MESSAGES.accountDeletionInProgress,
          );
        }
        if (arm.kind === 'preserved-winner') {
          attempt.winnerVersion += 1;
          attempt.winner = {
            kind: 'session',
            version: attempt.winnerVersion,
            principalId: arm.principalId,
            session: arm.session,
          };
          await removePrincipalScopedQueries(queryClient, principal.id);
          await restoreDeletionWinner(client, attempt);
          return { kind: 'superseded' };
        }
        if (arm.kind === 'preserved-guarded') {
          requiresPostFinalizationReconciliation = true;
          await publishSignedOutAfterDeletion(principal.id, attempt);
          return { kind: 'superseded' };
        }
        if (arm.kind === 'quarantine-unconfirmed') {
          requiresPostFinalizationReconciliation = true;
          const publication = await publishSignedOutAfterDeletion(
            principal.id,
            attempt,
          );
          if (publication === 'superseded') {
            return { kind: 'superseded' };
          }
          throw new AuthError(
            'account-deletion-failed',
            AUTH_USER_MESSAGES.accountDeletionFailed,
          );
        }
        if (arm.kind !== 'armed') {
          throw new AuthError(
            'account-deletion-failed',
            AUTH_USER_MESSAGES.accountDeletionFailed,
          );
        }
        attempt.guardRevision = arm.guardRevision;

        const reauthentication = await reauthenticateForAccountDeletion(
          {
            email: attempt.principalEmail,
            password,
            expectedPrincipalId: attempt.principalId,
          },
          {},
        );
        if (attempt.winner != null) {
          const disarm = await runSupabaseAuthOperation(storageKey, async () => {
            const result = await disarmPrincipalDeletionGuard(
              storageKey,
              attempt!.principalId,
              attempt!.guardRevision!,
            );
            guardDisarmAttempted = true;
            return result;
          });
          const resolution = await resolveDeletionDisarm(client, attempt, disarm);
          requiresPostFinalizationReconciliation ||=
            resolution.requiresReconciliation;
          return { kind: 'superseded' };
        }

        const lockedResult: {
          kind: 'pre-dispatch-superseded';
          disarm: PrincipalDeletionGuardDisarmResult;
        } | {
          kind: 'destructive';
          outcome: DeleteCurrentUserApiOutcome;
          settlement: 'signed-out' | 'superseded' | 'cleanup-unconfirmed';
        } = await runSupabaseAuthOperation(storageKey, async () => {
          if (attempt!.winner != null) {
            const disarm = await disarmPrincipalDeletionGuard(
              storageKey,
              attempt!.principalId,
              attempt!.guardRevision!,
            );
            guardDisarmAttempted = true;
            return { kind: 'pre-dispatch-superseded', disarm };
          }
          const pending = await markPrincipalDeletionDispatched(
            storageKey,
            attempt!.principalId,
            attempt!.guardRevision!,
          );
          if (typeof pending === 'object') {
            attempt!.winnerVersion += 1;
            attempt!.winner = pending.kind === 'preserved-winner'
              ? {
                  kind: 'session',
                  version: attempt!.winnerVersion,
                  principalId: pending.principalId,
                  session: pending.session,
                }
              : {
                  kind: 'signed-out',
                  version: attempt!.winnerVersion,
                };
            const disarm = await disarmPrincipalDeletionGuard(
              storageKey,
              attempt!.principalId,
              attempt!.guardRevision!,
            );
            guardDisarmAttempted = true;
            return { kind: 'pre-dispatch-superseded', disarm };
          }
          if (pending !== 'pending') {
            requiresPostFinalizationReconciliation = true;
            throw new AuthError(
              'account-deletion-failed',
              AUTH_USER_MESSAGES.accountDeletionFailed,
            );
          }
          let outcome: DeleteCurrentUserApiOutcome;
          try {
            outcome = await deleteCurrentUser(
              reauthentication.accessToken,
              {
                onInvocationStart: () => {
                  destructiveRequestStarted = true;
                },
              },
            );
          } catch (error) {
            if (
              !destructiveRequestStarted ||
              isConfirmedPreRevocationDeletionError(error)
            ) {
              destructiveRequestStarted = false;
              throw error;
            }
            outcome = { kind: 'unconfirmed-signed-out' };
          }
          destructiveOutcome = outcome;
          const guardSettlement = await settlePrincipalDeletionGuard(
            storageKey,
            attempt!.principalId,
            attempt!.guardRevision!,
          );
          if (guardSettlement !== 'settled') {
            requiresPostFinalizationReconciliation = true;
          }
          const settlement = await settleDeletedPrincipalLocally(
            attempt!,
            storageKey,
          );
          if (settlement !== 'signed-out') {
            requiresPostFinalizationReconciliation = true;
          }
          return { kind: 'destructive', outcome, settlement };
        });

        if (lockedResult.kind === 'pre-dispatch-superseded') {
          const resolution = await resolveDeletionDisarm(
            client,
            attempt,
            lockedResult.disarm,
          );
          requiresPostFinalizationReconciliation ||=
            resolution.requiresReconciliation;
          return { kind: 'superseded' };
        }

        await guardedAuthReconciliationTailRef.current;
        if (attempt.winner != null) {
          try {
            await removePrincipalScopedQueries(queryClient, attempt.principalId);
            const restored = await restoreDeletionWinner(client, attempt);
            requiresPostFinalizationReconciliation ||=
              restored === 'restore-failed';
          } catch {
            requiresPostFinalizationReconciliation = true;
            await publishSignedOutAfterDeletion(attempt.principalId, attempt);
          }
          return { kind: 'superseded' };
        }
        if (lockedResult.settlement === 'superseded') {
          requiresPostFinalizationReconciliation = true;
          await publishSignedOutAfterDeletion(attempt.principalId, attempt);
          return { kind: 'superseded' };
        }
        if (lockedResult.settlement === 'cleanup-unconfirmed') {
          requiresPostFinalizationReconciliation = true;
        }
        const publication = await publishSignedOutAfterDeletion(
          attempt.principalId,
          attempt,
        );
        return publication === 'superseded'
          ? { kind: 'superseded' }
          : lockedResult.outcome;
      } catch (error) {
        if (
          (destructiveRequestStarted || destructiveOutcome != null) &&
          attempt != null
        ) {
          requiresPostFinalizationReconciliation = true;
          destructiveOutcome ??= { kind: 'unconfirmed-signed-out' };
          const client = resolveClient(clientProp);
          if (attempt.winner != null) {
            if (client != null) {
              try {
                await removePrincipalScopedQueries(
                  queryClient,
                  attempt.principalId,
                );
                await restoreDeletionWinner(client, attempt);
              } catch {
                await publishSignedOutAfterDeletion(
                  attempt.principalId,
                  attempt,
                );
              }
            } else {
              await publishSignedOutAfterDeletion(
                attempt.principalId,
                attempt,
              );
            }
            return { kind: 'superseded' };
          }
          const publication = await publishSignedOutAfterDeletion(
            attempt.principalId,
            attempt,
          );
          return publication === 'superseded'
            ? { kind: 'superseded' }
            : destructiveOutcome;
        }
        if (attempt?.guardRevision != null && !guardDisarmAttempted) {
          const client = resolveClient(clientProp);
          const disarm = await runSupabaseAuthOperation(storageKey, async () => {
            const result = await disarmPrincipalDeletionGuard(
              storageKey,
              attempt!.principalId,
              attempt!.guardRevision!,
            );
            guardDisarmAttempted = true;
            return result;
          });
          if (client != null) {
            const resolution = await resolveDeletionDisarm(
              client,
              attempt,
              disarm,
            );
            requiresPostFinalizationReconciliation ||=
              resolution.requiresReconciliation;
            if (resolution.kind === 'winner-restored') {
              return { kind: 'superseded' };
            }
          } else if (disarm.kind !== 'disarmed') {
            requiresPostFinalizationReconciliation = true;
            await publishSignedOutAfterDeletion(attempt.principalId, attempt);
          }
        }
        throw error;
      } finally {
        if (activeDeletionAttemptRef.current?.generation === deletionGeneration) {
          activeDeletionAttemptRef.current = null;
        }
        if (deletionGenerationRef.current === deletionGeneration) {
          deletionInFlightRef.current = false;
        }
        finishExplicitAuthOperation();
        if (requiresPostFinalizationReconciliation) {
          void requestGuardReconciliationRef.current();
        }
      }
    },
    [
      beginExplicitAuthOperation,
      clientProp,
      publishSignedOutAfterDeletion,
      queryClient,
      resolveDeletionDisarm,
      restoreDeletionWinner,
      settleDeletedPrincipalLocally,
      status,
      user,
    ],
  );

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<SignInResult> => {
      const finishExplicitAuthOperation = beginExplicitAuthOperation();
      try {
        await recoveryReconciliationRef.current;
        const client = resolveClient(clientProp);
        if (!client) {
          throw new Error('Auth client is unavailable.');
        }
        const result = await runAuthSessionWrite(() =>
          signInWithPassword(credentials, {
            client,
            storageKey: resolveProviderStorageKey(clientProp),
            createIsolatedAuthClient:
              clientProp !== undefined ? () => client : undefined,
          }),
        );
        await guardedAuthReconciliationTailRef.current;
        if (result.kind === 'superseded') return result;
        markExplicitAuthTransition(result.user.id);
        authGenerationRef.current += 1;
        const generation = authGenerationRef.current;
        latestAuthPrincipalRef.current = result.user.id;
        setRecoveryPhase('idle');
        // onAuthStateChange will sync status; apply optimistically for UX.
        await prepareUserScopedCacheForPrincipal(result.user.id);
        await guardedAuthReconciliationTailRef.current;
        const resolved = resolveOptimisticSignedIn(result, generation);
        if (resolved.kind === 'superseded') {
          return resolved;
        }
        if (authGenerationRef.current !== generation) {
          // Same principal confirmed by a newer transition — do not re-apply.
          return resolved;
        }
        setUser(result.user);
        setStatus('signed-in');
        return resolved;
      } finally {
        finishExplicitAuthOperation();
      }
    },
    [
      beginExplicitAuthOperation,
      clientProp,
      markExplicitAuthTransition,
      prepareUserScopedCacheForPrincipal,
      resolveOptimisticSignedIn,
      runAuthSessionWrite,
    ],
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<SignUpResult> => {
      const finishExplicitAuthOperation = beginExplicitAuthOperation();
      try {
        await recoveryReconciliationRef.current;
        const client = resolveClient(clientProp);
        if (!client) {
          throw new Error('Auth client is unavailable.');
        }
        const result = await runAuthSessionWrite(() =>
          signUpWithPassword(credentials, {
            client,
            storageKey: resolveProviderStorageKey(clientProp),
            createIsolatedAuthClient:
              clientProp !== undefined ? () => client : undefined,
          }),
        );
        await guardedAuthReconciliationTailRef.current;
        if (result.kind === 'signed-in') {
          markExplicitAuthTransition(result.user.id);
          authGenerationRef.current += 1;
          const generation = authGenerationRef.current;
          latestAuthPrincipalRef.current = result.user.id;
          setRecoveryPhase('idle');
          await prepareUserScopedCacheForPrincipal(result.user.id);
          await guardedAuthReconciliationTailRef.current;
          const resolved = resolveOptimisticSignedIn(result, generation);
          if (resolved.kind === 'superseded') {
            return resolved;
          }
          if (authGenerationRef.current !== generation) {
            return resolved;
          }
          setUser(result.user);
          setStatus('signed-in');
          return resolved;
        }
        return result;
      } finally {
        finishExplicitAuthOperation();
      }
    },
    [
      beginExplicitAuthOperation,
      clientProp,
      markExplicitAuthTransition,
      prepareUserScopedCacheForPrincipal,
      resolveOptimisticSignedIn,
      runAuthSessionWrite,
    ],
  );

  const signOut = useCallback(async () => {
    const finishExplicitAuthOperation = beginExplicitAuthOperation();
    try {
      await recoveryReconciliationRef.current;
      const client = resolveClient(clientProp);
      if (!client) {
        authGenerationRef.current += 1;
        const generation = authGenerationRef.current;
        latestAuthPrincipalRef.current = null;
        setRecoveryPhase('idle');
        await prepareUserScopedCacheForPrincipal(null);
        if (authGenerationRef.current !== generation) {
          return;
        }
        setUser(null);
        setStatus('signed-out');
        return;
      }
      const result = await signOutApi({
        client,
        storageKey: resolveProviderStorageKey(clientProp),
        createIsolatedAuthClient:
          clientProp !== undefined ? () => client : undefined,
      });
      if (result.kind === 'superseded') {
        markExplicitAuthTransition(result.user.id);
        authGenerationRef.current += 1;
        const generation = authGenerationRef.current;
        latestAuthPrincipalRef.current = result.user.id;
        setRecoveryPhase('idle');
        await prepareUserScopedCacheForPrincipal(result.user.id);
        if (authGenerationRef.current === generation) {
          setUser(result.user);
          setStatus('signed-in');
        }
        return;
      }
      markExplicitAuthTransition(null);
      authGenerationRef.current += 1;
      const generation = authGenerationRef.current;
      latestAuthPrincipalRef.current = null;
      setRecoveryPhase('idle');
      await prepareUserScopedCacheForPrincipal(null);
      if (authGenerationRef.current !== generation) {
        return;
      }
      setUser(null);
      setStatus('signed-out');
    } finally {
      finishExplicitAuthOperation();
    }
  }, [
    beginExplicitAuthOperation,
    clientProp,
    markExplicitAuthTransition,
    prepareUserScopedCacheForPrincipal,
  ]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isSignedIn: status === 'signed-in' && user != null,
      recoveryPhase,
      clearRecoveryPhase,
      signIn,
      signUp,
      signOut,
      deleteAccount,
    }),
    [
      clearRecoveryPhase,
      deleteAccount,
      recoveryPhase,
      signIn,
      signOut,
      signUp,
      status,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return value;
}
