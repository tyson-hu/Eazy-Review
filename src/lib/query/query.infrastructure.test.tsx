import { Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
  createAppQueryClient,
  defaultQueryClientOptions,
  resetAppQueryClientForTests,
  shouldRetryQuery,
} from '@/src/lib/query/client';
import {
  accountKeys,
  catalogKeys,
  ratingKeys,
} from '@/src/lib/query/keys';
import { removeUserScopedQueries } from '@/src/lib/query/userScopedCache';
import { renderWithProviders } from '@/src/test/renderWithProviders';

describe('query client defaults', () => {
  afterEach(() => {
    resetAppQueryClientForTests();
  });

  it('disables mutation retry by default', () => {
    expect(defaultQueryClientOptions.mutations?.retry).toBe(false);
    const client = createAppQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    client.clear();
  });

  it('retries transient read failures once and skips 4xx', () => {
    expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(1, { status: 500 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 422 })).toBe(false);
    // Alternate status shapes used by PostgREST / fetch wrappers.
    expect(shouldRetryQuery(0, { statusCode: 404 })).toBe(false);
    expect(shouldRetryQuery(0, { code: '403' })).toBe(false);
    expect(shouldRetryQuery(0, { status: 503 })).toBe(true);
    expect(shouldRetryQuery(1, new Error('network down'))).toBe(false);
    expect(shouldRetryQuery(0, new Error('network down'))).toBe(true);
  });

  it('uses the documented default stale time', () => {
    expect(defaultQueryClientOptions.queries?.staleTime).toBe(30_000);
    const client = createAppQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(30_000);
    client.clear();
  });

  it('creates QueryClients without leaving forced GC churn for tests', () => {
    // Test clients used by the harness set gcTime: Infinity so Jest can exit
    // cleanly without --forceExit. Production default still has finite gcTime.
    const testClient = createAppQueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity },
      },
    });
    expect(testClient.getDefaultOptions().queries?.gcTime).toBe(Infinity);
    testClient.clear();

    const productionLike = createAppQueryClient();
    expect(productionLike.getDefaultOptions().queries?.gcTime).toBe(
      5 * 60_000,
    );
    productionLike.clear();
  });
});

describe('query keys', () => {
  it('keeps public catalog keys free of user identity', () => {
    const productId = 'product-1';
    const userId = 'user-abc';
    const keys = [
      catalogKeys.all,
      catalogKeys.products(),
      catalogKeys.product(productId),
    ];
    for (const key of keys) {
      expect(key.join('.')).not.toMatch(/user/i);
      expect(key).not.toContain(userId);
    }
  });

  it('keeps product list and product detail keys from colliding', () => {
    const productId = 'products';
    expect(catalogKeys.products()).not.toEqual(
      catalogKeys.product(productId),
    );
    // Structural: list is [...'products']; detail is [...'product', id].
    expect(catalogKeys.products()).toEqual(['catalog', 'products']);
    expect(catalogKeys.product(productId)).toEqual([
      'catalog',
      'product',
      productId,
    ]);
  });

  it('includes user identity in user-owned keys', () => {
    const userId = 'user-abc';
    const productId = 'product-1';
    expect(accountKeys.profile(userId)).toEqual([
      'account',
      'profile',
      userId,
    ]);
    expect(ratingKeys.mine(userId, productId)).toEqual([
      'rating',
      'mine',
      userId,
      productId,
    ]);
    expect(ratingKeys.ratedProducts(userId)).toEqual([
      'rating',
      'ratedProducts',
      userId,
    ]);
  });

  it('returns stable keys for identical inputs', () => {
    expect(catalogKeys.product('p1')).toEqual(catalogKeys.product('p1'));
    expect(ratingKeys.mine('u1', 'p1')).toEqual(ratingKeys.mine('u1', 'p1'));
    expect(accountKeys.profile('u1')).toEqual(accountKeys.profile('u1'));
  });

  it('does not let public and user-scoped keys collide', () => {
    const productId = 'same-id';
    const publicKey = catalogKeys.product(productId).join('|');
    const userKey = ratingKeys.mine('user-1', productId).join('|');
    const profileKey = accountKeys.profile(productId).join('|');
    expect(publicKey).not.toBe(userKey);
    expect(publicKey).not.toBe(profileKey);
    expect(userKey).not.toBe(profileKey);
  });
});

