import { createClient, processLock } from '@supabase/supabase-js';

import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
  PUBLIC_SUPABASE_URL_VAR,
  PublicEnvError,
  resetPublicEnvCacheForTests,
} from '@/src/lib/env/publicEnv';
import {
  getSupabase,
  resetSupabaseClientForTests,
} from '@/src/lib/supabase/client';
import {
  createAppSupabaseClient,
  type AppSupabaseClient,
} from '@/src/lib/supabase/createClient';
import { authStorage } from '@/src/lib/supabase/authStorage';
import type { Database } from '@/src/types/database.generated';

const VALID_ENV = {
  supabaseUrl: 'http://127.0.0.1:54321',
  supabasePublishableKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
} as const;

jest.mock('@supabase/supabase-js', () => {
  const actual = jest.requireActual<typeof import('@supabase/supabase-js')>(
    '@supabase/supabase-js',
  );
  return {
    ...actual,
    createClient: jest.fn(() => ({
      from: jest.fn(),
      auth: {
        startAutoRefresh: jest.fn(),
        stopAutoRefresh: jest.fn(),
      },
    })),
  };
});

jest.mock('@/src/lib/env/publicEnv', () => {
  const actual = jest.requireActual<typeof import('@/src/lib/env/publicEnv')>(
    '@/src/lib/env/publicEnv',
  );
  return {
    ...actual,
    getPublicEnv: jest.fn(() => VALID_ENV),
  };
});

const mockedCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockedGetPublicEnv = jest.requireMock('@/src/lib/env/publicEnv')
  .getPublicEnv as jest.MockedFunction<() => typeof VALID_ENV>;

describe('createAppSupabaseClient', () => {
  beforeEach(() => {
    mockedCreateClient.mockClear();
  });

  it('creates the client with storage, processLock, and auth session options', () => {
    createAppSupabaseClient(VALID_ENV);

    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    const [url, key, options] = mockedCreateClient.mock.calls[0];
    expect(url).toBe(VALID_ENV.supabaseUrl);
    expect(key).toBe(VALID_ENV.supabasePublishableKey);
    expect(options).toMatchObject({
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    expect(options?.auth?.storage).toBe(authStorage);
    expect(options?.auth?.lock).toBe(processLock);
  });

  it('uses the generated Database type at compile time', () => {
    const client = createAppSupabaseClient(VALID_ENV);
    const typed: AppSupabaseClient = client;
    void typed;
    type _Assert =
      AppSupabaseClient extends import('@supabase/supabase-js').SupabaseClient<Database>
        ? true
        : never;
    const ok: _Assert = true;
    expect(ok).toBe(true);
  });

  it('does not issue a database query when creating the client', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('unexpected network');
    });

    const client = createAppSupabaseClient(VALID_ENV);
    expect(client).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});

describe('supabase singleton module', () => {
  beforeEach(() => {
    mockedCreateClient.mockClear();
    mockedGetPublicEnv.mockImplementation(() => VALID_ENV);
    resetSupabaseClientForTests();
  });

  it('returns one real stable client instance', () => {
    const first = getSupabase();
    const second = getSupabase();
    expect(first).toBe(second);
    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
    // Real singleton identity: createClient mock result is returned as-is (not wrapped).
    expect(first).toBe(mockedCreateClient.mock.results[0]?.value);
    expect(Object.getPrototypeOf(first)).not.toBeNull();
  });

  it('creates a fresh singleton after test reset', () => {
    const first = getSupabase();
    resetSupabaseClientForTests();
    const second = getSupabase();
    expect(second).not.toBe(first);
    expect(mockedCreateClient).toHaveBeenCalledTimes(2);
  });

  it('does not issue a database query when first resolving the singleton', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('unexpected network');
    });
    expect(getSupabase()).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('fails in a controlled way when public env validation throws', () => {
    mockedGetPublicEnv.mockImplementation(() => {
      throw new PublicEnvError(
        PUBLIC_SUPABASE_URL_VAR,
        'is missing or empty after trim',
      );
    });

    expect(() => getSupabase()).toThrow(PublicEnvError);
    expect(() => getSupabase()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it('propagates controlled env failure for invalid placeholder values', () => {
    mockedGetPublicEnv.mockImplementation(() => {
      throw new PublicEnvError(
        PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
        'looks like a placeholder; set the public publishable (or legacy anon) key',
      );
    });

    try {
      getSupabase();
      throw new Error('expected getSupabase to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicEnvError);
      expect(String(error)).toContain(PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR);
      expect(String(error)).not.toMatch(/sb_publishable_your/);
    }
  });
});

afterAll(() => {
  resetPublicEnvCacheForTests();
  resetSupabaseClientForTests();
});
