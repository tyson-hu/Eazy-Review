import { Text, View } from 'react-native';

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
  });

  it('retries transient read failures once and skips 4xx', () => {
    expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(1, { status: 500 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 422 })).toBe(false);
  });
});

describe('query keys', () => {
  it('keeps public catalog keys free of user identity', () => {
    const productId = 'product-1';
    const keys = [
      catalogKeys.all,
      catalogKeys.products(),
      catalogKeys.product(productId),
    ];
    for (const key of keys) {
      expect(key.join('.')).not.toMatch(/user/i);
      expect(key).not.toContain('user-abc');
    }
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
    expect(ratingKeys.ratedProducts(userId)).toContain(userId);
  });

  it('returns stable keys for identical inputs', () => {
    expect(catalogKeys.product('p1')).toEqual(catalogKeys.product('p1'));
    expect(ratingKeys.mine('u1', 'p1')).toEqual(ratingKeys.mine('u1', 'p1'));
  });

  it('does not let public and user-scoped keys collide', () => {
    const productId = 'same-id';
    const publicKey = catalogKeys.product(productId).join('|');
    const userKey = ratingKeys.mine('user-1', productId).join('|');
    expect(publicKey).not.toBe(userKey);
  });
});

describe('AppProviders / render harness', () => {
  it('renders a child component', async () => {
    const { getByText } = await renderWithProviders(
      <View>
        <Text>infra-ok</Text>
      </View>,
    );
    expect(getByText('infra-ok')).toBeTruthy();
  });

  it('gives tests isolated QueryClient instances', async () => {
    const first = await renderWithProviders(<Text>a</Text>);
    const second = await renderWithProviders(<Text>b</Text>);
    expect(first.queryClient).not.toBe(second.queryClient);
  });

  it('can remove user-scoped cache without dropping catalog keys', async () => {
    const client = createAppQueryClient();
    await client.prefetchQuery({
      queryKey: catalogKeys.product('p1'),
      queryFn: async () => ({ id: 'p1' }),
    });
    await client.prefetchQuery({
      queryKey: accountKeys.profile('user-1'),
      queryFn: async () => ({ id: 'user-1' }),
    });
    await client.prefetchQuery({
      queryKey: ratingKeys.mine('user-1', 'p1'),
      queryFn: async () => ({ overall: 8 }),
    });

    removeUserScopedQueries(client);

    expect(client.getQueryData(catalogKeys.product('p1'))).toEqual({
      id: 'p1',
    });
    expect(client.getQueryData(accountKeys.profile('user-1'))).toBeUndefined();
    expect(
      client.getQueryData(ratingKeys.mine('user-1', 'p1')),
    ).toBeUndefined();
  });
});
