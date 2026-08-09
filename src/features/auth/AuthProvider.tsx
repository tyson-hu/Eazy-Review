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
import type { Session } from '@supabase/supabase-js';

import {
  mapAuthUserFromSessionUser,
  restoreSession,
  signInWithPassword,
  signOut as signOutApi,
  signUpWithPassword,
} from '@/src/features/auth/api';
import type {
  AuthOperationSuperseded,
  AuthStatus,
  AuthUser,
  SignInCredentials,
  SignInResult,
  SignInSuccess,
  SignUpCredentials,
  SignUpResult,
} from '@/src/features/auth/types';
import { removeUserScopedQueries } from '@/src/lib/query/userScopedCache';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** True when status is signed-in and a user is present. */
  isSignedIn: boolean;
  signIn: (credentials: SignInCredentials) => Promise<SignInResult>;
  signUp: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
 * Application auth state. Exposes identity presence only — never tokens.
 * Clears user-scoped Query cache on principal change; leaves public catalog.
 *
 * Principal tracking is split into three concepts:
 * - latestAuthPrincipal: newest principal announced by an authoritative auth
 *   transition (used for superseded-operation decisions)
 * - cachePrincipal: principal whose user-scoped cache is already prepared
 * - React user/status: published only after that principal's cache prep finishes
 */
export function AuthProvider({
  children,
  client: clientProp,
  enableSession = true,
}: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    enableSession ? 'initializing' : 'signed-out',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  /**
   * Newest principal announced by the latest authoritative auth transition.
   * Used for explicit sign-in/up superseded decisions — not for cache ownership.
   */
  const latestAuthPrincipalRef = useRef<string | null>(null);
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
            return;
          }
          // Only purge when leaving a real principal (sign-out or A→B).
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
      const restored = await restoreSession({ client });
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
    } = client.auth.onAuthStateChange((_event, session) => {
      // Keep the callback minimal: schedule React state after the event.
      // Do not perform nested Supabase auth calls here.
      // TOKEN_REFRESHED uses the same serialized path as SIGNED_IN so a
      // same-principal refresh cannot publish B while an A→B purge is open.
      if (cancelled) {
        return;
      }

      // Invalidate any in-flight bootstrap before scheduling application.
      authGenerationRef.current += 1;
      const appliedGeneration = authGenerationRef.current;
      latestAuthPrincipalRef.current = userIdFromSession(session);

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
  }, [applySession, clientProp, enableSession, prepareUserScopedCacheForPrincipal]);

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
      const client = resolveClient(clientProp);
      if (!client) {
        throw new Error('Auth client is unavailable.');
      }
      const result = await signInWithPassword(credentials, { client });
      authGenerationRef.current += 1;
      const generation = authGenerationRef.current;
      latestAuthPrincipalRef.current = result.user.id;
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
    },
    [clientProp, prepareUserScopedCacheForPrincipal, resolveOptimisticSignedIn],
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<SignUpResult> => {
      const client = resolveClient(clientProp);
      if (!client) {
        throw new Error('Auth client is unavailable.');
      }
      const result = await signUpWithPassword(credentials, { client });
      if (result.kind === 'signed-in') {
        authGenerationRef.current += 1;
        const generation = authGenerationRef.current;
        latestAuthPrincipalRef.current = result.user.id;
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
    },
    [clientProp, prepareUserScopedCacheForPrincipal, resolveOptimisticSignedIn],
  );

  const signOut = useCallback(async () => {
    const client = resolveClient(clientProp);
    if (!client) {
      authGenerationRef.current += 1;
      const generation = authGenerationRef.current;
      latestAuthPrincipalRef.current = null;
      await prepareUserScopedCacheForPrincipal(null);
      if (authGenerationRef.current !== generation) {
        return;
      }
      setUser(null);
      setStatus('signed-out');
      return;
    }
    await signOutApi({ client });
    authGenerationRef.current += 1;
    const generation = authGenerationRef.current;
    latestAuthPrincipalRef.current = null;
    await prepareUserScopedCacheForPrincipal(null);
    if (authGenerationRef.current !== generation) {
      return;
    }
    setUser(null);
    setStatus('signed-out');
  }, [clientProp, prepareUserScopedCacheForPrincipal]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isSignedIn: status === 'signed-in' && user != null,
      signIn,
      signUp,
      signOut,
    }),
    [signIn, signOut, signUp, status, user],
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
