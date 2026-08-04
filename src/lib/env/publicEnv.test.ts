import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
  PUBLIC_SUPABASE_URL_VAR,
  PublicEnvError,
  getPublicEnv,
  resetPublicEnvCacheForTests,
  runtimePublicEnv,
  validatePublicSupabaseEnv,
} from '@/src/lib/env/publicEnv';

const VALID_URL = 'http://127.0.0.1:54321';
// Local Supabase demo anon JWT (public by design; role: anon). Not a secret.
const VALID_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const VALID_PUBLISHABLE = 'sb_publishable_local_dev_key_abcdefghijklmnop';

// Synthetic service-role-shaped JWT for rejection tests only. Not a real credential.
function encodeJwtPayload(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = globalThis.btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64}.sig`;
}

afterEach(() => {
  resetPublicEnvCacheForTests();
});

describe('validatePublicSupabaseEnv', () => {
  it('accepts a valid URL and legacy anon publishable key', () => {
    const env = validatePublicSupabaseEnv({
      [PUBLIC_SUPABASE_URL_VAR]: `  ${VALID_URL}  `,
      [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: `  ${VALID_KEY}  `,
    });
    expect(env.supabaseUrl).toBe(VALID_URL);
    expect(env.supabasePublishableKey).toBe(VALID_KEY);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('accepts a modern sb_publishable_ key', () => {
    const env = validatePublicSupabaseEnv({
      [PUBLIC_SUPABASE_URL_VAR]: VALID_URL,
      [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_PUBLISHABLE,
    });
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

  it('rejects an invalid URL', () => {
    expect(() =>
      validatePublicSupabaseEnv({
        [PUBLIC_SUPABASE_URL_VAR]: 'not-a-url',
        [PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR]: VALID_KEY,
      }),
    ).toThrow(/valid absolute URL/);
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
});

describe('runtimePublicEnv static source', () => {
  it('exposes EXPO_PUBLIC keys resolved through static process.env.dot access', () => {
    expect(Object.keys(runtimePublicEnv).sort()).toEqual(
      [
        PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
        PUBLIC_SUPABASE_URL_VAR,
      ].sort(),
    );
    // Shape contract: values are process.env mirrors (string | undefined).
    expect(
      runtimePublicEnv.EXPO_PUBLIC_SUPABASE_URL === undefined ||
        typeof runtimePublicEnv.EXPO_PUBLIC_SUPABASE_URL === 'string',
    ).toBe(true);
    expect(
      runtimePublicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY === undefined ||
        typeof runtimePublicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
          'string',
    ).toBe(true);
  });

  it('uses runtimePublicEnv as the getPublicEnv default path', () => {
    const originalUrl = runtimePublicEnv.EXPO_PUBLIC_SUPABASE_URL;
    const originalKey = runtimePublicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    // Mutate the exported bag so the real default source is exercised without
    // relying on a manually supplied validate(...) object alone.
    (runtimePublicEnv as { EXPO_PUBLIC_SUPABASE_URL?: string }).EXPO_PUBLIC_SUPABASE_URL =
      VALID_URL;
    (
      runtimePublicEnv as {
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
      }
    ).EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = VALID_KEY;

    try {
      const env = getPublicEnv();
      expect(env.supabaseUrl).toBe(VALID_URL);
      expect(env.supabasePublishableKey).toBe(VALID_KEY);
    } finally {
      (
        runtimePublicEnv as { EXPO_PUBLIC_SUPABASE_URL?: string }
      ).EXPO_PUBLIC_SUPABASE_URL = originalUrl;
      (
        runtimePublicEnv as {
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
        }
      ).EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });

  it('fails clearly on the runtime path when values are missing', () => {
    const originalUrl = runtimePublicEnv.EXPO_PUBLIC_SUPABASE_URL;
    const originalKey = runtimePublicEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    (
      runtimePublicEnv as { EXPO_PUBLIC_SUPABASE_URL?: string }
    ).EXPO_PUBLIC_SUPABASE_URL = undefined;
    (
      runtimePublicEnv as {
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
      }
    ).EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = undefined;

    try {
      expect(() => getPublicEnv()).toThrow(PublicEnvError);
      expect(() => getPublicEnv()).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    } finally {
      (
        runtimePublicEnv as { EXPO_PUBLIC_SUPABASE_URL?: string }
      ).EXPO_PUBLIC_SUPABASE_URL = originalUrl;
      (
        runtimePublicEnv as {
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
        }
      ).EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
  });
});
