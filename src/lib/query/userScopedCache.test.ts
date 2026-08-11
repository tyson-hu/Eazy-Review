import { QueryClient } from '@tanstack/react-query';

import { accountKeys, catalogKeys, ratingKeys } from '@/src/lib/query/keys';
import { removeUserScopedQueries } from '@/src/lib/query/userScopedCache';

describe('removeUserScopedQueries', () => {
  function makeClient() {
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
      },
    });
  }

  it('awaits cancel before remove (cancel-then-remove ordering)', async () => {
    const client = makeClient();
    const order: string[] = [];
    const originalCancel = client.cancelQueries.bind(client);
    const originalRemove = client.removeQueries.bind(client);

    jest.spyOn(client, 'cancelQueries').mockImplementation(async (filters) => {
      order.push('cancel-start');
      await originalCancel(filters);
      order.push('cancel-done');
      return undefined as never;
    });
    jest.spyOn(client, 'removeQueries').mockImplementation((filters) => {
      order.push('remove');
      return originalRemove(filters);
    });

    client.setQueryData(accountKeys.profile('user-a'), { id: 'user-a' });
    client.setQueryData(catalogKeys.products(), [{ id: 'public' }]);

    await removeUserScopedQueries(client);

    // For each user-scoped root, cancel completes before remove for that root.
    // Find the first cancel-done and ensure a remove follows it; and cancel
    // starts before any remove.
    expect(order.indexOf('cancel-start')).toBeLessThan(order.indexOf('remove'));
    expect(order.indexOf('cancel-done')).toBeLessThan(order.indexOf('remove'));
    expect(client.getQueryData(accountKeys.profile('user-a'))).toBeUndefined();
    expect(client.getQueryData(catalogKeys.products())).toEqual([{ id: 'public' }]);
    client.clear();
  });

  it('late A profile completion cannot repopulate after A→B purge', async () => {
    const client = makeClient();
    client.setQueryData(catalogKeys.products(), [{ id: 'sneaker' }]);
    client.setQueryData(accountKeys.profile('user-a'), {
      id: 'user-a',
      displayName: 'A',
    });

    let resolveA:
      | ((value: { id: string; displayName: string }) => void)
      | undefined;
    let sawAbort = false;

    const pending = client.prefetchQuery({
      queryKey: accountKeys.profile('user-a'),
      queryFn: ({ signal }) =>
        new Promise<{ id: string; displayName: string }>((resolve, reject) => {
          const onAbort = () => {
            sawAbort = true;
            reject(new DOMException('Aborted', 'AbortError'));
          };
          if (signal.aborted) {
            onAbort();
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
          resolveA = resolve;
        }),
    });

    // Give the queryFn a tick to register.
    await Promise.resolve();
    expect(resolveA).toBeDefined();

    // Identity switches A → B: cancel in-flight A, then remove user caches.
    await removeUserScopedQueries(client);

    expect(sawAbort).toBe(true);
    expect(client.getQueryData(accountKeys.profile('user-a'))).toBeUndefined();
    expect(client.getQueryData(catalogKeys.products())).toEqual([
      { id: 'sneaker' },
    ]);

    // Late A result attempts to finish after purge.
    resolveA?.({ id: 'user-a', displayName: 'A-late' });
    await pending.catch(() => undefined);

    // A data must not reappear; public catalog remains.
    expect(client.getQueryData(accountKeys.profile('user-a'))).toBeUndefined();
    expect(client.getQueryData(catalogKeys.products())).toEqual([
      { id: 'sneaker' },
    ]);

    // B may load normally into a fresh user-scoped key.
    await client.prefetchQuery({
      queryKey: accountKeys.profile('user-b'),
      queryFn: async () => ({ id: 'user-b', displayName: 'B' }),
    });
    expect(client.getQueryData(accountKeys.profile('user-b'))).toEqual({
      id: 'user-b',
      displayName: 'B',
    });

    client.clear();
  });

  it('sign-out during in-flight A profile cancels and keeps catalog', async () => {
    const client = makeClient();
    client.setQueryData(catalogKeys.product('p1'), { id: 'p1' });
    client.setQueryData(ratingKeys.mine('user-a', 'p1'), { score100: 90 });

    let resolveA: ((value: { id: string }) => void) | undefined;
    const pending = client.prefetchQuery({
      queryKey: accountKeys.profile('user-a'),
      queryFn: ({ signal }) =>
        new Promise<{ id: string }>((resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
          resolveA = resolve;
        }),
    });
    await Promise.resolve();

    await removeUserScopedQueries(client);
    resolveA?.({ id: 'user-a' });
    await pending.catch(() => undefined);

    expect(client.getQueryData(accountKeys.profile('user-a'))).toBeUndefined();
    expect(
      client.getQueryData(ratingKeys.mine('user-a', 'p1')),
    ).toBeUndefined();
    expect(client.getQueryData(catalogKeys.product('p1'))).toEqual({ id: 'p1' });
    client.clear();
  });
});
