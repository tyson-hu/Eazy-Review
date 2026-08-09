import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import * as ratingsApi from '@/src/features/ratings/api';
import { RatingError, RATING_USER_MESSAGES } from '@/src/features/ratings/errors';
import { useSubmitRatingMutation } from '@/src/features/ratings/mutations';
import {
  useUserRatedProductsQuery,
  useUserRatingQuery,
} from '@/src/features/ratings/queries';
import { sampleMyRating, uniformDimensions } from '@/src/features/ratings/testFixtures';
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
    mockGetUserRating.mockResolvedValue(sampleMyRating());

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
      expect.objectContaining({ score100: 80 }),
    );
    unmount();
    client.clear();
  });

  it('exposes isOffline when onlineManager is offline', async () => {
    onlineManager.setOnline(false);
    mockGetUserRating.mockImplementation(async () => {
      throw new RatingError('offline', RATING_USER_MESSAGES.offline);
    });

    const client = testClient();
    const { result, unmount } = await renderHook(
      () => useUserRatingQuery('product-1'),
      { wrapper: wrapperFor(client) },
    );

    expect(result.current.isOffline).toBe(true);
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

  it('invalidates product, list, mine, and rated-products keys on success', async () => {
    mockSaveUserRating.mockResolvedValue(sampleMyRating());
    const client = testClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result, unmount } = await renderHook(() => useSubmitRatingMutation(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      await result.current.mutateAsync({
        productId: 'product-1',
        ...uniformDimensions(8),
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        catalogKeys.product('product-1'),
        catalogKeys.products(),
        ratingKeys.mine('user-a', 'product-1'),
        ratingKeys.ratedProducts('user-a'),
      ]),
    );
    unmount();
    client.clear();
  });

  it('enters mutationFn offline and settles with offline error (not paused)', async () => {
    onlineManager.setOnline(false);
    mockSaveUserRating.mockImplementation(async (_input, options) => {
      if (options?.isOnline?.() === false) {
        throw new RatingError('offline', RATING_USER_MESSAGES.offline, {
          source: 'transport',
        });
      }
      return sampleMyRating();
    });

    const client = testClient();
    const { result, unmount } = await renderHook(() => useSubmitRatingMutation(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          productId: 'product-1',
          ...uniformDimensions(8),
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.error?.code).toBe('offline');
    expect(mockSaveUserRating).toHaveBeenCalled();
    unmount();
    client.clear();
  });

  it('does not confuse transport failure with known offline', async () => {
    onlineManager.setOnline(true);
    mockSaveUserRating.mockRejectedValue(
      new RatingError('server-error', RATING_USER_MESSAGES.backendUnreachable, {
        source: 'transport',
      }),
    );

    const client = testClient();
    const { result, unmount } = await renderHook(() => useSubmitRatingMutation(), {
      wrapper: wrapperFor(client),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          productId: 'product-1',
          ...uniformDimensions(8),
        });
      } catch {
        // expected
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('server-error');
    expect(result.current.error?.message).not.toMatch(/offline/i);
    unmount();
    client.clear();
  });
});

describe('rated products query', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    mockAuth.isSignedIn = true;
    mockAuth.user = { id: 'user-a', email: 'a@example.com' };
    mockGetUserRatedProducts.mockReset();
  });

  it('loads owner list', async () => {
    mockGetUserRatedProducts.mockResolvedValue([]);
    const client = testClient();
    const { result, unmount } = await renderHook(
      () => useUserRatedProductsQuery(),
      { wrapper: wrapperFor(client) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    unmount();
    client.clear();
  });
});
