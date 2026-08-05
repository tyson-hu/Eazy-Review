import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { AppState, Text } from 'react-native';

import {
  PUBLIC_SUPABASE_URL_VAR,
  PublicEnvError,
  getPublicEnv,
  resetPublicEnvCacheForTests,
  validatePublicSupabaseEnv,
} from '@/src/lib/env/publicEnv';
import { createAppQueryClient } from '@/src/lib/query/client';
import { resetSupabaseClientForTests } from '@/src/lib/supabase/client';
import { AppProviders } from '@/src/providers/AppProviders';

/**
 * Keep validation helpers real. Only replace the default runtime bag reader so
 * the AppProviders → getSupabase → getPublicEnv path can fail without mutating
 * a frozen export or reloading RNTL (which registers Jest hooks on import).
 */
jest.mock('@/src/lib/env/publicEnv', () => {
  const actual = jest.requireActual<typeof import('@/src/lib/env/publicEnv')>(
    '@/src/lib/env/publicEnv',
  );
  return {
    ...actual,
    getPublicEnv: jest.fn((source?: import('@/src/lib/env/publicEnv').EnvSource) =>
      actual.getPublicEnv(source),
    ),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

const VALID_ENV = {
  supabaseUrl: 'http://127.0.0.1:54321',
  supabasePublishableKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
} as const;

const mockedGetPublicEnv = getPublicEnv as jest.MockedFunction<
  typeof getPublicEnv
>;

/**
 * Narrow boundary used only to observe deliberate bootstrap failures.
 * Not a product loading or recovery surface.
 */
class TestErrorBoundary extends Component<
  {
    children: ReactNode;
    onError: (error: Error) => void;
  },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError(error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Text testID="bootstrap-error">{this.state.error.message}</Text>
      );
    }
    return this.props.children;
  }
}

function QueryClientProbe({
  onClient,
}: {
  onClient: (client: ReturnType<typeof createAppQueryClient>) => void;
}) {
  const client = useQueryClient() as ReturnType<typeof createAppQueryClient>;
  onClient(client);
  return <Text>probe-ok</Text>;
}

describe('AppProviders environment bootstrap', () => {
  afterEach(() => {
    resetSupabaseClientForTests();
    resetPublicEnvCacheForTests();
    mockedGetPublicEnv.mockReset();
    mockedGetPublicEnv.mockImplementation(
      (source?: import('@/src/lib/env/publicEnv').EnvSource) => {
        const actual = jest.requireActual<typeof import('@/src/lib/env/publicEnv')>(
          '@/src/lib/env/publicEnv',
        );
        return actual.getPublicEnv(source);
      },
    );
    jest.restoreAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockClear();
  });

  it('surfaces PublicEnvError from lifecycle-enabled provider render', async () => {
    // Real validation, empty source → production PublicEnvError shape/message.
    mockedGetPublicEnv.mockImplementation(() =>
      validatePublicSupabaseEnv({}),
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- spy module export
    const supabaseJs = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    const createClientSpy = jest.spyOn(supabaseJs, 'createClient');

    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('unexpected network during provider bootstrap');
    });
    // Expected React error-boundary / render failure noise only for this case.
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    let caught: Error | undefined;
    const queryClient = createAppQueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity },
      },
    });

    try {
      const rendered = await render(
        <TestErrorBoundary
          onError={(error) => {
            caught = error;
          }}
        >
          <AppProviders enableLifecycle queryClient={queryClient}>
            <Text>should-not-mount</Text>
          </AppProviders>
        </TestErrorBoundary>,
      );

      const message = rendered.getByTestId('bootstrap-error').props.children;
      expect(String(message)).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
      expect(caught).toBeInstanceOf(PublicEnvError);
      if (!(caught instanceof PublicEnvError)) {
        throw new Error('expected PublicEnvError from bootstrap');
      }
      expect(caught.variable).toBe(PUBLIC_SUPABASE_URL_VAR);
      expect(String(caught)).not.toMatch(/eyJ/);
      expect(String(caught)).not.toMatch(/sb_publishable_/);
      expect(mockedGetPublicEnv).toHaveBeenCalled();
      expect(createClientSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(rendered.queryByText('should-not-mount')).toBeNull();

      rendered.unmount();
    } finally {
      consoleErrorSpy.mockRestore();
      fetchSpy.mockRestore();
      createClientSpy.mockRestore();
      await queryClient.cancelQueries();
      queryClient.clear();
    }
  });

  it('resolves Supabase during lifecycle-enabled provider bootstrap', async () => {
    mockedGetPublicEnv.mockReturnValue(VALID_ENV);

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- spy module export
    const supabaseJs = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    const createClientSpy = jest.spyOn(supabaseJs, 'createClient');
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('unexpected network during provider bootstrap');
    });
    const appStateRemove = jest.fn();
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(() => ({ remove: appStateRemove }));
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });

    const queryClient = createAppQueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity },
      },
    });

    try {
      const rendered = await render(
        <AppProviders enableLifecycle queryClient={queryClient}>
          <Text>bootstrap-ok</Text>
        </AppProviders>,
      );

      expect(rendered.getByText('bootstrap-ok')).toBeTruthy();
      expect(mockedGetPublicEnv).toHaveBeenCalled();
      expect(createClientSpy).toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(appStateSpy).toHaveBeenCalled();

      rendered.unmount();
    } finally {
      fetchSpy.mockRestore();
      createClientSpy.mockRestore();
      appStateSpy.mockRestore();
      await queryClient.cancelQueries();
      queryClient.clear();
    }
  });

  it('renders without Supabase env when lifecycle is disabled', async () => {
    // Force any accidental bootstrap to throw; provider must not call it.
    mockedGetPublicEnv.mockImplementation(() => {
      throw new PublicEnvError(
        PUBLIC_SUPABASE_URL_VAR,
        'is missing or empty after trim',
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- spy module export
    const supabaseJs = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    const createClientModuleSpy = jest.spyOn(supabaseJs, 'createClient');
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('unexpected network when lifecycle disabled');
    });
    const appStateSpy = jest.spyOn(AppState, 'addEventListener');
    (NetInfo.addEventListener as jest.Mock).mockClear();

    const queryClient = createAppQueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity },
      },
    });

    try {
      const rendered = await render(
        <AppProviders enableLifecycle={false} queryClient={queryClient}>
          <Text>lifecycle-off</Text>
        </AppProviders>,
      );

      expect(rendered.getByText('lifecycle-off')).toBeTruthy();
      expect(mockedGetPublicEnv).not.toHaveBeenCalled();
      expect(createClientModuleSpy).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(NetInfo.addEventListener).not.toHaveBeenCalled();
      expect(appStateSpy).not.toHaveBeenCalled();

      rendered.unmount();
    } finally {
      fetchSpy.mockRestore();
      createClientModuleSpy.mockRestore();
      appStateSpy.mockRestore();
      await queryClient.cancelQueries();
      queryClient.clear();
    }
  });

  it('uses the supplied QueryClient when provided', async () => {
    const provided = createAppQueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity },
      },
    });
    let observed: ReturnType<typeof createAppQueryClient> | undefined;

    try {
      const rendered = await render(
        <AppProviders enableLifecycle={false} queryClient={provided}>
          <QueryClientProbe
            onClient={(client) => {
              observed = client;
            }}
          />
        </AppProviders>,
      );

      expect(rendered.getByText('probe-ok')).toBeTruthy();
      expect(observed).toBe(provided);

      rendered.unmount();
    } finally {
      await provided.cancelQueries();
      provided.clear();
    }
  });
});
