import type { AuthBoundary } from './contracts.ts';

export type SupabaseAuthAdminClient = {
  auth: {
    getUser(jwt: string): Promise<unknown>;
    getClaims(jwt: string): Promise<unknown>;
    admin: {
      signOut(jwt: string, scope: 'global'): Promise<unknown>;
      deleteUser(id: string, shouldSoftDelete: false): Promise<unknown>;
      getUserById(id: string): Promise<unknown>;
    };
  };
};

type SdkResult = { data: unknown; error: unknown };

function sdkResult(value: unknown): SdkResult | null {
  if (value == null || typeof value !== 'object') return null;
  const result = value as { data?: unknown; error?: unknown };
  if (!('error' in result)) return null;
  return { data: result.data, error: result.error };
}

function errorField(error: unknown, field: 'name' | 'code'): string | undefined {
  if (error == null || typeof error !== 'object') return undefined;
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : undefined;
}

function errorStatus(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object') return undefined;
  const value = (error as Record<string, unknown>).status;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stableInvalid(error: unknown): boolean {
  const status = errorStatus(error);
  return status != null &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 425 &&
    status !== 429;
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function createSupabaseAuthAdminAdapter(
  client: SupabaseAuthAdminClient,
): AuthBoundary {
  return {
    async getUser(jwt) {
      try {
        const result = sdkResult(await client.auth.getUser(jwt));
        if (result == null) return { kind: 'unavailable' };
        if (result.error != null) {
          return stableInvalid(result.error) ? { kind: 'invalid' } : { kind: 'unavailable' };
        }
        const data = record(result.data);
        const user = record(data?.user);
        return typeof user?.id === 'string' && user.id.length > 0
          ? { kind: 'verified', value: { id: user.id } }
          : { kind: 'unavailable' };
      } catch {
        return { kind: 'unavailable' };
      }
    },
    async getClaims(jwt) {
      try {
        const result = sdkResult(await client.auth.getClaims(jwt));
        if (result == null) return { kind: 'unavailable' };
        if (result.error != null) {
          return stableInvalid(result.error) ? { kind: 'invalid' } : { kind: 'unavailable' };
        }
        const data = record(result.data);
        const claims = record(data?.claims);
        return claims == null ? { kind: 'unavailable' } : { kind: 'verified', value: claims };
      } catch {
        return { kind: 'unavailable' };
      }
    },
    async signOutGlobal(jwt) {
      try {
        const result = sdkResult(await client.auth.admin.signOut(jwt, 'global'));
        if (result == null) return { kind: 'unconfirmed' };
        if (result.error == null) return { kind: 'revoked' };
        if (
          errorField(result.error, 'name') === 'AuthSessionMissingError' ||
          errorField(result.error, 'code') === 'session_not_found'
        ) {
          return { kind: 'session-absent' };
        }
        const status = errorStatus(result.error);
        return status === 400 || status === 422 ? { kind: 'rejected' } : { kind: 'unconfirmed' };
      } catch {
        return { kind: 'unconfirmed' };
      }
    },
    async deleteUser(userId) {
      try {
        const result = sdkResult(await client.auth.admin.deleteUser(userId, false));
        if (result == null) return { kind: 'unconfirmed' };
        if (result.error == null) return { kind: 'deleted' };
        return errorField(result.error, 'code') === 'user_not_found' &&
            stableInvalid(result.error)
          ? { kind: 'already-absent' }
          : { kind: 'unconfirmed' };
      } catch {
        return { kind: 'unconfirmed' };
      }
    },
    async getUserById(userId) {
      try {
        const result = sdkResult(await client.auth.admin.getUserById(userId));
        if (result == null) return { kind: 'unavailable' };
        if (result.error != null) {
          return errorField(result.error, 'code') === 'user_not_found' &&
              stableInvalid(result.error)
            ? { kind: 'absent' }
            : { kind: 'unavailable' };
        }
        const data = record(result.data);
        const user = record(data?.user);
        return typeof user?.id === 'string' && user.id.length > 0
          ? { kind: 'present' }
          : { kind: 'unavailable' };
      } catch {
        return { kind: 'unavailable' };
      }
    },
  };
}
