import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import {
  emitPrincipalDeletionGuardChange,
  preflightAuthStorageCoordination,
  runSupabaseAuthStorageOperation,
  subscribePrincipalDeletionGuardChanges as subscribeGuardChanges,
} from '@/src/lib/supabase/authCoordination';

/**
 * Task 14/16 auth session storage adapter for Supabase Auth.
 *
 * HUMAN ACCEPTED (Task 16 MVP tradeoff — not final product-wide acceptance):
 * keep AsyncStorage for session persistence despite being unencrypted at rest.
 *
 * - Access and refresh tokens are sensitive authentication material.
 * - AsyncStorage is not encrypted at rest on device.
 * - Profile display data does not drive this decision; token storage does.
 * - Device compromise / local storage inspection remain relevant risks.
 * - Server-side RLS remains mandatory regardless of local encryption.
 * - A SecureStore lifecycle experiment was proposed but explicitly waived by
 *   the human for Task 16. Do not claim that experiment was performed, and do
 *   not claim Expo enforces a universal hard 2048-byte SecureStore limit as the
 *   Task 16 rejection reason.
 * - SecureStore / platform-secure storage may be reconsidered during later
 *   security/release hardening if a simple, tested Supabase session-storage path
 *   is available without fragile chunking or custom encryption.
 * - Static web export must remain valid; AsyncStorage covers RN + web with
 *   the existing SSR-safe no-window guard.
 *
 * Values are stored as plain strings. Callers (supabase-js) own JSON encoding;
 * this adapter does not double-encode. Storage errors propagate to the caller.
 * Key names may appear in __DEV__ diagnostics; token or session body content
 * never does.
 */

export type AuthStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * Node SSR (Expo static web export) has no DOM `window`. Client web and React
 * Native runtimes define it, so session persistence can use AsyncStorage.
 * During SSR, treat storage as empty and no-op so provider bootstrap can
 * construct the Supabase client without crashing.
 */
export function isAuthStorageRuntimeAvailable(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Builds an auth storage adapter against an AsyncStorage-compatible backend.
 * Production uses the package singleton; tests inject a mock store.
 */
export function createAuthStorageAdapter(
  store: Pick<
    typeof AsyncStorage,
    'getItem' | 'setItem' | 'removeItem'
  > = AsyncStorage,
  options: { skipWhenNoWindow?: boolean } = {},
): AuthStorageAdapter {
  // Injected test stores always run; the production singleton guards SSR.
  const skipWhenNoWindow = options.skipWhenNoWindow === true;

  return {
    async getItem(key) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) {
        return null;
      }
      try {
        return await store.getItem(key);
      } catch (error) {
        if (__DEV__) {
          console.warn('[authStorage] getItem failed');
        }
        throw error;
      }
    },
    async setItem(key, value) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) {
        return;
      }
      try {
        // Store the string as-is; do not JSON.stringify again.
        await store.setItem(key, value);
      } catch (error) {
        if (__DEV__) {
          console.warn('[authStorage] setItem failed');
        }
        throw error;
      }
    },
    async removeItem(key) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) {
        return;
      }
      try {
        await store.removeItem(key);
      } catch (error) {
        if (__DEV__) {
          console.warn('[authStorage] removeItem failed');
        }
        throw error;
      }
    },
  };
}

export type PrincipalBoundSessionCleanup =
  | {
      kind: 'removed-a' | 'already-empty';
      companionCleanup: 'removed' | 'unconfirmed';
    }
  | { kind: 'quarantined-unavailable' }
  | { kind: 'stale-attempt' }
  | { kind: 'preserved-guarded'; principalId: string }
  | { kind: 'preserved-winner'; principalId: string; session: Session };

export type PrincipalDeletionGuardArmResult =
  | { kind: 'armed'; guardRevision: number }
  | { kind: 'guard-busy' }
  | { kind: 'unavailable' }
  | { kind: 'quarantine-unconfirmed' }
  | { kind: 'preserved-guarded'; principalId: string }
  | { kind: 'preserved-winner'; principalId: string; session: Session };

export type PrincipalDeletionGuardDisarmResult =
  | { kind: 'disarmed' }
  | { kind: 'unconfirmed' }
  | { kind: 'stale-attempt' }
  | { kind: 'preserved-guarded'; principalId: string }
  | { kind: 'preserved-winner'; principalId: string; session: Session };

export type PrincipalDeletionGuardDispatchResult =
  | 'pending'
  | 'stale-attempt'
  | 'unconfirmed'
  | { kind: 'signed-out' }
  | { kind: 'preserved-guarded'; principalId: string }
  | { kind: 'preserved-winner'; principalId: string; session: Session };

