/**
 * Public Expo environment validation for Supabase client configuration.
 *
 * Only intentionally public values belong here. Never read or export
 * service_role, database passwords, JWT signing secrets, or management tokens.
 *
 * Expo requires static `process.env.EXPO_PUBLIC_*` references so Metro includes
 * them in the client bundle. Do not read those names through computed access
 * (`process.env[name]`) on the runtime path.
 */

export const PUBLIC_SUPABASE_URL_VAR = 'EXPO_PUBLIC_SUPABASE_URL';
export const PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR =
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY';

export type PublicSupabaseEnv = Readonly<{
  supabaseUrl: string;
  supabasePublishableKey: string;
}>;

export class PublicEnvError extends Error {
  readonly variable: string;
  readonly reason: string;

  constructor(variable: string, reason: string) {
    super(`${variable} is invalid: ${reason}`);
    this.name = 'PublicEnvError';
    this.variable = variable;
    this.reason = reason;
  }
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Private runtime bag built with static dot-notation access so Expo can
 * inline `EXPO_PUBLIC_*` values at module load. Immutable — tests exercise the
 * runtime path via `process.env` + `jest.resetModules()`, not by mutating this
 * object.
 */
const runtimePublicEnv: EnvSource = Object.freeze({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^https?:\/\/example(\.|-)/i,
  /example\.local/i,
  /example-local/i,
  /your[_-]?project/i,
  /your[_-]?supabase/i,
  /changeme/i,
  /replace[_-]?me/i,
  /todo/i,
  /placeholder/i,
  /xxx+/i,
  /<your/i,
  /not-real/i,
  /fake[-_]?(anon|key|publishable)/i,
  /^sb_publishable_your/i,
  /^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eazy-review-fake/i,
];

function readTrimmed(source: EnvSource, name: string): string | undefined {
  const raw = source[name];
  if (raw == null) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function assertValidSupabaseUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_URL_VAR,
      'must be a valid absolute URL (http or https)',
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_URL_VAR,
      'must use http or https',
    );
  }

  if (!parsed.hostname) {
    throw new PublicEnvError(PUBLIC_SUPABASE_URL_VAR, 'must include a hostname');
  }

  if (isPlaceholder(value) || isPlaceholder(parsed.hostname)) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_URL_VAR,
      'looks like a placeholder; set a real local or development project URL',
    );
  }
}

function assertValidPublishableKey(value: string): void {
  if (isPlaceholder(value)) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'looks like a placeholder; set the public publishable (or legacy anon) key',
    );
  }

  const looksLikePublishable = value.startsWith('sb_publishable_');
  const looksLikeJwt = value.startsWith('eyJ') && value.split('.').length === 3;
  if (!looksLikePublishable && !looksLikeJwt) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'must be a public sb_publishable_ key or a legacy anon JWT',
    );
  }

  const jwtPayload = looksLikeJwt ? tryDecodeJwtPayload(value) : null;

  if (looksLikeJwt && jwtPayload == null) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'must be a decodable legacy anon JWT',
    );
  }

  // Reject secret/admin key shapes without echoing the value.
  if (
    value.startsWith('sb_secret_') ||
    value.includes('service_role') ||
    jwtPayload?.role === 'service_role'
  ) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'must not be a secret or service_role credential',
    );
  }

  if (looksLikeJwt && jwtPayload?.role !== 'anon') {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'must be a legacy anon JWT',
    );
  }
}

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(normalized);
    }
    return decodeBase64WithoutAtob(normalized);
  } catch {
    return null;
  }
}

function decodeBase64WithoutAtob(base64: string): string | null {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return null;
  }

  let decoded = '';
  for (let index = 0; index < base64.length; index += 4) {
    const first = alphabet.indexOf(base64[index]);
    const second = alphabet.indexOf(base64[index + 1]);
    const third = base64[index + 2] === '=' ? 0 : alphabet.indexOf(base64[index + 2]);
    const fourth = base64[index + 3] === '=' ? 0 : alphabet.indexOf(base64[index + 3]);

    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      return null;
    }

    decoded += String.fromCharCode((first << 2) | (second >> 4));
    if (base64[index + 2] !== '=') {
      decoded += String.fromCharCode(((second & 15) << 4) | (third >> 2));
    }
    if (base64[index + 3] !== '=') {
      decoded += String.fromCharCode(((third & 3) << 6) | fourth);
    }
  }

  return decoded;
}

function decodeUtf8(binary: string): string | null {
  try {
    return decodeURIComponent(
      binary.replace(/[\s\S]/g, (character) =>
        `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`,
      ),
    );
  } catch {
    return null;
  }
}

function tryDecodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const binaryPayload = decodeBase64Url(parts[1]);
  const payload = binaryPayload == null ? null : decodeUtf8(binaryPayload);
  if (payload == null) {
    return null;
  }

  try {
    const claims: unknown = JSON.parse(payload);
    if (typeof claims !== 'object' || claims == null || Array.isArray(claims)) {
      return null;
    }
    return claims as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Validates public Supabase environment values.
 * Pass a source in tests; application runtime uses the private static bag.
 */
export function validatePublicSupabaseEnv(
  source: EnvSource,
): PublicSupabaseEnv {
  const supabaseUrl = readTrimmed(source, PUBLIC_SUPABASE_URL_VAR);
  if (supabaseUrl == null) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_URL_VAR,
      'is missing or empty after trim',
    );
  }
  assertValidSupabaseUrl(supabaseUrl);

  const supabasePublishableKey = readTrimmed(
    source,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
  );
  if (supabasePublishableKey == null) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'is missing or empty after trim',
    );
  }
  assertValidPublishableKey(supabasePublishableKey);

  return Object.freeze({
    supabaseUrl,
    supabasePublishableKey,
  });
}

let cachedEnv: PublicSupabaseEnv | undefined;

/**
 * Reads and validates public Expo env once per process for the runtime bag.
 * Throws PublicEnvError with the invalid variable name — never logs credential
 * values.
 *
 * When `source` is omitted, uses the private static-dot-notation runtime bag
 * Expo can inline. Injectable sources remain available for unit tests that
 * exercise validation without reloading the module.
 */
export function getPublicEnv(
  source: EnvSource = runtimePublicEnv,
): PublicSupabaseEnv {
  if (cachedEnv && source === runtimePublicEnv) {
    return cachedEnv;
  }
  const env = validatePublicSupabaseEnv(source);
  if (source === runtimePublicEnv) {
    cachedEnv = env;
  }
  return env;
}

/** Test-only: clear the process-env cache between cases. */
export function resetPublicEnvCacheForTests(): void {
  cachedEnv = undefined;
}
