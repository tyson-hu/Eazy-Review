import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
  PUBLIC_SUPABASE_URL_VAR,
  PublicEnvError,
  resetPublicEnvCacheForTests,
  validatePublicSupabaseEnv,
} from '@/src/lib/env/publicEnv';

const VALID_URL = 'http://127.0.0.1:54321';
// Local Supabase demo anon JWT (public by design; role: anon). Not a secret.
const VALID_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const VALID_PUBLISHABLE = 'sb_publishable_local_dev_key_abcdefghijklmnop';

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