describe('user-scoped cache cleanup', () => {
  it('removes owner caches for all users and keeps public catalog data', async () => {
    const client = createAppQueryClient({
      defaultOptions: {
        queries: {
          gcTime: Infinity,
        },
      },
    });

    await client.prefetchQuery({
      queryKey: catalogKeys.products(),
      queryFn: async () => [{ id: 'p1' }],
    });
    await client.prefetchQuery({
      queryKey: catalogKeys.product('p1'),
      queryFn: async () => ({ id: 'p1' }),
    });
    await client.prefetchQuery({
      queryKey: accountKeys.profile('user-1'),
      queryFn: async () => ({ id: 'user-1' }),
    });
    await client.prefetchQuery({
      queryKey: accountKeys.profile('user-2'),
      queryFn: async () => ({ id: 'user-2' }),
    });
    await client.prefetchQuery({
      queryKey: ratingKeys.mine('user-1', 'p1'),
      queryFn: async () => ({ score100: 80 }),
    });
    await client.prefetchQuery({
      queryKey: ratingKeys.ratedProducts('user-1'),
      queryFn: async () => ['p1'],
    });
    await client.prefetchQuery({
      queryKey: ratingKeys.ratedProducts('user-2'),
      queryFn: async () => ['p2'],
    });

    // Helper purges every user-scoped root (account + rating), not one user only —
    // intentional for sign-out / account-switch safety.
    await removeUserScopedQueries(client);

    expect(client.getQueryData(catalogKeys.products())).toEqual([{ id: 'p1' }]);
    expect(client.getQueryData(catalogKeys.product('p1'))).toEqual({
      id: 'p1',
    });
    expect(client.getQueryData(accountKeys.profile('user-1'))).toBeUndefined();
    expect(client.getQueryData(accountKeys.profile('user-2'))).toBeUndefined();
    expect(
      client.getQueryData(ratingKeys.mine('user-1', 'p1')),
    ).toBeUndefined();
    expect(
      client.getQueryData(ratingKeys.ratedProducts('user-1')),
    ).toBeUndefined();
    expect(
      client.getQueryData(ratingKeys.ratedProducts('user-2')),
    ).toBeUndefined();

    // Does not clear the entire QueryClient (catalog remains).
    expect(client.getQueryCache().getAll().length).toBeGreaterThan(0);

    await client.cancelQueries();
    client.clear();
  });
});

describe('AppProviders / render harness', () => {
  it('renders a child component', async () => {
    const rendered = await renderWithProviders(
      <View>
        <Text>infra-ok</Text>
      </View>,
    );
    expect(rendered.getByText('infra-ok')).toBeTruthy();
    await rendered.cleanup();
  });

  it('gives tests isolated QueryClient instances by default', async () => {
    const first = await renderWithProviders(<Text>a</Text>);
    const second = await renderWithProviders(<Text>b</Text>);
    expect(first.queryClient).not.toBe(second.queryClient);
    await first.cleanup();
    await second.cleanup();
  });

  it('respects a caller-provided QueryClient', async () => {
    const provided = createAppQueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity },
      },
    });
    let observed: ReturnType<typeof createAppQueryClient> | undefined;

    function Probe() {
      observed = useQueryClient() as ReturnType<typeof createAppQueryClient>;
      return <Text>provided-client</Text>;
    }

    const rendered = await renderWithProviders(<Probe />, {
      queryClient: provided,
    });
    expect(rendered.getByText('provided-client')).toBeTruthy();
    expect(observed).toBe(provided);
    expect(rendered.queryClient).toBe(provided);
    await rendered.cleanup();
  });

  it('disables lifecycle integration for ordinary component tests', async () => {
    // renderWithProviders passes enableLifecycle={false}. Confirm no Network
    // Manager wiring is required for a successful ordinary render.
    const rendered = await renderWithProviders(<Text>no-lifecycle</Text>);
    expect(rendered.getByText('no-lifecycle')).toBeTruthy();
    await rendered.cleanup();
  });

  it('cleanup cancels queries, clears cache, and unmounts', async () => {
    const rendered = await renderWithProviders(<Text>cleanup-me</Text>);
    const { queryClient } = rendered;

    await queryClient.prefetchQuery({
      queryKey: catalogKeys.product('p-cleanup'),
      queryFn: async () => ({ id: 'p-cleanup' }),
    });
    expect(queryClient.getQueryData(catalogKeys.product('p-cleanup'))).toEqual({
      id: 'p-cleanup',
    });
    expect(rendered.toJSON()).not.toBeNull();

    const cancelSpy = jest.spyOn(queryClient, 'cancelQueries');
    const clearSpy = jest.spyOn(queryClient, 'clear');

    await rendered.cleanup();

    expect(cancelSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(catalogKeys.product('p-cleanup'))).toBeUndefined();
    // After unmount the RNTL host rejects container access.
    expect(() => rendered.toJSON()).toThrow(/unmounted/i);

    cancelSpy.mockRestore();
    clearSpy.mockRestore();
  });
});
