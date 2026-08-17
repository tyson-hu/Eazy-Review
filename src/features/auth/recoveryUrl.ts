/**
 * Safe parsing of auth callback URLs for password recovery.
 *
 * Never log the full URL, access tokens, refresh tokens, or codes.
 */

export type AuthCallbackParams = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  error: string | null;
  errorCode: string | null;
};

export type AuthCallbackKind =
  | { kind: 'pkce'; code: string }
  | {
      kind: 'tokens';
      accessToken: string;
      refreshToken: string;
      type: string | null;
    }
  | { kind: 'error'; error: string; errorCode: string | null }
  | { kind: 'empty' };

function readQueryParam(url: string, key: string): string | null {
  try {
    const parsed = new URL(url);
    const fromSearch = parsed.searchParams.get(key);
    if (fromSearch) {
      return fromSearch;
    }
    // Hash fragment may carry tokens or codes (`#access_token=…&type=recovery`).
    const hash = parsed.hash.startsWith('#')
      ? parsed.hash.slice(1)
      : parsed.hash;
    if (!hash) {
      return null;
    }
    const hashParams = new URLSearchParams(hash);
    return hashParams.get(key);
  } catch {
    return null;
  }
}

/**
 * Extract auth callback parameters without retaining the raw URL.
 * Returns only discrete fields needed for exchange/setSession.
 */
export function parseAuthCallbackParams(url: string): AuthCallbackParams {
  return {
    code: readQueryParam(url, 'code'),
    accessToken: readQueryParam(url, 'access_token'),
    refreshToken: readQueryParam(url, 'refresh_token'),
    type: readQueryParam(url, 'type'),
    error: readQueryParam(url, 'error') ?? readQueryParam(url, 'error_description'),
    errorCode:
      readQueryParam(url, 'error_code') ?? readQueryParam(url, 'error_description'),
  };
}

/**
 * Classify callback parameters for recovery handling.
 * Does not perform network calls.
 */
export function classifyAuthCallback(
  params: AuthCallbackParams,
): AuthCallbackKind {
  if (params.error || params.errorCode) {
    return {
      kind: 'error',
      error: params.error ?? 'auth_callback_error',
      errorCode: params.errorCode,
    };
  }

  if (params.code) {
    return { kind: 'pkce', code: params.code };
  }

  if (params.accessToken && params.refreshToken) {
    return {
      kind: 'tokens',
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      type: params.type,
    };
  }

  return { kind: 'empty' };
}

/**
 * True when the URL looks like an auth deep-link worth processing.
 * Heuristic only — never log the URL content.
 */
export function isAuthCallbackUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const lower = url.toLowerCase();
  // Path target or auth fragment/query markers.
  if (
    lower.includes('auth/reset-password') ||
    lower.includes('type=recovery') ||
    lower.includes('access_token=') ||
    lower.includes('refresh_token=') ||
    /[?&#]code=/.test(lower) ||
    lower.includes('error_code=') ||
    lower.includes('error=')
  ) {
    return true;
  }
  return false;
}

/**
 * Safe diagnostic label for tests/logs (never includes secrets).
 */
export function authCallbackDiagnosticLabel(params: AuthCallbackParams): string {
  if (params.error || params.errorCode) {
    return 'error';
  }
  if (params.code) {
    return 'pkce';
  }
  if (params.accessToken && params.refreshToken) {
    return params.type === 'recovery' ? 'tokens-recovery' : 'tokens';
  }
  return 'empty';
}
