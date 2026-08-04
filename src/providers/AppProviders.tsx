import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

import {
  createAppQueryClient,
  getAppQueryClient,
} from '@/src/lib/query/client';
import { setupQueryLifecycle } from '@/src/lib/query/lifecycle';

type AppProvidersProps = {
  children: ReactNode;
  /**
   * When provided (tests), this client is used instead of the app singleton.
   * Omitting it keeps production / Expo using one process-wide client.
   */
  queryClient?: ReturnType<typeof createAppQueryClient>;
  /**
   * When false, skip NetInfo / AppState / auth-refresh setup (unit tests).
   * Defaults to true for the running app.
   */
  enableLifecycle?: boolean;
};

/**
 * Application infrastructure providers. Does not alter mock-backed product UI.
 * Future auth or feature providers may compose here without restructuring
 * navigation.
 */
export function AppProviders({
  children,
  queryClient: queryClientProp,
  enableLifecycle = true,
}: AppProvidersProps) {
  const [queryClient] = useState(
    () => queryClientProp ?? getAppQueryClient(),
  );

  useEffect(() => {
    if (!enableLifecycle) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import('@/src/lib/supabase/client').then(({ supabase }) => {
      if (cancelled) {
        return;
      }
      cleanup = setupQueryLifecycle({ supabase });
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enableLifecycle]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
