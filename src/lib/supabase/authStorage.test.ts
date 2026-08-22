import {
  authStorage,
  createAuthStorageAdapter,
  createPrincipalBoundAuthStorage,
} from '@/src/lib/supabase/authStorage';
import type { Session } from '@supabase/supabase-js';

type MockStore = {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

function createMockStore(
  overrides: Partial<MockStore> = {},
): MockStore {
  return {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe('createAuthStorageAdapter', () => {
  it('returns an existing string value without double decoding', async () => {
    const stored = '{"access_token":"opaque-session-blob"}';
    const store = createMockStore({
      getItem: jest.fn(async () => stored),
    });
    const adapter = createAuthStorageAdapter(store);

    await expect(adapter.getItem('sb-auth-token')).resolves.toBe(stored);
    expect(store.getItem).toHaveBeenCalledWith('sb-auth-token');
  });

  it('returns null for a missing value', async () => {
    const store = createMockStore({
      getItem: jest.fn(async () => null),
    });
    const adapter = createAuthStorageAdapter(store);

    await expect(adapter.getItem('missing-key')).resolves.toBeNull();
  });

  it('sets the raw string without wrapping it in extra JSON encoding', async () => {
    const store = createMockStore();
    const adapter = createAuthStorageAdapter(store);
    const value = '{"refresh_token":"opaque"}';

    await adapter.setItem('sb-auth-token', value);

    expect(store.setItem).toHaveBeenCalledWith('sb-auth-token', value);
    const written = store.setItem.mock.calls[0][1] as string;
    // The payload itself is JSON for Auth, but must not be double-encoded.
    expect(JSON.parse(written)).toEqual({ refresh_token: 'opaque' });
  });

  it('removes a key', async () => {
    const store = createMockStore();
    const adapter = createAuthStorageAdapter(store);

    await adapter.removeItem('sb-auth-token');
    expect(store.removeItem).toHaveBeenCalledWith('sb-auth-token');
  });

  it('propagates storage errors from get, set, and remove', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getError = new Error('get failed');
    const setError = new Error('set failed');
    const removeError = new Error('remove failed');

    const getStore = createMockStore({
      getItem: jest.fn(async () => {
        throw getError;
      }),
    });
    await expect(
      createAuthStorageAdapter(getStore).getItem('k'),
    ).rejects.toBe(getError);

    const setStore = createMockStore({
      setItem: jest.fn(async () => {
        throw setError;
      }),
    });
    await expect(
      createAuthStorageAdapter(setStore).setItem('k', 'v'),
    ).rejects.toBe(setError);

    const removeStore = createMockStore({
      removeItem: jest.fn(async () => {
        throw removeError;
      }),
    });
    await expect(
      createAuthStorageAdapter(removeStore).removeItem('k'),
    ).rejects.toBe(removeError);

    warnSpy.mockRestore();
  });

  it('does not log token or session content on failure', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const tokenish =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.session-body-must-not-be-logged.sig';
    const store = createMockStore({
      setItem: jest.fn(async () => {
        throw new Error('disk full');
      }),
    });

    await expect(
      createAuthStorageAdapter(store).setItem('sb-auth-token', tokenish),
    ).rejects.toThrow('disk full');

    const warnText = warnSpy.mock.calls.map((call) => call.join(' ')).join(' ');
    expect(warnText).not.toContain(tokenish);
    expect(warnText).not.toContain('session-body-must-not-be-logged');
    expect(warnText).toBe('[authStorage] setItem failed');
    expect(warnText).not.toContain('disk full');

    warnSpy.mockRestore();
  });

  it('still runs injected stores when window is unavailable', async () => {
    // Default adapters (injected test stores) must not apply the SSR skip.
    const store = createMockStore({
      getItem: jest.fn(async () => 'from-mock'),
    });
    const adapter = createAuthStorageAdapter(store);

    const originalWindow = globalThis.window;
    // @ts-expect-error intentional delete for SSR simulation
    delete globalThis.window;

    try {
      await expect(adapter.getItem('k')).resolves.toBe('from-mock');
      await adapter.setItem('k', 'v');
      await adapter.removeItem('k');
      expect(store.getItem).toHaveBeenCalledWith('k');
      expect(store.setItem).toHaveBeenCalledWith('k', 'v');
      expect(store.removeItem).toHaveBeenCalledWith('k');
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

describe('authStorage singleton', () => {
  it('implements getItem, setItem, and removeItem', () => {
    expect(typeof authStorage.getItem).toBe('function');
    expect(typeof authStorage.setItem).toBe('function');
    expect(typeof authStorage.removeItem).toBe('function');
  });
});

describe('SSR-safe storage runtime guard', () => {
  it('returns null and no-ops when window is unavailable', async () => {
    const store = createMockStore();
    const adapter = createAuthStorageAdapter(store, {
      skipWhenNoWindow: true,
    });

    const originalWindow = globalThis.window;
    // Simulate Node SSR used by Expo static web export.
    // @ts-expect-error intentional delete for SSR simulation
    delete globalThis.window;

    try {
      await expect(adapter.getItem('sb-auth-token')).resolves.toBeNull();
      await expect(
        adapter.setItem('sb-auth-token', 'opaque'),
      ).resolves.toBeUndefined();
      await expect(adapter.removeItem('sb-auth-token')).resolves.toBeUndefined();
      expect(store.getItem).not.toHaveBeenCalled();
      expect(store.setItem).not.toHaveBeenCalled();
      expect(store.removeItem).not.toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

const STORAGE_KEY = 'sb-project-auth-token';
const GUARD_KEY = `${STORAGE_KEY}-eazy-review-deletion-guard`;
const COMPANION_KEY = `${STORAGE_KEY}-user`;

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function session(
  principalId: string,
  sessionId: string | null,
  tokenLabel = principalId,
): Session {
  const claims = sessionId == null
    ? { sub: principalId }
    : { sub: principalId, session_id: sessionId };
  return {
    access_token: `${base64Url({ alg: 'none' })}.${base64Url(claims)}.${tokenLabel}`,
    refresh_token: `refresh-${tokenLabel}`,
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: principalId, aud: 'authenticated' },
  } as unknown as Session;
}

function statefulStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    store: {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        values.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        values.delete(key);
      }),
    },
  };
}

function guardRecord(values: Map<string, string>) {
  return JSON.parse(values.get(GUARD_KEY) ?? 'null') as {
    version: number;
    nextRevision: number;
    records: {
      revision: number;
      state: string;
      principalId: string;
      allowedSessionId: string | null;
      predecessor: unknown;
    }[];
  } | null;
}

describe('principal-bound Auth storage', () => {
  it('serializes adapter get set and remove through one injected storage lock', async () => {
    const state = statefulStore();
    const locks: string[] = [];
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      runStorageOperation: async (storageKey, operation) => {
        locks.push(storageKey);
        return await operation();
      },
    });

    await controlled.adapter.getItem(STORAGE_KEY);
    await controlled.adapter.setItem(STORAGE_KEY, JSON.stringify(session('a', 'session-a')));
    await controlled.adapter.getItem(COMPANION_KEY);
    await controlled.adapter.setItem(COMPANION_KEY, 'companion-a');
    await controlled.adapter.removeItem(STORAGE_KEY);
    expect(locks).toEqual([
      STORAGE_KEY,
      STORAGE_KEY,
      STORAGE_KEY,
      STORAGE_KEY,
      STORAGE_KEY,
    ]);
  });

  it('arms and reads back a minimized preparing guard before reauthentication', async () => {
    const storedA = session('principal-a', 'session-a');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const emitted = jest.fn();
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
      emitGuardChange: emitted,
    });

    await expect(controlled.arm(STORAGE_KEY, 'principal-a')).resolves.toEqual({
      kind: 'armed',
      guardRevision: 1,
    });
    const guard = guardRecord(state.values);
    expect(guard).toMatchObject({
      version: 1,
      nextRevision: 2,
      records: [
        {
          revision: 1,
          state: 'preparing',
          principalId: 'principal-a',
          allowedSessionId: null,
          predecessor: null,
        },
      ],
    });
    expect(JSON.stringify(guard)).not.toMatch(/access|refresh|email|password|note/i);
    expect(emitted).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('quarantines when the preparing readback changes security metadata', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    state.store.setItem.mockImplementationOnce(async (key: string, value: string) => {
      const changed = JSON.parse(value) as { records: { allowedSessionId: string | null }[] };
      changed.records[0].allowedSessionId = 'unexpected-lineage';
      state.values.set(key, JSON.stringify(changed));
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });

    await expect(controlled.arm(STORAGE_KEY, 'principal-a')).resolves.toEqual({
      kind: 'quarantine-unconfirmed',
    });
  });

  it('requires preparing then exact pending readback before dispatch', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
    });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');

    await expect(
      controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toBe('pending');
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      revision: arm.guardRevision,
      state: 'pending',
    });
  });

  it('preserves B instead of marking A pending when B wins raw storage first', async () => {
    const storedA = session('principal-a', 'session-a');
    const storedB = session('principal-b', 'session-b');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
    });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    state.values.set(STORAGE_KEY, JSON.stringify(storedB));

    await expect(
      controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      revision: arm.guardRevision,
      state: 'preparing',
    });
  });

  it('replaces exact allowed displaced A with validated B once', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(displacedA),
    });
    const emitted = jest.fn();
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      emitGuardChange: emitted,
    });

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({
      kind: 'allowed-session',
      principalId: 'principal-b',
      session: replacementB,
      sessionId: 'session-b',
      guardRevision: null,
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(replacementB));
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(1);
    expect(emitted).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('preserves allowed C already stored before displaced A replacement', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const storedC = session('principal-c', 'session-c', 'stored-c');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(storedC),
    });
    const emitted = jest.fn();
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      emitGuardChange: emitted,
    });

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({
      kind: 'allowed-session',
      principalId: 'principal-c',
      session: storedC,
      sessionId: 'session-c',
      guardRevision: null,
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedC));
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(0);
    expect(emitted).not.toHaveBeenCalled();
  });

  it('preserves a newer same-principal A2 snapshot', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a1');
    const newerA2 = session('principal-a', 'session-a', 'newer-a2');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(newerA2),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store);

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({
      kind: 'allowed-session',
      principalId: 'principal-a',
      session: newerA2,
      sessionId: 'session-a',
      guardRevision: null,
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(newerA2));
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(0);
  });

  it('preserves malformed current authority without attempting replacement', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const state = statefulStore({ [STORAGE_KEY]: '{malformed' });
    const controlled = createPrincipalBoundAuthStorage(state.store);

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({ kind: 'unavailable' });
    expect(state.values.get(STORAGE_KEY)).toBe('{malformed');
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(0);
  });

  it('preserves blocked raw C without attempting replacement', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const storedC = session('principal-c', 'session-c', 'blocked-c');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(storedC),
      [GUARD_KEY]: JSON.stringify({
        version: 1,
        nextRevision: 2,
        records: [
          {
            revision: 1,
            state: 'pending',
            leaseExpiresAt: 1_000,
            principalId: 'principal-c',
            allowedSessionId: null,
            predecessor: null,
          },
        ],
      }),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 500,
    });

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({
      kind: 'blocked',
      principalId: 'principal-c',
      guardRevision: 1,
      guardState: 'pending',
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedC));
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(0);
  });

  it('preserves empty authority instead of resurrecting replacement B', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const state = statefulStore();
    const controlled = createPrincipalBoundAuthStorage(state.store);

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({ kind: 'empty', guardedPrincipalIds: [] });
    expect(state.values.has(STORAGE_KEY)).toBe(false);
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(0);
  });

  it('does not write replacement B while B is blocked by its own guard', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(displacedA),
      [GUARD_KEY]: JSON.stringify({
        version: 1,
        nextRevision: 2,
        records: [
          {
            revision: 1,
            state: 'pending',
            leaseExpiresAt: 1_000,
            principalId: 'principal-b',
            allowedSessionId: null,
            predecessor: null,
          },
        ],
      }),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 500,
    });

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({
      kind: 'allowed-session',
      principalId: 'principal-a',
      session: displacedA,
      sessionId: 'session-a',
      guardRevision: null,
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(displacedA));
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(0);
  });

  it('reports an unconfirmed replacement write without retrying or exposing state', async () => {
    const displacedA = session('principal-a', 'session-a', 'displaced-a');
    const replacementB = session('principal-b', 'session-b', 'replacement-b');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(displacedA),
    });
    state.store.setItem.mockImplementationOnce(async (key: string) => {
      state.values.set(key, '{malformed');
    });
    const emitted = jest.fn();
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      emitGuardChange: emitted,
    });

    await expect(
      controlled.replaceDisplaced(
        STORAGE_KEY,
        displacedA,
        replacementB,
      ),
    ).resolves.toEqual({ kind: 'unavailable' });
    expect(
      state.store.setItem.mock.calls.filter(([key]) => key === STORAGE_KEY),
    ).toHaveLength(1);
    expect(emitted).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('keeps guarded B quarantined instead of marking A pending', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
    });
    const armA = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (armA.kind !== 'armed') throw new Error('expected A guard');
    state.values.set(
      STORAGE_KEY,
      JSON.stringify(session('principal-b', 'session-b')),
    );
    const armB = await controlled.arm(STORAGE_KEY, 'principal-b');
    if (armB.kind !== 'armed') throw new Error('expected B guard');

    await expect(
      controlled.markDispatched(
        STORAGE_KEY,
        'principal-a',
        armA.guardRevision,
      ),
    ).resolves.toEqual({
      kind: 'preserved-guarded',
      principalId: 'principal-b',
    });
  });

  it('treats empty raw storage as signed-out before marking A pending', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
    });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    state.values.delete(STORAGE_KEY);

    await expect(
      controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'signed-out' });
  });

  it('does not mark guarded A pending without an exact session_id', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', null)),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
    });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');

    await expect(
      controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toBe('unconfirmed');
  });

  it('rejects a pending readback whose security metadata changed', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    state.store.setItem.mockImplementationOnce(async (key: string, value: string) => {
      const changed = JSON.parse(value) as { records: { allowedSessionId: string | null }[] };
      changed.records[0].allowedSessionId = 'unexpected-lineage';
      state.values.set(key, JSON.stringify(changed));
    });

    await expect(
      controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toBe('unconfirmed');
  });

  it('never removes A from a preparing guard that was not dispatched', async () => {
    const storedA = session('principal-a', 'session-a');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');

    await expect(
      controlled.settleSession(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'stale-attempt' });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedA));
  });

  it('hides pending A reads and ignores late A writes while allowing B', async () => {
    const storedA = session('principal-a', 'session-a');
    const storedB = session('principal-b', 'session-b');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);

    await expect(controlled.adapter.getItem(STORAGE_KEY)).resolves.toBeNull();
    await controlled.adapter.setItem(STORAGE_KEY, JSON.stringify(storedA));
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedA));
    await controlled.adapter.setItem(STORAGE_KEY, JSON.stringify(storedB));
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedB));
  });

  it('fails closed for guarded A with missing session_id', async () => {
    const storedA = session('principal-a', null);
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    expect(arm.kind).toBe('armed');
    await expect(controlled.adapter.getItem(STORAGE_KEY)).resolves.toBeNull();
  });

  it('denies direct SDK primary and companion removal while any guard exists', async () => {
    const storedA = session('principal-a', 'session-a');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(storedA),
      [COMPANION_KEY]: 'companion-a',
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    await controlled.arm(STORAGE_KEY, 'principal-a');

    await controlled.adapter.removeItem(STORAGE_KEY);
    await controlled.adapter.removeItem(COMPANION_KEY);
    expect(state.values.has(STORAGE_KEY)).toBe(true);
    expect(state.values.has(COMPANION_KEY)).toBe(true);
  });

  it('returns guard-busy for a concurrent same-principal preparing attempt', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    await controlled.arm(STORAGE_KEY, 'principal-a');
    await expect(controlled.arm(STORAGE_KEY, 'principal-a')).resolves.toEqual({
      kind: 'guard-busy',
    });
  });

  it('retains an A guard when a later B guard is armed', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    await controlled.arm(STORAGE_KEY, 'principal-a');
    state.values.set(STORAGE_KEY, JSON.stringify(session('principal-b', 'session-b')));
    await controlled.arm(STORAGE_KEY, 'principal-b');
    expect(guardRecord(state.values)?.records.map((record) => record.principalId)).toEqual([
      'principal-a',
      'principal-b',
    ]);
  });

  it('rolls back expired preparing and keeps revisions monotonic', async () => {
    let now = 1_000;
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => now });
    await controlled.arm(STORAGE_KEY, 'principal-a');
    now += 5 * 60_000 + 1;

    await expect(controlled.preflight(STORAGE_KEY, 'principal-a')).resolves.toBe('ready');
    expect(guardRecord(state.values)?.records).toEqual([]);
    await expect(controlled.arm(STORAGE_KEY, 'principal-a')).resolves.toEqual({
      kind: 'armed',
      guardRevision: 2,
    });
  });

  it('keeps expired pending quarantined but permits explicit fresh-session adoption', async () => {
    let now = 1_000;
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => now });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    now += 5 * 60_000 + 1;
    const fresh = session('principal-a', 'session-fresh', 'fresh');

    await expect(controlled.preflight(STORAGE_KEY, 'principal-a')).resolves.toBe('guard-busy');
    await expect(controlled.adopt(STORAGE_KEY, fresh)).resolves.toBe('adopted');
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      revision: 2,
      state: 'settled',
      allowedSessionId: 'session-fresh',
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(fresh));
    await expect(
      controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toBe('stale-attempt');
  });

  it('preserves B that wins before guarded A adoption commits', async () => {
    const storedA = session('principal-a', 'session-a');
    const storedB = session('principal-b', 'session-b');
    const freshA = session('principal-a', 'session-fresh', 'fresh-a');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    await controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision);
    state.values.set(STORAGE_KEY, JSON.stringify(storedB));

    await expect(controlled.adopt(STORAGE_KEY, freshA)).resolves.toBe(
      'superseded',
    );
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedB));
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      principalId: 'principal-a',
      revision: arm.guardRevision,
      state: 'settled',
    });
  });

  it('requires an exact stored authority match before unguarded adoption succeeds', async () => {
    const callbackA = session('principal-a', 'session-a', 'callback-a');
    const newerA = session('principal-a', 'session-newer', 'newer-a');
    const storedB = session('principal-b', 'session-b', 'winner-b');

    for (const stored of [newerA, storedB, null]) {
      const state = statefulStore(
        stored == null ? {} : { [STORAGE_KEY]: JSON.stringify(stored) },
      );
      const controlled = createPrincipalBoundAuthStorage(state.store);

      await expect(controlled.adopt(STORAGE_KEY, callbackA)).resolves.toBe(
        'superseded',
      );
      expect(state.values.get(STORAGE_KEY)).toBe(
        stored == null ? undefined : JSON.stringify(stored),
      );
    }

    const exactState = statefulStore({
      [STORAGE_KEY]: JSON.stringify(callbackA),
    });
    const exact = createPrincipalBoundAuthStorage(exactState.store);
    await expect(exact.adopt(STORAGE_KEY, callbackA)).resolves.toBe(
      'not-guarded',
    );
  });

  it('fails closed when unguarded adoption finds malformed storage', async () => {
    const callbackA = session('principal-a', 'session-a', 'callback-a');
    const state = statefulStore({ [STORAGE_KEY]: '{malformed' });
    const controlled = createPrincipalBoundAuthStorage(state.store);

    await expect(controlled.adopt(STORAGE_KEY, callbackA)).resolves.toBe(
      'guard-busy',
    );
    expect(state.values.get(STORAGE_KEY)).toBe('{malformed');
  });

  it('fails closed when the callback session has no session_id', async () => {
    const callbackA = session('principal-a', null, 'callback-a');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(callbackA),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store);

    await expect(controlled.adopt(STORAGE_KEY, callbackA)).resolves.toBe(
      'guard-busy',
    );
  });

  it('emits a payload-free change when adoption writes but readback is unconfirmed', async () => {
    const storedA = session('principal-a', 'session-a');
    const freshA = session('principal-a', 'session-fresh', 'fresh-a');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const emitted = jest.fn();
    const controlled = createPrincipalBoundAuthStorage(state.store, {
      now: () => 1_000,
      emitGuardChange: emitted,
    });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    await controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision);
    emitted.mockClear();
    let guardReads = 0;
    state.store.getItem.mockImplementation(async (key: string) => {
      if (key === GUARD_KEY) {
        guardReads += 1;
        if (guardReads === 2) throw new Error('guard readback unavailable');
      }
      return state.values.get(key) ?? null;
    });

    await expect(controlled.adopt(STORAGE_KEY, freshA)).rejects.toThrow(
      'guard readback unavailable',
    );
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('settles and removes only exact stored A with separate companion result', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
      [COMPANION_KEY]: 'companion-a',
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    await controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision);

    await expect(
      controlled.settleSession(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'removed-a', companionCleanup: 'removed' });
    expect(state.values.has(STORAGE_KEY)).toBe(false);
    expect(state.values.has(COMPANION_KEY)).toBe(false);
  });

  it('rejects a settled readback whose zero-lease invariant changed', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    state.store.setItem.mockImplementationOnce(async (key: string, value: string) => {
      const changed = JSON.parse(value) as { records: { leaseExpiresAt: number }[] };
      changed.records[0].leaseExpiresAt = 1;
      state.values.set(key, JSON.stringify(changed));
    });

    await expect(
      controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toBe('unconfirmed');
  });

  it('records companion cleanup uncertainty after primary A removal', async () => {
    const storedA = session('principal-a', 'session-a');
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(storedA),
      [COMPANION_KEY]: 'companion-a',
    });
    state.store.removeItem.mockImplementation(async (key: string) => {
      if (key === COMPANION_KEY) throw new Error('companion unavailable');
      state.values.delete(key);
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    await controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision);

    await expect(
      controlled.settleSession(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({
      kind: 'removed-a',
      companionCleanup: 'unconfirmed',
    });
    expect(state.values.has(STORAGE_KEY)).toBe(false);
    expect(state.values.has(COMPANION_KEY)).toBe(true);
  });

  it('preserves stored B and returns its exact snapshot', async () => {
    const storedA = session('principal-a', 'session-a');
    const storedB = session('principal-b', 'session-b');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    state.values.set(STORAGE_KEY, JSON.stringify(storedB));

    await expect(
      controlled.settleSession(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({
      kind: 'preserved-winner',
      principalId: 'principal-b',
      session: storedB,
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedB));
  });

  it('returns quarantined-unavailable for malformed storage without removal', async () => {
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    state.values.set(STORAGE_KEY, '{malformed');

    await expect(
      controlled.settleSession(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'quarantined-unavailable' });
    expect(state.values.get(STORAGE_KEY)).toBe('{malformed');
  });

  it('keeps the guard when disarm cannot confirm unchanged A still owns storage', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    state.values.delete(STORAGE_KEY);

    await expect(
      controlled.disarm(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'unconfirmed' });
    expect(guardRecord(state.values)?.records).toEqual([
      expect.objectContaining({
        principalId: 'principal-a',
        revision: arm.guardRevision,
        state: 'preparing',
      }),
    ]);
  });

  it('never disarms a settled guard after destructive dispatch', async () => {
    const storedA = session('principal-a', 'session-a');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    await controlled.markDispatched(STORAGE_KEY, 'principal-a', arm.guardRevision);
    await controlled.settleGuard(STORAGE_KEY, 'principal-a', arm.guardRevision);

    await expect(
      controlled.disarm(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'stale-attempt' });
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      principalId: 'principal-a',
      revision: arm.guardRevision,
      state: 'settled',
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedA));
  });

  it('reports disarm unconfirmed when the guard write does not persist', async () => {
    const state = statefulStore({
      [STORAGE_KEY]: JSON.stringify(session('principal-a', 'session-a')),
    });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const arm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (arm.kind !== 'armed') throw new Error('expected armed guard');
    state.store.setItem.mockImplementationOnce(async () => undefined);

    await expect(
      controlled.disarm(STORAGE_KEY, 'principal-a', arm.guardRevision),
    ).resolves.toEqual({ kind: 'unconfirmed' });
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      principalId: 'principal-a',
      revision: arm.guardRevision,
      state: 'preparing',
    });
  });

  it('restores the exact predecessor with a newly advanced revision', async () => {
    const first = session('principal-a', 'session-first', 'first');
    const fresh = session('principal-a', 'session-fresh', 'fresh');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(first) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    const firstArm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (firstArm.kind !== 'armed') throw new Error('expected first armed guard');
    await controlled.markDispatched(
      STORAGE_KEY,
      'principal-a',
      firstArm.guardRevision,
    );
    await controlled.settleGuard(
      STORAGE_KEY,
      'principal-a',
      firstArm.guardRevision,
    );
    await expect(controlled.adopt(STORAGE_KEY, fresh)).resolves.toBe('adopted');
    const secondArm = await controlled.arm(STORAGE_KEY, 'principal-a');
    if (secondArm.kind !== 'armed') throw new Error('expected second armed guard');

    await expect(
      controlled.disarm(STORAGE_KEY, 'principal-a', secondArm.guardRevision),
    ).resolves.toEqual({ kind: 'disarmed' });
    expect(guardRecord(state.values)?.records[0]).toMatchObject({
      revision: secondArm.guardRevision + 1,
      state: 'settled',
      principalId: 'principal-a',
      allowedSessionId: 'session-fresh',
      predecessor: null,
    });
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(fresh));
  });

  it('exact-removes captured A but preserves a replacement B', async () => {
    const capturedA = session('principal-a', 'session-a');
    const storedB = session('principal-b', 'session-b');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedB) });
    const controlled = createPrincipalBoundAuthStorage(state.store);

    await expect(
      controlled.removeExact(STORAGE_KEY, {
        principalId: 'principal-a',
        accessToken: capturedA.access_token,
        refreshToken: capturedA.refresh_token,
      }),
    ).resolves.toBe('changed');
    expect(state.values.get(STORAGE_KEY)).toBe(JSON.stringify(storedB));
  });

  it('classifies blocked and allowed stored authority for reconciliation', async () => {
    const storedA = session('principal-a', 'session-a');
    const state = statefulStore({ [STORAGE_KEY]: JSON.stringify(storedA) });
    const controlled = createPrincipalBoundAuthStorage(state.store, { now: () => 1_000 });
    await controlled.arm(STORAGE_KEY, 'principal-a');
    await expect(controlled.reconcile(STORAGE_KEY)).resolves.toEqual({
      kind: 'blocked',
      principalId: 'principal-a',
      guardRevision: 1,
      guardState: 'preparing',
    });

    state.values.set(STORAGE_KEY, JSON.stringify(session('principal-b', 'session-b')));
    await expect(controlled.reconcile(STORAGE_KEY)).resolves.toMatchObject({
      kind: 'allowed-session',
      principalId: 'principal-b',
    });
  });
});
