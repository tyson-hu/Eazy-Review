/**
 * Public Expo environment validation for Supabase client configuration.
 *
 * Only intentionally public values belong here. Never read or export
 * service_role, database passwords, JWT signing secrets, or management tokens.
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

type EnvSource = Record<string, string | undefined>;

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

  // Reject secret/admin key shapes without echoing the value.
  if (
    value.startsWith('sb_secret_') ||
    value.includes('service_role') ||
    /role["']?\s*:\s*["']?service_role/i.test(tryDecodeJwtPayload(value) ?? '')
  ) {
    throw new PublicEnvError(
      PUBLIC_SUPABASE_PUBLISHABLE_KEY_VAR,
      'must not be a secret or service_role credential',
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
    return null;
  } catch {
    return null;
  }
}

function tryDecodeJwtPayload(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  return decodeBase64Url(parts[1]);
}

/**
 * Validates public Supabase environment values.
 * Pass a source in tests; production code uses `process.env` via `getPublicEnv`.
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
 * Reads and validates public Expo env once per process. Throws PublicEnvError
 * with the invalid variable name — never logs credential values.
 */
export function getPublicEnv(
  source: EnvSource = process.env as EnvSource,
): PublicSupabaseEnv {
  if (cachedEnv && source === (process.env as EnvSource)) {
    return cachedEnv;
  }
  const env = validatePublicSupabaseEnv(source);
  if (source === (process.env as EnvSource)) {
    cachedEnv = env;
  }
  return env;
}

/** Test-only: clear the process-env cache between cases. */
export function resetPublicEnvCacheForTests(): void {
  cachedEnv = undefined;
}
