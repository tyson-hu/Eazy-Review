export type AuthCoordinationPlatform = 'native' | 'web';

export type AuthCoordinationDependencies = {
  platform: AuthCoordinationPlatform;
  webLocks?: {
    request<T>(
      name: string,
      options: { mode: 'exclusive' },
      callback: () => Promise<T>,
    ): Promise<T>;
  };
  createBroadcastChannel?: (name: string) => {
    postMessage(value: unknown): void;
    close(): void;
    addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
    removeEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  };
  enqueue?: (callback: () => void) => void;
};

export type AppSupabaseAuthLock = <T>(
  name: string,
  acquireTimeout: number,
  operation: () => Promise<T>,
) => Promise<T>;

export function getAuthOperationLockName(storageKey: string): string {
  return `lock:${storageKey}`;
}

export function getAuthStorageLockName(storageKey: string): string {
  return `eazy-review:auth-storage:${storageKey}`;
}

const processLockTails = new Map<string, Promise<void>>();
const nativeGuardListeners = new Map<string, Set<() => void>>();

function runProcessExclusive<T>(
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const result = (processLockTails.get(name) ?? Promise.resolve())
    .catch(() => undefined)
    .then(operation);
  processLockTails.set(
    name,
    result.then(
      () => undefined,
      () => undefined,
    ),
  );
  return result;
}

function guardChannelName(storageKey: string): string {
  return `eazy-review:auth-guard:${storageKey}`;
}

function isGuardChange(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1 && record.kind === 'changed';
}

export function createAuthCoordination(dependencies: AuthCoordinationDependencies) {
  const enqueue = dependencies.enqueue ?? ((callback: () => void) => queueMicrotask(callback));

  const runNamedLock = <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    if (dependencies.platform === 'web' && dependencies.webLocks != null) {
      return dependencies.webLocks.request(name, { mode: 'exclusive' }, operation);
    }
    return runProcessExclusive(name, operation);
  };

  return {
    authLock: (async <T>(
      name: string,
      _acquireTimeout: number,
      operation: () => Promise<T>,
    ) => await runNamedLock(name, operation)) as AppSupabaseAuthLock,
    runAuthOperation: async <T>(storageKey: string, operation: () => Promise<T>) =>
      await runNamedLock(getAuthOperationLockName(storageKey), operation),
    runStorageOperation: async <T>(storageKey: string, operation: () => Promise<T>) =>
      await runNamedLock(getAuthStorageLockName(storageKey), operation),
    preflight: async (storageKey: string) => {
      if (dependencies.platform !== 'web') {
        await runNamedLock(getAuthStorageLockName(storageKey), async () => undefined);
        return;
      }
      if (
        dependencies.webLocks == null ||
        dependencies.createBroadcastChannel == null
      ) {
        throw new Error('Auth storage coordination is unavailable.');
      }
      const channel = dependencies.createBroadcastChannel(guardChannelName(storageKey));
      channel.close();
      await dependencies.webLocks.request(
        getAuthStorageLockName(storageKey),
        { mode: 'exclusive' },
        async () => undefined,
      );
    },
    emitGuardChange: (storageKey: string) => {
      if (dependencies.platform === 'web') {
        try {
          const channel = dependencies.createBroadcastChannel?.(
            guardChannelName(storageKey),
          );
          channel?.postMessage({ version: 1, kind: 'changed' });
          channel?.close();
        } catch {
          // Best-effort signal; mount and foreground reconciliation remain authoritative.
        }
        return;
      }
      for (const listener of nativeGuardListeners.get(storageKey) ?? []) {
        enqueue(listener);
      }
    },
    subscribeGuardChanges: (storageKey: string, onChange: () => void) => {
      if (dependencies.platform === 'web') {
        if (dependencies.createBroadcastChannel == null) return () => undefined;
        const channel = dependencies.createBroadcastChannel(guardChannelName(storageKey));
        const listener = (event: { data: unknown }) => {
          if (isGuardChange(event.data)) onChange();
        };
        channel.addEventListener('message', listener);
        return () => {
          channel.removeEventListener('message', listener);
          channel.close();
        };
      }

      const listeners = nativeGuardListeners.get(storageKey) ?? new Set<() => void>();
      listeners.add(onChange);
      nativeGuardListeners.set(storageKey, listeners);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) nativeGuardListeners.delete(storageKey);
      };
    },
  };
}

function defaultDependencies(): AuthCoordinationDependencies {
  const platform: AuthCoordinationPlatform =
    process.env.EXPO_OS === 'web' ? 'web' : 'native';
  const webLocks = typeof navigator !== 'undefined' && navigator.locks != null
    ? {
        request: <T>(
          name: string,
          options: { mode: 'exclusive' },
          callback: () => Promise<T>,
        ) => navigator.locks.request(name, options, callback),
      }
    : undefined;
  const createBroadcastChannel = typeof BroadcastChannel === 'function'
    ? (name: string) => new BroadcastChannel(name)
    : undefined;
  return {
    platform,
    webLocks,
    createBroadcastChannel,
    enqueue: (callback) => queueMicrotask(callback),
  };
}

const defaultCoordination = createAuthCoordination(defaultDependencies());

export const appSupabaseAuthLock = defaultCoordination.authLock;

export async function runSupabaseAuthOperation<T>(
  storageKey: string,
  operation: () => Promise<T>,
): Promise<T> {
  return await defaultCoordination.runAuthOperation(storageKey, operation);
}

export async function runSupabaseAuthStorageOperation<T>(
  storageKey: string,
  operation: () => Promise<T>,
): Promise<T> {
  return await defaultCoordination.runStorageOperation(storageKey, operation);
}

export async function preflightAuthStorageCoordination(storageKey: string): Promise<void> {
  await defaultCoordination.preflight(storageKey);
}

export function emitPrincipalDeletionGuardChange(storageKey: string): void {
  defaultCoordination.emitGuardChange(storageKey);
}

export function subscribePrincipalDeletionGuardChanges(
  storageKey: string,
  onChange: () => void,
): () => void {
  return defaultCoordination.subscribeGuardChanges(storageKey, onChange);
}