export type GuardedAuthStorageReconciliation =
  | { kind: 'empty'; guardedPrincipalIds: string[] }
  | { kind: 'unavailable' }
  | {
      kind: 'blocked';
      principalId: string;
      guardRevision: number;
      guardState: PrincipalDeletionGuardRecord['state'];
    }
  | {
      kind: 'allowed-session';
      principalId: string;
      session: Session;
      sessionId: string | null;
      guardRevision: number | null;
    };

type RawAuthStore = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

export type PrincipalBoundAuthStorageOptions = {
  now?: () => number;
  runStorageOperation?: <T>(storageKey: string, operation: () => Promise<T>) => Promise<T>;
  preflight?: (storageKey: string) => Promise<void>;
  emitGuardChange?: (storageKey: string) => void;
  subscribeGuardChanges?: (storageKey: string, onChange: () => void) => () => void;
  skipWhenNoWindow?: boolean;
};

const DELETION_GUARD_LEASE_MS = 5 * 60_000;

type GuardPredecessor = {
  state: 'settled';
  allowedSessionId: string | null;
};

type PrincipalDeletionGuardRecord = {
  revision: number;
  state: 'preparing' | 'pending' | 'settled';
  leaseExpiresAt: number;
  principalId: string;
  allowedSessionId: string | null;
  predecessor: GuardPredecessor | null;
};

type PrincipalDeletionGuardStore = {
  version: 1;
  nextRevision: number;
  records: PrincipalDeletionGuardRecord[];
};

type ParsedStoredSession =
  | { kind: 'empty' }
  | { kind: 'malformed' }
  | {
      kind: 'session';
      principalId: string;
      sessionId: string | null;
      session: Session;
    };

type PreservedStoredSession =
  | { kind: 'preserved-guarded'; principalId: string }
  | { kind: 'preserved-winner'; principalId: string; session: Session };

function deletionGuardKey(storageKey: string): string {
  return `${storageKey}-eazy-review-deletion-guard`;
}

function companionUserKey(storageKey: string): string {
  return `${storageKey}-user`;
}

function primaryStorageKey(key: string): string {
  return key.endsWith('-user') ? key.slice(0, -'-user'.length) : key;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseGuardStore(raw: string | null): PrincipalDeletionGuardStore | null {
  if (raw == null) {
    return { version: 1, nextRevision: 1, records: [] };
  }
  try {
    const parsed = asRecord(JSON.parse(raw));
    if (
      parsed?.version !== 1 ||
      !Number.isSafeInteger(parsed.nextRevision) ||
      (parsed.nextRevision as number) < 1 ||
      !Array.isArray(parsed.records)
    ) {
      return null;
    }
    const records: PrincipalDeletionGuardRecord[] = [];
    const principals = new Set<string>();
    for (const candidate of parsed.records) {
      const record = asRecord(candidate);
      if (
        record == null ||
        !Number.isSafeInteger(record.revision) ||
        (record.revision as number) < 1 ||
        (record.state !== 'preparing' &&
          record.state !== 'pending' &&
          record.state !== 'settled') ||
        typeof record.leaseExpiresAt !== 'number' ||
        !Number.isFinite(record.leaseExpiresAt) ||
        typeof record.principalId !== 'string' ||
        record.principalId.length === 0 ||
        (record.allowedSessionId !== null &&
          (typeof record.allowedSessionId !== 'string' ||
            record.allowedSessionId.length === 0)) ||
        principals.has(record.principalId)
      ) {
        return null;
      }
      let predecessor: GuardPredecessor | null = null;
      if (record.predecessor != null) {
        const value = asRecord(record.predecessor);
        if (
          value?.state !== 'settled' ||
          (value.allowedSessionId !== null &&
            (typeof value.allowedSessionId !== 'string' ||
              value.allowedSessionId.length === 0))
        ) {
          return null;
        }
        predecessor = {
          state: 'settled',
          allowedSessionId: value.allowedSessionId as string | null,
        };
      }
      principals.add(record.principalId);
      records.push({
        revision: record.revision as number,
        state: record.state,
        leaseExpiresAt: record.leaseExpiresAt,
        principalId: record.principalId,
        allowedSessionId: record.allowedSessionId as string | null,
        predecessor,
      });
    }
    return {
      version: 1,
      nextRevision: parsed.nextRevision as number,
      records,
    };
  } catch {
    return null;
  }
}

function decodeSessionIdentity(accessToken: string): {
  sub: string;
  sessionId: string | null;
} | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims = asRecord(JSON.parse(atob(padded)));
    if (typeof claims?.sub !== 'string' || claims.sub.length === 0) return null;
    return {
      sub: claims.sub,
      sessionId:
        typeof claims.session_id === 'string' && claims.session_id.length > 0
          ? claims.session_id
          : null,
    };
  } catch {
    return null;
  }
}

