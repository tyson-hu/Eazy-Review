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
import { useQueryClient } from '@tanstack/react-query';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import {
  mapAuthUserFromSessionUser,
  processAuthCallbackUrl,
  restoreSession,
  signInWithPassword,
  signOut as signOutApi,
  signUpWithPassword,
} from '@/src/features/auth/api';
import { AuthError } from '@/src/features/auth/errors';
import type {
  AuthOperationSuperseded,
  AuthStatus,
  AuthUser,
  RecoveryPhase,
  SignInCredentials,
  SignInResult,
  SignInSuccess,
  SignUpCredentials,
  SignUpResult,
} from '@/src/features/auth/types';
import { isAuthCallbackUrl } from '@/src/features/auth/recoveryUrl';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/src/lib/network/requestTimeout';
import { removeUserScopedQueries } from '@/src/lib/query/userScopedCache';
import { getSupabase } from '@/src/lib/supabase/client';
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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthLinkingAdapter = {
  getInitialURL: () => Promise<string | null>;
  addEventListener: (
    type: 'url',
    listener: (event: { url: string }) => void,
  ) => { remove: () => void };
};

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

function authUserFromSession(session: Session | null): AuthUser | null {
  if (!session?.user) {
    return null;
  }
  return mapAuthUserFromSessionUser(session.user);
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
  /** Serializes all single-use recovery callback exchanges. */
  const recoveryExchangeInFlightRef = useRef(false);
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
  } | null>(null);

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
            await removeUserScopedQueries(queryClient);
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
    (client: AppSupabaseClient, supersedingSession: Session | null) => {
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
            if (supersedingSession) {
              try {
                const { error } = await client.auth.setSession({
                  access_token: supersedingSession.access_token,
                  refresh_token: supersedingSession.refresh_token,
                });
                if (!error) {
                  return;
                }
              } catch {
                // Fall through to best-effort current-device sign-out.
              }
            }

            try {
              await signOutApi({ client });
            } catch {
              // Explicit state settlement below prevents an indefinite loader.
            }

            authGenerationRef.current += 1;
            const signedOutGeneration = authGenerationRef.current;
            latestAuthPrincipalRef.current = null;
            latestAuthSessionRef.current = null;
            try {
              await prepareUserScopedCacheForPrincipal(null);
            } catch {
              // Keep signed out; a later principal transition retries purge.
            }
            if (authGenerationRef.current !== signedOutGeneration) {
              return;
            }
            setUser(null);
            setStatus('signed-out');
          } finally {
            settleReconciliation();
          }
        })();
      });
    },
    [prepareUserScopedCacheForPrincipal],
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
      const restore = restoreSession({
        client,
        onInvalidLocalSessionCleanupChange: (isCleaning) => {
          invalidBootstrapCleanupInFlightRef.current = isCleaning;
        },
      });
      sessionRestoreRef.current = restore.then(() => undefined);
      const restored = await restore;
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

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      // Keep the callback minimal: schedule React state after the event.
      // Do not perform nested Supabase auth calls here.
      // TOKEN_REFRESHED uses the same serialized path as SIGNED_IN so a
      // same-principal refresh cannot publish B while an A→B purge is open.
      if (cancelled) {
        return;
      }

      const currentAttempt = recoveryAttemptRef.current;
      const eventPrincipal = userIdFromSession(session);
      const isPendingInitialSession =
        currentAttempt != null &&
        recoveryGenerationRef.current === currentAttempt.generation &&
        currentAttempt.localSessionSnapshotPending &&
        event === 'INITIAL_SESSION';
      if (isPendingInitialSession) {
        currentAttempt.pendingInitialSession = session;
      }
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
            explicitAuthOperationSettlementsRef.current.size === 0));
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
          reconcileSupersededRecovery(client, supersedingSession);
          return;
        }
        setRecoveryPhase('verified');
      } else if (
        event === 'SIGNED_OUT' &&
        !isNonSupersedingAttemptMaintenance
      ) {
        setRecoveryPhase('idle');
      }
      // Do not clear recovery on SIGNED_IN / USER_UPDATED / TOKEN_REFRESHED —
      // recovery session lives as a normal session with a prior PASSWORD_RECOVERY.

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
    prepareUserScopedCacheForPrincipal,
    reconcileSupersededRecovery,
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
      if (recoveryExchangeInFlightRef.current) {
        return;
      }
      recoveryExchangeInFlightRef.current = true;

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
      };
      setRecoveryPhase('processing');

      // A recovery exchange can replace the stored session. Keep it behind
      // bootstrap validation and any conditional stale-session cleanup so a
      // later local sign-out cannot consume the newly exchanged session.
      const restoreSettled = await waitForSessionRestore(
        sessionRestoreRef.current,
      );
      if (!restoreSettled) {
        if (!cancelled && recoveryGenerationRef.current === generation) {
          setRecoveryPhase('temporary-failure');
        }
        recoveryExchangeInFlightRef.current = false;
        return;
      }
      if (cancelled || recoveryGenerationRef.current !== generation) {
        recoveryExchangeInFlightRef.current = false;
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
        recoveryExchangeInFlightRef.current = false;
        return;
      }
      const attempt = recoveryAttemptRef.current;
      if (attempt?.generation !== generation) {
        recoveryExchangeInFlightRef.current = false;
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

      try {
        const result = await processAuthCallbackUrl(url, { client });
        if (cancelled || recoveryGenerationRef.current !== generation) {
          return;
        }
        if (result.kind === 'ignored') {
          // Path opened without usable tokens (direct navigation / stripped URL).
          setRecoveryPhase((current) =>
            current === 'verified' ? 'verified' : 'idle',
          );
          return;
        }
        const attempt = recoveryAttemptRef.current;
        let foundSupersedingSession = false;
        let supersedingSession: Session | null = null;
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
          reconcileSupersededRecovery(client, supersedingSession);
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
        if (result.kind === 'password-recovery') {
          // Token-based recovery with type=recovery; also wait for SDK event.
          setRecoveryPhase('verified');
          return;
        }
        // Session exchanged (e.g. PKCE). Only PASSWORD_RECOVERY may promote
        // this phase; ordinary SIGNED_IN must never authorize password update.
        setRecoveryPhase((current) =>
          current === 'verified' ? 'verified' : 'unavailable',
        );
      } catch (error) {
        if (cancelled || recoveryGenerationRef.current !== generation) {
          return;
        }
        setRecoveryPhase(
          error instanceof AuthError && error.code === 'recovery-link-invalid'
            ? 'unavailable'
            : 'temporary-failure',
        );
      } finally {
        await recoveryReconciliationRef.current;
        recoveryExchangeInFlightRef.current = false;
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
  }, [clientProp, enableSession, linking, reconcileSupersededRecovery]);

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

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<SignInResult> => {
      const finishExplicitAuthOperation = beginExplicitAuthOperation();
      try {
        await recoveryReconciliationRef.current;
        const client = resolveClient(clientProp);
        if (!client) {
          throw new Error('Auth client is unavailable.');
        }
        const result = await signInWithPassword(credentials, { client });
        markExplicitAuthTransition(result.user.id);
        authGenerationRef.current += 1;
        const generation = authGenerationRef.current;
        latestAuthPrincipalRef.current = result.user.id;
        setRecoveryPhase('idle');
        // onAuthStateChange will sync status; apply optimistically for UX.
        await prepareUserScopedCacheForPrincipal(result.user.id);
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
        const result = await signUpWithPassword(credentials, { client });
        if (result.kind === 'signed-in') {
          markExplicitAuthTransition(result.user.id);
          authGenerationRef.current += 1;
          const generation = authGenerationRef.current;
          latestAuthPrincipalRef.current = result.user.id;
          setRecoveryPhase('idle');
          await prepareUserScopedCacheForPrincipal(result.user.id);
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
      await signOutApi({ client });
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
    }),
    [
      clearRecoveryPhase,
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
