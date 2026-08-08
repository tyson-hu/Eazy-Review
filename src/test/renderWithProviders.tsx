import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { createAppQueryClient } from '@/src/lib/query/client';
import { AppProviders } from '@/src/providers/AppProviders';

type ExtraOptions = {
  queryClient?: ReturnType<typeof createAppQueryClient>;
};

/**
 * Renders UI with application providers and an isolated QueryClient per call.
 * Does not enable NetInfo/AppState lifecycles (tests wire those explicitly).
 * Does not issue Supabase network requests.
 *
 * RNTL v14 `render` is async — always `await` this helper.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & ExtraOptions,
) {
  const { queryClient: providedClient, ...renderOptions } = options ?? {};
  // Disable GC timers so Jest can exit without --forceExit.
  const queryClient =
    providedClient ??
    createAppQueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
        },
      },
    });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders queryClient={queryClient} enableLifecycle={false}>
      {children}
    </AppProviders>
  );

  const result = await render(ui, { ...renderOptions, wrapper: Wrapper });

  return {
    queryClient,
    ...result,
    /**
     * Tears down the QueryClient (cancels in-flight work, clears cache/timers).
     * Safe to call after each test that used this harness.
     */
    async cleanup() {
      await queryClient.cancelQueries();
      queryClient.clear();
      await result.unmount();
    },
  };
}
