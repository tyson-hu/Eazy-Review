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
  AuthStatus,
  AuthUser,
  SignInCredentials,
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
  signIn: (credentials: SignInCredentials) => Promise<SignInSuccess>;
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
  const previousUserIdRef = useRef<string | null>(null);
  /**
   * Monotonic generation so a delayed restoreSession cannot overwrite a newer
   * SIGNED_IN / SIGNED_OUT (or other applied session) that arrived mid-bootstrap.
   */
  const authGenerationRef = useRef(0);

  const clearUserScopedIfPrincipalChanged = useCallback(
    async (nextUserId: string | null) => {
      const previous = previousUserIdRef.current;
      if (previous === nextUserId) {
        return;
      }
      // Record the principal first so concurrent events see the new id.
      previousUserIdRef.current = nextUserId;
      // Only purge when leaving a real principal (sign-out or A→B).
      if (previous != null) {
        await removeUserScopedQueries(queryClient);
      }
    },
    [queryClient],
  );

  const applySession = useCallback(
    async (session: Session | null) => {
      const nextUser = authUserFromSession(session);
      const nextId = userIdFromSession(session);
      await clearUserScopedIfPrincipalChanged(nextId);
      setUser(nextUser);
      setStatus(nextUser ? 'signed-in' : 'signed-out');
    },
    [clearUserScopedIfPrincipalChanged],
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
      await clearUserScopedIfPrincipalChanged(nextId);
      if (cancelled || authGenerationRef.current !== generationAtBootstrapStart) {
        return;
      }
      setUser(restored);
      setStatus(restored ? 'signed-in' : 'signed-out');
    };

    void bootstrap();

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange((event, session) => {
      // Keep the callback minimal: schedule React state after the event.
      // Do not perform nested Supabase auth calls here.
      if (cancelled) {
        return;
      }

      // TOKEN_REFRESHED for the same user must not clear user-scoped cache.
      if (event === 'TOKEN_REFRESHED') {
        const nextId = userIdFromSession(session);
        if (nextId != null && nextId === previousUserIdRef.current) {
          // Refresh identity-bearing fields if email changed, without purge.
          const nextUser = authUserFromSession(session);
          if (nextUser) {
            // Still advance generation so a late restore cannot overwrite.
            authGenerationRef.current += 1;
            setUser(nextUser);
            setStatus('signed-in');
          }
          return;
        }
      }

      // Invalidate any in-flight bootstrap before scheduling application.
      authGenerationRef.current += 1;
      const appliedGeneration = authGenerationRef.current;

      // Defer state application so we avoid nested client work inside the callback.
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        if (authGenerationRef.current !== appliedGeneration) {
          return;
        }
        void applySession(session);
      });
    });

    subscription = authSubscription;

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [
    applySession,
    clearUserScopedIfPrincipalChanged,
    clientProp,
    enableSession,
  ]);

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      const client = resolveClient(clientProp);
      if (!client) {
        throw new Error('Auth client is unavailable.');
      }
      const result = await signInWithPassword(credentials, { client });
      authGenerationRef.current += 1;
      // onAuthStateChange will sync status; apply optimistically for UX.
      await clearUserScopedIfPrincipalChanged(result.user.id);
      setUser(result.user);
      setStatus('signed-in');
      return result;
    },
    [clearUserScopedIfPrincipalChanged, clientProp],
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials) => {
      const client = resolveClient(clientProp);
      if (!client) {
        throw new Error('Auth client is unavailable.');
      }
      const result = await signUpWithPassword(credentials, { client });
      if (result.kind === 'signed-in') {
        authGenerationRef.current += 1;
        await clearUserScopedIfPrincipalChanged(result.user.id);
        setUser(result.user);
        setStatus('signed-in');
      }
      return result;
    },
    [clearUserScopedIfPrincipalChanged, clientProp],
  );

  const signOut = useCallback(async () => {
    const client = resolveClient(clientProp);
    if (!client) {
      authGenerationRef.current += 1;
      await clearUserScopedIfPrincipalChanged(null);
      setUser(null);
      setStatus('signed-out');
      return;
    }
    await signOutApi({ client });
    authGenerationRef.current += 1;
    await clearUserScopedIfPrincipalChanged(null);
    setUser(null);
    setStatus('signed-out');
  }, [clearUserScopedIfPrincipalChanged, clientProp]);

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
