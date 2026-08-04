import {
  QueryClient,
  type DefaultOptions,
  type QueryClientConfig,
} from '@tanstack/react-query';

/**
 * HTTP / PostgREST-style status codes that should not be retried.
 * 4xx validation and authorization failures are deterministic.
 */
function getErrorStatus(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object') {
    return undefined;
  }
  const record = error as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  if (typeof record.status === 'number') {
    return record.status;
  }
  if (typeof record.statusCode === 'number') {
    return record.statusCode;
  }
  // Supabase/PostgREST sometimes put HTTP status under `code` as a string.
  if (typeof record.code === 'string' && /^\d{3}$/.test(record.code)) {
    return Number(record.code);
  }
  if (typeof record.code === 'number') {
    return record.code;
  }
  return undefined;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // One small total read-retry budget (initial attempt + one retry).
  if (failureCount >= 1) {
    return false;
  }
  const status = getErrorStatus(error);
  if (status != null && status >= 400 && status < 500) {
    return false;
  }
  return true;
}

export const defaultQueryClientOptions: DefaultOptions = {
  queries: {
    retry: shouldRetryQuery,
    // Avoid aggressive refetching; connected screens (Task 15+) own UX timing.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },
  mutations: {
    // Rating and other mutations must not auto-retry (Task 14 + Task 17 contracts).
    retry: false,
  },
};

export function createAppQueryClient(
  config?: QueryClientConfig,
): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...defaultQueryClientOptions,
      ...config?.defaultOptions,
      queries: {
        ...defaultQueryClientOptions.queries,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        ...defaultQueryClientOptions.mutations,
        ...config?.defaultOptions?.mutations,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Singleton QueryClient for the running app. Tests should call
 * `createAppQueryClient()` for isolated state instead of this helper.
 */
export function getAppQueryClient(): QueryClient {
  if (!browserQueryClient) {
    browserQueryClient = createAppQueryClient();
  }
  return browserQueryClient;
}

/** Test-only: drop the process singleton between cases. */
export function resetAppQueryClientForTests(): void {
  browserQueryClient = undefined;
}
