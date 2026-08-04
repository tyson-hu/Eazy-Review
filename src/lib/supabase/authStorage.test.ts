import {
  authStorage,
  createAuthStorageAdapter,
} from '@/src/lib/supabase/authStorage';

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
    expect(warnText).toContain('sb-auth-token');

    warnSpy.mockRestore();
  });
});

describe('authStorage singleton', () => {
  it('implements getItem, setItem, and removeItem', () => {
    expect(typeof authStorage.getItem).toBe('function');
    expect(typeof authStorage.setItem).toBe('function');
    expect(typeof authStorage.removeItem).toBe('function');
  });
});