function parseStoredSession(raw: string | null): ParsedStoredSession {
  if (raw == null) return { kind: 'empty' };
  try {
    const parsed = asRecord(JSON.parse(raw));
    const user = asRecord(parsed?.user);
    if (
      parsed == null ||
      typeof parsed.access_token !== 'string' ||
      parsed.access_token.length === 0 ||
      typeof parsed.refresh_token !== 'string' ||
      parsed.refresh_token.length === 0 ||
      typeof user?.id !== 'string' ||
      user.id.length === 0
    ) {
      return { kind: 'malformed' };
    }
    const identity = decodeSessionIdentity(parsed.access_token);
    const sessionId = identity?.sub === user.id ? identity.sessionId : null;
    return {
      kind: 'session',
      principalId: user.id,
      sessionId,
      session: parsed as unknown as Session,
    };
  } catch {
    return { kind: 'malformed' };
  }
}

function sameStoredSessionSnapshot(
  actual: Extract<ParsedStoredSession, { kind: 'session' }>,
  expected: Extract<ParsedStoredSession, { kind: 'session' }>,
): boolean {
  return actual.principalId === expected.principalId &&
    actual.sessionId === expected.sessionId &&
    actual.session.access_token === expected.session.access_token &&
    actual.session.refresh_token === expected.session.refresh_token;
}

function allocateRevision(store: PrincipalDeletionGuardStore): number {
  const revision = store.nextRevision;
  store.nextRevision += 1;
  return revision;
}

function normalizeExpiredPreparing(
  store: PrincipalDeletionGuardStore,
  now: number,
): boolean {
  let changed = false;
  const records: PrincipalDeletionGuardRecord[] = [];
  for (const record of store.records) {
    if (record.state !== 'preparing' || record.leaseExpiresAt > now) {
      records.push(record);
      continue;
    }
    changed = true;
    if (record.predecessor != null) {
      records.push({
        revision: allocateRevision(store),
        state: 'settled',
        leaseExpiresAt: 0,
        principalId: record.principalId,
        allowedSessionId: record.predecessor.allowedSessionId,
        predecessor: null,
      });
    }
  }
  if (changed) store.records = records;
  return changed;
}

function recordFor(
  store: PrincipalDeletionGuardStore,
  principalId: string,
): PrincipalDeletionGuardRecord | undefined {
  return store.records.find((record) => record.principalId === principalId);
}

function samePredecessor(
  actual: GuardPredecessor | null,
  expected: GuardPredecessor | null,
): boolean {
  return actual?.state === expected?.state &&
    actual?.allowedSessionId === expected?.allowedSessionId;
}

function sameGuardRecord(
  actual: PrincipalDeletionGuardRecord | undefined,
  expected: PrincipalDeletionGuardRecord,
): boolean {
  return actual?.revision === expected.revision &&
    actual.state === expected.state &&
    actual.leaseExpiresAt === expected.leaseExpiresAt &&
    actual.principalId === expected.principalId &&
    actual.allowedSessionId === expected.allowedSessionId &&
    samePredecessor(actual.predecessor, expected.predecessor);
}

function sessionAllowedByGuard(
  store: PrincipalDeletionGuardStore,
  parsed: Extract<ParsedStoredSession, { kind: 'session' }>,
): boolean {
  const guard = recordFor(store, parsed.principalId);
  return guard == null ||
    (parsed.sessionId != null && guard.allowedSessionId === parsed.sessionId);
}

