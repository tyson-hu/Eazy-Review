import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

import { AuthProvider } from '@/src/features/auth/AuthProvider';
import {
  createAppQueryClient,
  getAppQueryClient,
} from '@/src/lib/query/client';
import { setupQueryLifecycle } from '@/src/lib/query/lifecycle';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

type AppProvidersProps = {
  children: ReactNode;
  /**
   * When provided (tests), this client is used instead of the app singleton.
   * Omitting it keeps production / Expo using one process-wide client.
   */
  queryClient?: ReturnType<typeof createAppQueryClient>;
  /**
   * When false, skip Supabase resolution and NetInfo / AppState / auth-refresh
   * setup (unit tests). Defaults to true for the running app.
   */
  enableLifecycle?: boolean;
  /**
   * Optional AuthProvider client injection for tests. When `enableLifecycle`
   * is false and this is omitted, AuthProvider runs without a live session.
   */
  authClient?: AppSupabaseClient | null;
  /**
   * When false, AuthProvider skips session restore and listeners.
   * Defaults to the same value as `enableLifecycle`.
   */
  enableAuthSession?: boolean;
};

/**
 * Application infrastructure providers.
 *
 * With lifecycle enabled, validates public env and constructs the Supabase
 * client synchronously during provider render/bootstrap (not in an effect).
 * Invalid configuration throws `PublicEnvError` on this deliberate path —
 * never swallowed as a fire-and-forget rejection. The effect only installs
 * and tears down AppState / NetInfo / auth-refresh listeners.
 */
export function AppProviders({
  children,
  queryClient: queryClientProp,
  enableLifecycle = true,
  authClient,
  enableAuthSession,
}: AppProvidersProps) {
  const [queryClient] = useState(
    () => queryClientProp ?? getAppQueryClient(),
  );

  const sessionEnabled = enableAuthSession ?? enableLifecycle;

  // Render/bootstrap path: controlled failure for bad env before children mount.
  // Identity is the real singleton (no Proxy, no dynamic import).
  const supabase = enableLifecycle ? getSupabase() : undefined;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    return setupQueryLifecycle({ supabase });
  }, [supabase]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider
        client={
          authClient !== undefined
            ? authClient
            : enableLifecycle
              ? undefined
              : null
        }
        enableSession={sessionEnabled}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
