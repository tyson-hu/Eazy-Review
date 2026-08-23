import {
  createAuthCoordination,
  getAuthOperationLockName,
  getAuthStorageLockName,
} from '@/src/lib/supabase/authCoordination';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('Auth coordination', () => {
  it('uses distinct stable Auth-operation and storage lock names', () => {
    expect(getAuthOperationLockName('sb-project-auth-token')).toBe(
      'lock:sb-project-auth-token',
    );
    expect(getAuthStorageLockName('sb-project-auth-token')).toBe(
      'eazy-review:auth-storage:sb-project-auth-token',
    );
    expect(getAuthStorageLockName('sb-project-auth-token')).not.toBe(
      getAuthOperationLockName('sb-project-auth-token'),
    );
  });

  it('uses process-wide serialization on native', async () => {
    const firstRelease = deferred<void>();
    const firstStarted = deferred<void>();
    const events: string[] = [];
    const coordination = createAuthCoordination({ platform: 'native' });

    const first = coordination.runStorageOperation('storage-native-serialization', async () => {
      events.push('first-start');
      firstStarted.resolve();
      await firstRelease.promise;
      events.push('first-end');
    });
    const second = coordination.runStorageOperation('storage-native-serialization', async () => {
      events.push('second-start');
    });

    await firstStarted.promise;
    try {
      expect(events).toEqual(['first-start']);
    } finally {
      firstRelease.resolve();
    }
    await Promise.all([first, second]);
    expect(events).toEqual(['first-start', 'first-end', 'second-start']);
  });

  it('uses non-stealing Web Locks without timeout recovery', async () => {
    const requests: { name: string; options: unknown }[] = [];
    const coordination = createAuthCoordination({
      platform: 'web',
      webLocks: {
        async request(name, options, callback) {
          requests.push({ name, options });
          return await callback();
        },
      },
      createBroadcastChannel: () => ({
        postMessage: () => undefined,
        close: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });

    await coordination.authLock('lock:storage-a', -1, async () => undefined);
    expect(requests).toEqual([
      { name: 'lock:storage-a', options: { mode: 'exclusive' } },
    ]);
    expect(JSON.stringify(requests)).not.toMatch(/steal|ifAvailable|timeout/i);
  });

  it('keeps nested order Auth operation then storage', async () => {
    const requests: string[] = [];
    const coordination = createAuthCoordination({
      platform: 'web',
      webLocks: {
        async request(name, _options, callback) {
          requests.push(name);
          return await callback();
        },
      },
      createBroadcastChannel: () => ({
        postMessage: () => undefined,
        close: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });

    await coordination.runAuthOperation('storage-a', async () => {
      await coordination.runStorageOperation('storage-a', async () => undefined);
    });
    expect(requests).toEqual([
      'lock:storage-a',
      'eazy-review:auth-storage:storage-a',
    ]);
  });

  it('releases storage preflight before nesting guard arm under Auth operation', async () => {
    const events: string[] = [];
    const coordination = createAuthCoordination({ platform: 'native' });
    await coordination.runStorageOperation('storage-release-order', async () => {
      events.push('preflight');
    });
    await coordination.runAuthOperation('storage-release-order', async () => {
      events.push('auth');
      await coordination.runStorageOperation('storage-release-order', async () => {
        events.push('arm');
      });
    });
    expect(events).toEqual(['preflight', 'auth', 'arm']);
  });

  it('broadcasts only one payload-free guard-change label on web', () => {
    const posted: unknown[] = [];
    const coordination = createAuthCoordination({
      platform: 'web',
      webLocks: { request: async (_name, _options, callback) => await callback() },
      createBroadcastChannel: () => ({
        postMessage: (value) => posted.push(value),
        close: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });

    coordination.emitGuardChange('storage-a');
    expect(posted).toEqual([{ version: 1, kind: 'changed' }]);
    expect(JSON.stringify(posted)).not.toMatch(/principal|session|token|outcome/i);
  });

  it('delivers native guard changes asynchronously to process subscribers', async () => {
    const queued: (() => void)[] = [];
    const listener = jest.fn();
    const coordination = createAuthCoordination({
      platform: 'native',
      enqueue: (callback) => queued.push(callback),
    });
    const unsubscribe = coordination.subscribeGuardChanges('storage-a', listener);

    coordination.emitGuardChange('storage-a');
    expect(listener).not.toHaveBeenCalled();
    queued.splice(0).forEach((callback) => callback());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('delivers native guard changes across coordination instances', () => {
    const queued: (() => void)[] = [];
    const listener = jest.fn();
    const subscriber = createAuthCoordination({ platform: 'native' });
    const emitter = createAuthCoordination({
      platform: 'native',
      enqueue: (callback) => queued.push(callback),
    });
    const unsubscribe = subscriber.subscribeGuardChanges(
      'storage-cross-instance',
      listener,
    );

    emitter.emitGuardChange('storage-cross-instance');
    expect(listener).not.toHaveBeenCalled();
    queued.splice(0).forEach((callback) => callback());
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('requires Web Locks and BroadcastChannel before web guard preflight', async () => {
    await expect(
      createAuthCoordination({ platform: 'web' }).preflight('storage-a'),
    ).rejects.toThrow('Auth storage coordination is unavailable.');
  });

  it('propagates a rejected Web Lock request without running the operation', async () => {
    const operation = jest.fn(async () => undefined);
    const coordination = createAuthCoordination({
      platform: 'web',
      webLocks: {
        request: jest.fn(async () => {
          throw new Error('lock request rejected');
        }),
      },
      createBroadcastChannel: () => ({
        postMessage: () => undefined,
        close: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });

    await expect(
      coordination.runStorageOperation('storage-rejected', operation),
    ).rejects.toThrow('lock request rejected');
    expect(operation).not.toHaveBeenCalled();
  });
});