export function createPrincipalBoundAuthStorage(
  store: RawAuthStore,
  options: PrincipalBoundAuthStorageOptions = {},
) {
  const now = options.now ?? (() => Date.now());
  const runStorageOperation = options.runStorageOperation ??
    runSupabaseAuthStorageOperation;
  const preflightCoordination = options.preflight ??
    preflightAuthStorageCoordination;
  const emitGuardChange = options.emitGuardChange ??
    emitPrincipalDeletionGuardChange;
  const skipWhenNoWindow = options.skipWhenNoWindow === true;

  const withStorage = <T>(
    storageKey: string,
    operation: () => Promise<T>,
  ): Promise<T> => runStorageOperation(storageKey, operation);

  const writeStore = async (
    storageKey: string,
    guardStore: PrincipalDeletionGuardStore,
  ): Promise<void> => {
    await store.setItem(deletionGuardKey(storageKey), JSON.stringify(guardStore));
  };

  const readNormalizedStore = async (
    storageKey: string,
  ): Promise<PrincipalDeletionGuardStore | null> => {
    const guardStore = parseGuardStore(
      await store.getItem(deletionGuardKey(storageKey)),
    );
    if (guardStore == null) return null;
    if (normalizeExpiredPreparing(guardStore, now())) {
      await writeStore(storageKey, guardStore);
      emitGuardChange(storageKey);
    }
    return guardStore;
  };

  const classifyPreserved = (
    guardStore: PrincipalDeletionGuardStore,
    parsed: Extract<ParsedStoredSession, { kind: 'session' }>,
  ): PreservedStoredSession => {
    return sessionAllowedByGuard(guardStore, parsed)
      ? {
          kind: 'preserved-winner',
          principalId: parsed.principalId,
          session: parsed.session,
        }
      : { kind: 'preserved-guarded', principalId: parsed.principalId };
  };

  const reconcileParsedSession = (
    guardStore: PrincipalDeletionGuardStore,
    parsed: ParsedStoredSession,
  ): GuardedAuthStorageReconciliation => {
    if (parsed.kind === 'empty') {
      return {
        kind: 'empty',
        guardedPrincipalIds: guardStore.records.map(
          (record) => record.principalId,
        ),
      };
    }
    if (parsed.kind === 'malformed') return { kind: 'unavailable' };
    const guard = recordFor(guardStore, parsed.principalId);
    if (sessionAllowedByGuard(guardStore, parsed)) {
      return {
        kind: 'allowed-session',
        principalId: parsed.principalId,
        session: parsed.session,
        sessionId: parsed.sessionId,
        guardRevision: guard?.revision ?? null,
      };
    }
    if (guard == null) return { kind: 'unavailable' };
    return {
      kind: 'blocked',
      principalId: parsed.principalId,
      guardRevision: guard.revision,
      guardState: guard.state,
    };
  };

  const adapter: AuthStorageAdapter = {
    async getItem(key) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) return null;
      try {
        const storageKey = primaryStorageKey(key);
        return await withStorage(storageKey, async () => {
          const raw = await store.getItem(key);
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return null;
          const parsed = parseStoredSession(raw);
          if (
            parsed.kind === 'session' &&
            !sessionAllowedByGuard(guardStore, parsed)
          ) {
            return null;
          }
          return raw;
        });
      } catch (error) {
        if (__DEV__) console.warn('[authStorage] getItem failed');
        throw error;
      }
    },
    async setItem(key, value) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) return;
      try {
        const storageKey = primaryStorageKey(key);
        await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return;
          const parsed = parseStoredSession(value);
          if (
            parsed.kind === 'session' &&
            !sessionAllowedByGuard(guardStore, parsed)
          ) {
            return;
          }
          await store.setItem(key, value);
        });
      } catch (error) {
        if (__DEV__) console.warn('[authStorage] setItem failed');
        throw error;
      }
    },
    async removeItem(key) {
      if (skipWhenNoWindow && !isAuthStorageRuntimeAvailable()) return;
      try {
        const storageKey = primaryStorageKey(key);
        await withStorage(storageKey, async () => {
          const guardRaw = await store.getItem(deletionGuardKey(storageKey));
          if (guardRaw != null) {
            const guardStore = parseGuardStore(guardRaw);
            if (guardStore == null || guardStore.records.length > 0) return;
          }
          await store.removeItem(key);
        });
      } catch (error) {
        if (__DEV__) console.warn('[authStorage] removeItem failed');
        throw error;
      }
    },
  };

  return {
    adapter,
    preflight: async (
      storageKey: string,
      principalId: string,
    ): Promise<'ready' | 'guard-busy'> => {
      await preflightCoordination(storageKey);
      return await withStorage(storageKey, async () => {
        const guardStore = await readNormalizedStore(storageKey);
        if (guardStore == null) {
          throw new Error('Auth storage is unavailable.');
        }
        const existing = recordFor(guardStore, principalId);
        return existing?.state === 'preparing' || existing?.state === 'pending'
          ? 'guard-busy'
          : 'ready';
      });
    },
    arm: async (
      storageKey: string,
      principalId: string,
    ): Promise<PrincipalDeletionGuardArmResult> => {
      let writeAttempted = false;
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return { kind: 'unavailable' } as const;
          const parsed = parseStoredSession(await store.getItem(storageKey));
          if (parsed.kind !== 'session') return { kind: 'unavailable' } as const;
          if (parsed.principalId !== principalId) {
            return classifyPreserved(guardStore, parsed);
          }
          const existing = recordFor(guardStore, principalId);
          if (existing?.state === 'preparing' || existing?.state === 'pending') {
            return { kind: 'guard-busy' } as const;
          }
          const predecessor: GuardPredecessor | null = existing?.state === 'settled'
            ? {
                state: 'settled',
                allowedSessionId: existing.allowedSessionId,
              }
            : null;
          const revision = allocateRevision(guardStore);
          const nextRecord: PrincipalDeletionGuardRecord = {
            revision,
            state: 'preparing',
            leaseExpiresAt: now() + DELETION_GUARD_LEASE_MS,
            principalId,
            allowedSessionId: null,
            predecessor,
          };
          guardStore.records = [
            ...guardStore.records.filter((record) => record.principalId !== principalId),
            nextRecord,
          ];
          writeAttempted = true;
          await writeStore(storageKey, guardStore);
          const readback = parseGuardStore(
            await store.getItem(deletionGuardKey(storageKey)),
          );
          const confirmed = readback == null ? undefined : recordFor(readback, principalId);
          if (!sameGuardRecord(confirmed, nextRecord)) {
            return { kind: 'quarantine-unconfirmed' } as const;
          }
          return { kind: 'armed', guardRevision: revision } as const;
        });
        if (
          result.kind === 'armed' ||
          result.kind === 'quarantine-unconfirmed'
        ) {
          emitGuardChange(storageKey);
        }
        return result;
      } catch {
        if (writeAttempted) {
          emitGuardChange(storageKey);
          return { kind: 'quarantine-unconfirmed' };
        }
        return { kind: 'unavailable' };
      }
    },
    markDispatched: async (
      storageKey: string,
      principalId: string,
      guardRevision: number,
    ): Promise<PrincipalDeletionGuardDispatchResult> => {
      let writeAttempted = false;
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return 'unconfirmed' as const;
          const record = recordFor(guardStore, principalId);
          if (
            record?.revision !== guardRevision ||
            record.state !== 'preparing'
          ) {
            return 'stale-attempt' as const;
          }
          const stored = parseStoredSession(await store.getItem(storageKey));
          if (stored.kind === 'malformed') return 'unconfirmed' as const;
          if (stored.kind === 'empty') return { kind: 'signed-out' } as const;
          if (stored.principalId !== principalId) {
            return classifyPreserved(guardStore, stored);
          }
          if (stored.sessionId == null) return 'unconfirmed' as const;
          record.state = 'pending';
          record.leaseExpiresAt = now() + DELETION_GUARD_LEASE_MS;
          const expectedRecord: PrincipalDeletionGuardRecord = {
            ...record,
            predecessor: record.predecessor == null
              ? null
              : { ...record.predecessor },
          };
          writeAttempted = true;
          await writeStore(storageKey, guardStore);
          const readback = parseGuardStore(
            await store.getItem(deletionGuardKey(storageKey)),
          );
          const confirmed = readback == null ? undefined : recordFor(readback, principalId);
          return sameGuardRecord(confirmed, expectedRecord)
            ? 'pending' as const
            : 'unconfirmed' as const;
        });
        if (result === 'pending' || result === 'unconfirmed') {
          emitGuardChange(storageKey);
        }
        return result;
      } catch {
        if (writeAttempted) emitGuardChange(storageKey);
        return 'unconfirmed';
      }
    },
    settleGuard: async (
      storageKey: string,
      principalId: string,
      guardRevision: number,
    ): Promise<'settled' | 'stale-attempt' | 'unconfirmed'> => {
      let writeAttempted = false;
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return 'unconfirmed' as const;
          const record = recordFor(guardStore, principalId);
          if (
            record?.revision !== guardRevision ||
            record.state !== 'pending'
          ) {
            return 'stale-attempt' as const;
          }
          record.state = 'settled';
          record.leaseExpiresAt = 0;
          record.allowedSessionId = null;
          record.predecessor = null;
          const expectedRecord: PrincipalDeletionGuardRecord = { ...record };
          writeAttempted = true;
          await writeStore(storageKey, guardStore);
          const readback = parseGuardStore(
            await store.getItem(deletionGuardKey(storageKey)),
          );
          const confirmed = readback == null ? undefined : recordFor(readback, principalId);
          return sameGuardRecord(confirmed, expectedRecord)
            ? 'settled' as const
            : 'unconfirmed' as const;
        });
        if (result === 'settled' || result === 'unconfirmed') {
          emitGuardChange(storageKey);
        }
        return result;
      } catch {
        if (writeAttempted) emitGuardChange(storageKey);
        return 'unconfirmed';
      }
    },
    disarm: async (
      storageKey: string,
      principalId: string,
      guardRevision: number,
    ): Promise<PrincipalDeletionGuardDisarmResult> => {
      let writeAttempted = false;
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return { kind: 'unconfirmed' } as const;
          const owned = recordFor(guardStore, principalId);
          if (owned?.revision !== guardRevision) {
            return { kind: 'stale-attempt' } as const;
          }
          if (owned.state === 'settled') {
            return { kind: 'stale-attempt' } as const;
          }
          const parsed = parseStoredSession(await store.getItem(storageKey));
          if (parsed.kind === 'empty' || parsed.kind === 'malformed') {
            return { kind: 'unconfirmed' } as const;
          }
          if (parsed.kind === 'session' && parsed.principalId !== principalId) {
            return classifyPreserved(guardStore, parsed);
          }
          guardStore.records = guardStore.records.filter(
            (record) => record.principalId !== principalId,
          );
          let restoredRecord: PrincipalDeletionGuardRecord | null = null;
          if (owned.predecessor != null) {
            restoredRecord = {
              revision: allocateRevision(guardStore),
              state: 'settled',
              leaseExpiresAt: 0,
              principalId,
              allowedSessionId: owned.predecessor.allowedSessionId,
              predecessor: null,
            };
            guardStore.records.push(restoredRecord);
          }
          writeAttempted = true;
          await writeStore(storageKey, guardStore);
          const readback = parseGuardStore(
            await store.getItem(deletionGuardKey(storageKey)),
          );
          if (readback == null) return { kind: 'unconfirmed' } as const;
          const confirmed = recordFor(readback, principalId);
          if (
            restoredRecord == null
              ? confirmed != null
              : !sameGuardRecord(confirmed, restoredRecord)
          ) {
            return { kind: 'unconfirmed' } as const;
          }
          return { kind: 'disarmed' } as const;
        });
        if (result.kind === 'disarmed' || result.kind === 'unconfirmed') {
          emitGuardChange(storageKey);
        }
        return result;
      } catch {
        if (writeAttempted) emitGuardChange(storageKey);
        return { kind: 'unconfirmed' };
      }
    },
    settleSession: async (
      storageKey: string,
      principalId: string,
      guardRevision: number,
    ): Promise<PrincipalBoundSessionCleanup> => {
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return { kind: 'quarantined-unavailable' } as const;
          const owned = recordFor(guardStore, principalId);
          if (
            owned?.revision !== guardRevision ||
            owned.state === 'preparing'
          ) {
            return { kind: 'stale-attempt' } as const;
          }
          const parsed = parseStoredSession(await store.getItem(storageKey));
          if (parsed.kind === 'malformed') {
            return { kind: 'quarantined-unavailable' } as const;
          }
          if (parsed.kind === 'session' && parsed.principalId !== principalId) {
            return classifyPreserved(guardStore, parsed);
          }

          if (parsed.kind === 'session') {
            await store.removeItem(storageKey);
          }
          let companionCleanup: 'removed' | 'unconfirmed' = 'removed';
          try {
            await store.removeItem(companionUserKey(storageKey));
          } catch {
            companionCleanup = 'unconfirmed';
          }
          return {
            kind: parsed.kind === 'empty' ? 'already-empty' : 'removed-a',
            companionCleanup,
          } as const;
        });
        if (
          result.kind === 'removed-a' ||
          result.kind === 'already-empty' ||
          result.kind === 'quarantined-unavailable'
        ) {
          emitGuardChange(storageKey);
        }
        return result;
      } catch {
        emitGuardChange(storageKey);
        return { kind: 'quarantined-unavailable' };
      }
    },
    removeExact: async (
      storageKey: string,
      expected: {
        principalId: string;
        accessToken: string;
        refreshToken: string;
      },
    ): Promise<'removed' | 'changed' | 'already-empty' | 'unavailable'> => {
      try {
        return await withStorage(storageKey, async () => {
          const parsed = parseStoredSession(await store.getItem(storageKey));
          if (parsed.kind === 'empty') return 'already-empty';
          if (parsed.kind === 'malformed') return 'unavailable';
          if (
            parsed.principalId !== expected.principalId ||
            parsed.session.access_token !== expected.accessToken ||
            parsed.session.refresh_token !== expected.refreshToken
          ) {
            return 'changed';
          }
          await store.removeItem(storageKey);
          try {
            await store.removeItem(companionUserKey(storageKey));
          } catch {
            // Primary authority is already gone; companion cleanup is best effort.
          }
          return 'removed';
        });
      } catch {
        return 'unavailable';
      }
    },
    isBlocked: async (storageKey: string, session: Session): Promise<boolean> => {
      try {
        return await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return true;
          const parsed = parseStoredSession(JSON.stringify(session));
          return parsed.kind !== 'session' ||
            !sessionAllowedByGuard(guardStore, parsed);
        });
      } catch {
        return true;
      }
    },
    adopt: async (
      storageKey: string,
      session: Session,
    ): Promise<'not-guarded' | 'adopted' | 'guard-busy' | 'superseded'> => {
      const principalId = session.user?.id;
      if (typeof principalId !== 'string' || principalId.length === 0) {
        return 'guard-busy';
      }
      let writeAttempted = false;
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) throw new Error('Auth storage is unavailable.');
          const parsed = parseStoredSession(JSON.stringify(session));
          if (parsed.kind !== 'session' || parsed.sessionId == null) {
            return 'guard-busy' as const;
          }
          const stored = parseStoredSession(await store.getItem(storageKey));
          if (stored.kind === 'malformed') return 'guard-busy' as const;
          const existing = recordFor(guardStore, principalId);
          if (existing == null) {
            if (stored.kind === 'empty') return 'superseded' as const;
            if (stored.sessionId == null) return 'guard-busy' as const;
            const exactStoredAuthority =
              stored.principalId === parsed.principalId &&
              stored.sessionId === parsed.sessionId &&
              stored.session.access_token === parsed.session.access_token &&
              stored.session.refresh_token === parsed.session.refresh_token;
            if (exactStoredAuthority) return 'not-guarded' as const;
            return sessionAllowedByGuard(guardStore, stored)
              ? 'superseded' as const
              : 'guard-busy' as const;
          }
          if (stored.kind === 'session') {
            if (stored.principalId !== parsed.principalId) {
              return sessionAllowedByGuard(guardStore, stored)
                ? 'superseded' as const
                : 'guard-busy' as const;
            }
            const sameSnapshot =
              stored.sessionId === parsed.sessionId &&
              stored.session.access_token === parsed.session.access_token &&
              stored.session.refresh_token === parsed.session.refresh_token;
            if (!sameSnapshot && sessionAllowedByGuard(guardStore, stored)) {
              return 'superseded' as const;
            }
          }
          if (
            existing.state === 'preparing' ||
            (existing.state === 'pending' && existing.leaseExpiresAt > now())
          ) {
            return 'guard-busy' as const;
          }
          const revision = allocateRevision(guardStore);
          const adoptedRecord: PrincipalDeletionGuardRecord = {
            revision,
            state: 'settled',
            leaseExpiresAt: 0,
            principalId: parsed.principalId,
            allowedSessionId: parsed.sessionId,
            predecessor: null,
          };
          guardStore.records = [
            ...guardStore.records.filter(
              (record) => record.principalId !== parsed.principalId,
            ),
            adoptedRecord,
          ];
          writeAttempted = true;
          await writeStore(storageKey, guardStore);
          await store.setItem(storageKey, JSON.stringify(session));
          const readback = parseGuardStore(
            await store.getItem(deletionGuardKey(storageKey)),
          );
          const confirmed = readback == null
            ? undefined
            : recordFor(readback, parsed.principalId);
          const storedReadback = parseStoredSession(
            await store.getItem(storageKey),
          );
          if (
            !sameGuardRecord(confirmed, adoptedRecord) ||
            storedReadback.kind !== 'session' ||
            storedReadback.principalId !== parsed.principalId ||
            storedReadback.sessionId !== parsed.sessionId ||
            storedReadback.session.access_token !== parsed.session.access_token ||
            storedReadback.session.refresh_token !== parsed.session.refresh_token
          ) {
            throw new Error('Auth storage adoption is unconfirmed.');
          }
          return 'adopted' as const;
        });
        if (result === 'adopted') emitGuardChange(storageKey);
        return result;
      } catch (error) {
        if (writeAttempted) emitGuardChange(storageKey);
        throw error;
      }
    },
    replaceDisplaced: async (
      storageKey: string,
      expectedDisplaced: Session,
      validatedReplacement: Session,
    ): Promise<GuardedAuthStorageReconciliation> => {
      let writeAttempted = false;
      try {
        const result = await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return { kind: 'unavailable' } as const;
          const current = parseStoredSession(await store.getItem(storageKey));
          const expected = parseStoredSession(JSON.stringify(expectedDisplaced));
          const replacement = parseStoredSession(
            JSON.stringify(validatedReplacement),
          );
          const currentAuthority = reconcileParsedSession(guardStore, current);
          if (
            current.kind !== 'session' ||
            expected.kind !== 'session' ||
            replacement.kind !== 'session' ||
            current.sessionId == null ||
            expected.sessionId == null ||
            replacement.sessionId == null ||
            !sameStoredSessionSnapshot(current, expected) ||
            !sessionAllowedByGuard(guardStore, current) ||
            !sessionAllowedByGuard(guardStore, replacement)
          ) {
            return currentAuthority;
          }

          writeAttempted = true;
          await store.setItem(storageKey, JSON.stringify(validatedReplacement));
          const readbackStore = await readNormalizedStore(storageKey);
          if (readbackStore == null) return { kind: 'unavailable' } as const;
          const readback = parseStoredSession(await store.getItem(storageKey));
          const readbackAuthority = reconcileParsedSession(
            readbackStore,
            readback,
          );
          return readback.kind === 'session' &&
              sameStoredSessionSnapshot(readback, replacement) &&
              readbackAuthority.kind === 'allowed-session'
            ? readbackAuthority
            : { kind: 'unavailable' } as const;
        });
        if (writeAttempted) emitGuardChange(storageKey);
        return result;
      } catch {
        if (writeAttempted) emitGuardChange(storageKey);
        return { kind: 'unavailable' };
      }
    },
    reconcile: async (
      storageKey: string,
    ): Promise<GuardedAuthStorageReconciliation> => {
      try {
        return await withStorage(storageKey, async () => {
          const guardStore = await readNormalizedStore(storageKey);
          if (guardStore == null) return { kind: 'unavailable' } as const;
          const parsed = parseStoredSession(await store.getItem(storageKey));
          return reconcileParsedSession(guardStore, parsed);
        });
      } catch {
        return { kind: 'unavailable' };
      }
    },
  };
}

