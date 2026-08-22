import { corsHeaders } from '@supabase/supabase-js/cors';

export type DeleteCurrentUserCode =
  | 'invalid-request'
  | 'unauthorized'
  | 'reauthentication-required'
  | 'validation-unavailable'
  | 'method-not-allowed'
  | 'configuration-failure'
  | 'revocation-failed'
  | 'revocation-unconfirmed'
  | 'revoked-not-deleted'
  | 'revoked-delete-unconfirmed';

export type VerificationResult<T> =
  | { kind: 'verified'; value: T }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };

export type RevokeResult =
  | { kind: 'revoked' }
  | { kind: 'session-absent' }
  | { kind: 'rejected' }
  | { kind: 'unconfirmed' };

export type DeleteResult =
  | { kind: 'deleted' }
  | { kind: 'already-absent' }
  | { kind: 'unconfirmed' };

export type LookupResult =
  | { kind: 'present' }
  | { kind: 'absent' }
  | { kind: 'unavailable' };

export type AuthBoundary = {
  getUser(jwt: string): Promise<VerificationResult<{ id: string }>>;
  getClaims(jwt: string): Promise<VerificationResult<Record<string, unknown>>>;
  signOutGlobal(jwt: string): Promise<RevokeResult>;
  deleteUser(userId: string): Promise<DeleteResult>;
  getUserById(userId: string): Promise<LookupResult>;
};

export function jsonResponse(
  body: unknown,
  status: number,
  extra: HeadersInit = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'no-store',
      ...Object.fromEntries(new Headers(extra)),
    },
  });
}

export function newestFreshPasswordTimestamp(amr: unknown, now: number): number | null {
  if (!Array.isArray(amr)) return null;
  const timestamps = amr.flatMap((entry) => {
    if (entry == null || typeof entry !== 'object') return [];
    const value = entry as { method?: unknown; timestamp?: unknown };
    return value.method === 'password' &&
        typeof value.timestamp === 'number' && Number.isFinite(value.timestamp)
      ? [value.timestamp]
      : [];
  });
  if (timestamps.length === 0) return null;
  const newest = Math.max(...timestamps);
  const age = now - newest;
  return age >= -60 && age <= 300 ? newest : null;
}
