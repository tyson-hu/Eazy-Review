import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
  PUBLIC_SUPABASE_URL_VAR,
  PublicEnvError,
  getPublicEnv,
  resetPublicEnvCacheForTests,
  validatePublicSupabaseEnv,
} from '@/src/lib/env/publicEnv';

const VALID_URL = 'http://127.0.0.1:54321';
// Local Supabase demo anon JWT (public by design; role: anon). Not a secret.
const VALID_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const VALID_PUBLISHABLE = 'sb_publishable_local_dev_key_abcdefghijklmnop';

const ENV_URL = 'EXPO_PUBLIC_SUPABASE_URL';
const ENV_KEY = 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

// Synthetic service-role-shaped JWT for rejection tests only. Not a real credential.
function encodeJwtPayload(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = globalThis
    .btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64}.sig`;
}

type ProcessEnvSnapshot = {
  url: string | undefined;
  key: string | undefined;
};

function snapshotProcessEnv(): ProcessEnvSnapshot {
  return {
    url: process.env[ENV_URL],
    key: process.env[ENV_KEY],
  };
}

function applyProcessEnv(snapshot: ProcessEnvSnapshot): void {
  if (snapshot.url === undefined) {
    delete process.env[ENV_URL];
  } else {
    process.env[ENV_URL] = snapshot.url;
  }
  if (snapshot.key === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = snapshot.key;
  }
}

/**
 * Reloads publicEnv after setting process.env so the private runtime bag is
 * captured with static `process.env.EXPO_PUBLIC_*` values at module load.
 */
function loadPublicEnvModuleWithProcessEnv(values: {
  url?: string | undefined;
  key?: string | undefined;
}): {
  getPublicEnv: typeof getPublicEnv;
  PublicEnvError: typeof PublicEnvError;
  PUBLIC_SUPABASE_URL_VAR: typeof PUBLIC_SUPABASE_URL_VAR;
  PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR: typeof PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR;
  resetPublicEnvCacheForTests: typeof resetPublicEnvCacheForTests;
  restore: () => void;
} {
  const previous = snapshotProcessEnv();

  if (values.url === undefined) {
    delete process.env[ENV_URL];
  } else {
    process.env[ENV_URL] = values.url;
  }
  if (values.key === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = values.key;
  }

  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional fresh load after resetModules
  const mod = require('@/src/lib/env/publicEnv') as typeof import('@/src/lib/env/publicEnv');

  return {
    getPublicEnv: mod.getPublicEnv,
    PublicEnvError: mod.PublicEnvError,
    PUBLIC_SUPABASE_URL_VAR: mod.PUBLIC_SUPABASE_URL_VAR,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR: mod.PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
    resetPublicEnvCacheForTests: mod.resetPublicEnvCacheForTests,
    restore: () => {
      applyProcessEnv(previous);
      jest.resetModules();
    },
  };
}

afterEach(() => {
  resetPublicEnvCacheForTests();
});

describe('validatePublicSupabaseEnv', () => {
  it('accepts a valid local HTTP URL and legacy anon publishable key', () => {
    const env = validatePublicSupabaseEnv({
      [PUBLIC_SUPABASE_URL_VAR]: `  ${VALID_URL}  `,
      [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: `  ${VALID_KEY}  `,
    });
    expect(env.supabaseUrl).toBe(VALID_URL);
    expect(env.supabasePublishableKey).toBe(VALID_KEY);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('accepts a valid HTTPS Supabase-style URL', () => {
    const httpsUrl = 'https://abcdefghijklmnop.supabase.co';
    const env = validatePublicSupabaseEnv({
      [PUBLIC_SUPABASE_URL_VAR]: httpsUrl,
      [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_PUBLISHABLE,
    });
    expect(env.supabaseUrl).toBe(httpsUrl);
  });

  it('accepts a modern sb_publishable_ key', () => {
    const env = validatePublicSupabaseEnv({
      [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
      [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_PUBLISHABLE,
    });
    expect(env.supabasePublishableKey).toBe(VALID_PUBLISHABLE);
  });

  it('trims surrounding whitespace on both values', () => {
    const env = validatePublicSupabaseEnv({
      [PUBLIC_SUPABASE_URL_VAR]: ` \t${VALID_URL}\n `,
      [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: ` ${VALID_PUBLISHABLE} `,
    });
    expect(env.supabaseUrl).toBe(VALID_URL);
    expect(env.supabasePublishableKey).toBe(VALID_PUBLISHABLE);
  });

  it('rejects a missing URL with a useful error', () => {
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(PublicEnvError);
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('rejects a missing publishable key with a useful error', () => {
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('rejects empty and whitespace-only values', () => {
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: '',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);

    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: '   ',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);

    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: '',
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);

    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: '  \t  ',
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('rejects a malformed URL', () => {
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: 'not-a-url',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(/valid absolute URL/);
  });

  it('rejects an unsupported URL protocol', () => {
    try {
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: 'ftp://127.0.0.1:54321',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      });
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicEnvError);
      expect((error as PublicEnvError).variable).toBe(PUBLIC_SUPABASE_URL_VAR);
      expect(String(error)).toMatch(/http or https/i);
    }
  });

  it('rejects placeholder URL and key values', () => {
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: 'https://example-local.supabase.co',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(/placeholder/);

    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eazy-review-fake-anon-key-not-real',
      }),
    ).toThrow(/placeholder/);

    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: 'sb_publishable_your_project_key',
      }),
    ).toThrow(/placeholder/);
  });

  it('rejects service_role-shaped JWT claims without echoing credentials', () => {
    const adminJwt = encodeJwtPayload({
      role: 'service_role',
      iss: 'supabase',
    });
    try {
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: adminJwt,
      });
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicEnvError);
      expect((error as PublicEnvError).variable).toBe(
        PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      );
      expect(String(error)).toContain(PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR);
      expect(String(error)).toMatch(/service_role|secret/i);
      expect(String(error)).not.toContain(adminJwt);
      expect(String(error)).not.toContain('service_role","iss');
    }
  });

  it('does not put the full credential value in error messages', () => {
    const longInvalid =
      'not-a-valid-public-key-super-long-value_that_must_not_appear_in_errors_xyz123';
    try {
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: longInvalid,
      });
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicEnvError);
      expect(String(error)).toContain(PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR);
      expect(String(error)).not.toContain(longInvalid);
      expect(String(error)).not.toContain(
        'super-long-value_that_must_not_appear',
      );
    }
  });

  it('rejects secret-shaped administrative key material without echoing it', () => {
    // Intentionally not a modern sb_secret_ token so repo secret scanning stays
    // clean; still exercises the public-key shape rejection path.
    const notPublic =
      'sk_admin_lookalike_value_with_enough_length_to_look_sensitive_zzz';
    try {
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: notPublic,
      });
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(String(error)).toContain(PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR);
      expect(String(error)).not.toContain(notPublic);
    }
  });

  it('names the invalid variable on each rejection path', () => {
    try {
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: 'not-a-url',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      });
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicEnvError);
      expect((error as PublicEnvError).variable).toBe(PUBLIC_SUPABASE_URL_VAR);
    }

    try {
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: 'not-a-key',
      });
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PublicEnvError);
      expect((error as PublicEnvError).variable).toBe(
        PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      );
    }
  });
});

describe('getPublicEnv runtime path (process.env + module load)', () => {
  it('accepts valid process.env values on the default getPublicEnv path', () => {
    const loaded = loadPublicEnvModuleWithProcessEnv({
      url: `  ${VALID_URL}  `,
      key: `  ${VALID_KEY}  `,
    });
    try {
      const env = loaded.getPublicEnv();
      expect(env.supabaseUrl).toBe(VALID_URL);
      expect(env.supabasePublishableKey).toBe(VALID_KEY);
      expect(Object.isFrozen(env)).toBe(true);
      // Deterministic cache for the runtime bag.
      expect(loaded.getPublicEnv()).toBe(env);
    } finally {
      loaded.restore();
    }
  });

  it('fails clearly when process.env public values are missing', () => {
    const loaded = loadPublicEnvModuleWithProcessEnv({
      url: undefined,
      key: undefined,
    });
    try {
      expect(() => loaded.getPublicEnv()).toThrow(loaded.PublicEnvError);
      expect(() => loaded.getPublicEnv()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    } finally {
      loaded.restore();
    }
  });

  it('identifies the missing variable without echoing credential-shaped noise', () => {
    const longNoise =
      'not-a-valid-public-key-that-must-never-be-echoed_in_runtime_errors_xyz999';
    const loaded = loadPublicEnvModuleWithProcessEnv({
      url: VALID_URL,
      key: longNoise,
    });
    try {
      try {
        loaded.getPublicEnv();
        throw new Error('expected getPublicEnv to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(loaded.PublicEnvError);
        expect(String(error)).toContain(
          loaded.PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
        );
        expect(String(error)).not.toContain(longNoise);
      }
    } finally {
      loaded.restore();
    }
  });
});
