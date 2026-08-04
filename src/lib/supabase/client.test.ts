import { createClient } from '@supabase/supabase-js';

import {
  createAppSupabaseClient,
  type AppSupabaseClient,
} from '@/src/lib/supabase/createClient';
import {
  getSupabase,
  resetSupabaseClientForTests,
} from '@/src/lib/supabase/client';
import type { Database } from '@/src/types/database.generated';

const VALID_ENV = {
  supabaseUrl: 'http://127.0.0.1:54321',
  supabasePublishableKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
} as const;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  })),
}));

jest.mock('@/src/lib/env/publicEnv', () => ({
  getPublicEnv: jest.fn(() => VALID_ENV),
  resetPublicEnvCacheForTests: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

describe('createAppSupabaseClient', () => {
  beforeEach(() => {
    mockedCreateClient.mockClear();
  });

  it('creates the client with validated configuration and auth adapter options', () => {
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
    expect(options?.auth?.storage).toBeDefined();
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
    resetSupabaseClientForTests();
  });

  it('exports one stable client instance', () => {
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
    expect(mockedCreateClient).toHaveBeenCalledTimes(1);
  });

  it('does not issue a database query when first resolving the singleton', () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('unexpected network');
    });
    expect(getSupabase()).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