const principalBoundStorage = createPrincipalBoundAuthStorage(AsyncStorage, {
  runStorageOperation: runSupabaseAuthStorageOperation,
  preflight: preflightAuthStorageCoordination,
  emitGuardChange: emitPrincipalDeletionGuardChange,
  subscribeGuardChanges,
  skipWhenNoWindow: true,
});

/** Singleton guarded adapter wired into the app Supabase client. */
export const authStorage: AuthStorageAdapter = principalBoundStorage.adapter;

export async function preflightPrincipalBoundAuthStorage(
  storageKey: string,
  principalId: string,
) {
  return await principalBoundStorage.preflight(storageKey, principalId);
}

export async function armPrincipalDeletionGuard(storageKey: string, principalId: string) {
  return await principalBoundStorage.arm(storageKey, principalId);
}

export async function markPrincipalDeletionDispatched(
  storageKey: string,
  principalId: string,
  guardRevision: number,
) {
  return await principalBoundStorage.markDispatched(storageKey, principalId, guardRevision);
}

export async function settlePrincipalDeletionGuard(
  storageKey: string,
  principalId: string,
  guardRevision: number,
) {
  return await principalBoundStorage.settleGuard(storageKey, principalId, guardRevision);
}

export async function disarmPrincipalDeletionGuard(
  storageKey: string,
  principalId: string,
  guardRevision: number,
) {
  return await principalBoundStorage.disarm(storageKey, principalId, guardRevision);
}

