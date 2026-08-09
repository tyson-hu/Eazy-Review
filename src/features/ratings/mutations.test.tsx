import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import * as ratingsApi from '@/src/features/ratings/api';
import { useSubmitRatingMutation } from '@/src/features/ratings/mutations';
import {
  useUserRatedProductsQuery,
  useUserRatingQuery,
} from '@/src/features/ratings/queries';
import { createAppQueryClient } from '@/src/lib/query/client';
import { catalogKeys, ratingKeys } from '@/src/lib/query/keys';
import { AppProviders } from '@/src/providers/AppProviders';

const mockAuth: {
  status: 'initializing' | 'signed-out' | 'signed-in';
  user: null | { id: string; email: string };
  isSignedIn: boolean;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
} = {
  status: 'signed-in',
  user: { id: 'user-a', email: 'a@example.com' },
  isSignedIn: true,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/src/features/ratings/api', () => ({
  getUserRating: jest.fn(),
  getUserRatedProducts: jest.fn(),
  saveUserRating: jest.fn(),
}));

const mockGetUserRating = jest.mocked(ratingsApi.getUserRating);
const mockGetUserRatedProducts = jest.mocked(ratingsApi.getUserRatedProducts);
const mockSaveUserRating = jest.mocked(ratingsApi.saveUserRating);

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders queryClient={queryClient} enableLifecycle={false}>
        {children}
      </AppProviders>
    );
  };
}

function testClient() {
  return createAppQueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

describe('rating query hooks', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    mockAuth.status = 'signed-in';
    mockAuth.user = { id: 'user-a', email: 'a@example.com' };
    mockAuth.isSignedIn = true;
    mockGetUserRating.mockReset();
    mockGetUserRatedProducts.mockReset();
    mockSaveUserRating.mockReset();
  });

  it('disables My Rating query without a user id', async () => {
    mockAuth.isSignedIn = false;
    mockAuth.user = null;
    mockAuth.status = 'signed-out';

    const client = testClient();
    const { result, unmount } = await renderHook(
      () => useUserRatingQuery('product-1'),
      { wrapper: wrapperFor(client) },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetUserRating).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });

  it('uses exact authenticated user id in ratingKeys.mine', async () => {
    mockGetUserRating.mockResolvedValue({
      look: 8,
      comfort: 7,
      quality: 9,
      outfit: 6,
      value: 8,
      overall: 8,
      privateNote: null,
    });

    const client = testClient();
    const { result, unmount } = await renderHook(
      () => useUserRatingQuery('product-1'),
      { wrapper: wrapperFor(client) },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetUserRating).toHaveBeenCalledWith(
      'product-1',
      'user-a',
      expect.anything(),
    );
    expect(client.getQueryData(ratingKeys.mine('user-a', 'product-1'))).toEqual(
      expect.objectContaining({ overall: 8 }),
    );
    unmount();
    client.clear();
  });

  it('disables Rated Products without a user', async () => {
    mockAuth.isSignedIn = false;
    mockAuth.user = null;

    const client = testClient();
    const { result, unmount } = await renderHook(() => useUserRatedProductsQuery(), {
      wrapper: wrapperFor(client),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetUserRatedProducts).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });
});

describe('useSubmitRatingMutation', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    mockAuth.status = 'signed-in';
    mockAuth.user = { id: 'user-a', email: 'a@example.com' };
    mockAuth.isSignedIn = true;
    mockSaveUserRating.mockReset();
  });

  it('invalidates product detail, product list, My Rating, and Rated Products', async () => {
    mockSaveUserRating.mockResolvedValue({
      look: 8,
      comfort: 7,
      quality: 9,
      outfit: 6,
      value: 8,
      overall: 9,
      privateNote: null,
    });

    const client = testClient();
    const productId = 'product-1';
    client.setQueryData(catalogKeys.product(productId), {
      ratingSummary: { communityScore: 50, ratingCount: 1 },
    });
    client.setQueryData(catalogKeys.products(), [{ id: productId }]);
    client.setQueryData(ratingKeys.mine('user-a', productId), {
      overall: 5,
      privateNote: null,
    });
    client.setQueryData(ratingKeys.ratedProducts('user-a'), []);

    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useSubmitRatingMutation(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        productId,
        userId: 'user-a',
        look: 8,
        comfort: 7,
        quality: 9,
        outfit: 6,
        value: 8,
        overall: 9,
        privateNote: null,
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: catalogKeys.product(productId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: catalogKeys.products(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ratingKeys.mine('user-a', productId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ratingKeys.ratedProducts('user-a'),
    });
    expect(mockSaveUserRating).toHaveBeenCalledTimes(1);
    expect(result.current.failureCount).toBe(0);
    // Community Score is never optimistically written by the mutation path.
    expect(mockSaveUserRating.mock.calls[0]?.[0]).not.toHaveProperty(
      'communityScore',
    );

    unmount();
    client.clear();
  });

  it('does not auto-retry mutations', () => {
    const client = testClient();
    const options = client.getDefaultOptions();
    expect(options.mutations?.retry).toBe(false);
  });
});