export async function settleGuardedPrincipalSession(
  storageKey: string,
  principalId: string,
  guardRevision: number,
): Promise<PrincipalBoundSessionCleanup> {
  return await principalBoundStorage.settleSession(storageKey, principalId, guardRevision);
}

export async function removeStoredSessionIfExact(
  storageKey: string,
  expected: { principalId: string; accessToken: string; refreshToken: string },
) {
  return await principalBoundStorage.removeExact(storageKey, expected);
}

export async function isSessionBlockedByDeletionGuard(
  storageKey: string,
  session: Session,
): Promise<boolean> {
  return await principalBoundStorage.isBlocked(storageKey, session);
}

export async function adoptExplicitSessionAfterDeletionGuard(
  storageKey: string,
  session: Session,
) {
  return await principalBoundStorage.adopt(storageKey, session);
}

export async function replaceDisplacedSessionIfExact(
  storageKey: string,
  expectedDisplaced: Session,
  validatedReplacement: Session,
): Promise<GuardedAuthStorageReconciliation> {
  return await principalBoundStorage.replaceDisplaced(
    storageKey,
    expectedDisplaced,
    validatedReplacement,
  );
}

export async function reconcileGuardedAuthStorage(storageKey: string) {
  return await principalBoundStorage.reconcile(storageKey);
}

export async function reconcileGuardedSignedOutEvent(storageKey: string) {
  return await principalBoundStorage.reconcile(storageKey);
}

export function subscribePrincipalDeletionGuardChanges(
  storageKey: string,
  onChange: () => void,
): () => void {
  return subscribeGuardChanges(storageKey, onChange);
}
