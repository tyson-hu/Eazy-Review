import { act, fireEvent, waitFor } from '@testing-library/react-native';

import ProductDetailScreen from '@/app/product/[id]/index';
import RateProductScreen from '@/app/product/[id]/rate';
import { getProductById } from '@/src/features/products/api';
import { completeProductDetail } from '@/src/features/products/catalogViewModelTestFixtures';
import { COMPLETE_PRODUCT_ID } from '@/src/features/products/catalogTestFixtures';
import {
  getUserRating,
  saveUserRating,
} from '@/src/features/ratings/api';
import { RATING_DIMENSIONS } from '@/src/features/ratings/dimensions';
import { RATING_USER_MESSAGES } from '@/src/features/ratings/errors';
import { sampleMyRating, uniformDimensions } from '@/src/features/ratings/testFixtures';
import type { MyRating } from '@/src/features/ratings/types';
import { createAppQueryClient } from '@/src/lib/query/client';
import { ratingKeys } from '@/src/lib/query/keys';
import { renderWithProviders } from '@/src/test/renderWithProviders';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
const mockStackScreen = jest.fn((_props: Record<string, unknown>) => null);
let mockRouteId: string | undefined = COMPLETE_PRODUCT_ID;
let mockAuth = {
  status: 'signed-out' as 'initializing' | 'signed-out' | 'signed-in',
  user: null as null | { id: string; email: string },
  isSignedIn: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('@react-native-community/slider', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: (props: Record<string, unknown>) => {
      mockStackScreen(props);
      return null;
    },
  },
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    dismissTo: mockDismissTo,
  }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/src/features/products/api', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
}));

jest.mock('@/src/features/ratings/api', () => ({
  getUserRating: jest.fn(),
  getUserRatedProducts: jest.fn(),
  saveUserRating: jest.fn(),
}));

const mockGetProductById = jest.mocked(getProductById);
const mockGetUserRating = jest.mocked(getUserRating);
const mockSaveUserRating = jest.mocked(saveUserRating);

function testClient() {
  return createAppQueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retryDelay: 0,
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });
}

function signInAsA() {
  mockAuth = {
    status: 'signed-in',
    user: { id: 'user-a', email: 'a@example.com' },
    isSignedIn: true,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  };
}

/** Fill every dimension through the native slider value-change contract. */
async function fillAllDimensions(
  rendered: Awaited<ReturnType<typeof renderWithProviders>>,
  value: number,
) {
  for (const dim of RATING_DIMENSIONS) {
    await act(async () => {
      fireEvent(
        rendered.getByTestId(`rate-dim-${dim.key}-slider`),
        'valueChange',
        value,
      );
    });
  }
}

describe('Task 17 rate gate and My Rating composition', () => {
  beforeEach(() => {
    mockRouteId = COMPLETE_PRODUCT_ID;
    mockPush.mockReset();
    mockReplace.mockReset();
    mockDismissTo.mockReset();
    mockStackScreen.mockReset();
    mockAuth = {
      status: 'signed-out',
      user: null,
      isSignedIn: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    };
    mockGetProductById.mockResolvedValue(completeProductDetail);
    mockGetUserRating.mockReset();
    mockSaveUserRating.mockReset();
  });

  it('keeps signed-out Sign in to rate with product return path', async () => {
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('sign-in-to-rate')).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.press(rendered.getByTestId('sign-in-to-rate'));
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/auth/sign-in',
      params: { returnTo: `/product/${COMPLETE_PRODUCT_ID}` },
    });
    await rendered.cleanup();
  });

  it('shows Rate this product when signed in with no rating', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);

    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-this-product')).toBeTruthy(),
    );
    expect(rendered.getByText('Not rated yet')).toBeTruthy();
    await rendered.cleanup();
  });

  it('shows Edit my rating with 0–100 My Rating when signed in with a rating', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(sampleMyRating({ score100: 90, look: 9 }));

    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('edit-my-rating')).toBeTruthy(),
    );
    expect(rendered.getByText('90 / 100')).toBeTruthy();
    expect(rendered.getByText('Excellent')).toBeTruthy();
    expect(
      rendered.getByText(
        'Edit your rating to review all 10 dimensions and your private note.',
      ),
    ).toBeTruthy();
    expect(rendered.queryByText('9/10')).toBeNull();
    expect(rendered.queryByText('owner only')).toBeNull();
    await rendered.cleanup();
  });

  it('redirects signed-out Rate route to sign-in', async () => {
    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/auth/sign-in',
        params: { returnTo: `/product/${COMPLETE_PRODUCT_ID}` },
      }),
    );
    await rendered.cleanup();
  });

  it('keeps edge Back but disables full-screen dismissal on Rate/Edit', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-dim-look')).toBeTruthy(),
    );

    const hasRateGestureOptions = mockStackScreen.mock.calls.some(([props]) => {
      const options = (props as { options?: Record<string, unknown> }).options;
      return (
        options?.gestureEnabled === true &&
        options?.fullScreenGestureEnabled === false
      );
    });
    expect(hasRateGestureOptions).toBe(true);
    await rendered.cleanup();
  });

  it('loads empty form for first rating and empties private note', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-dim-look')).toBeTruthy(),
    );
    expect(rendered.getByTestId('rate-dim-look-value').props.children).toBe('—');
    expect(rendered.getByTestId('rate-private-note').props.value).toBe('');
    expect(rendered.getByText('Private note')).toBeTruthy();
    expect(rendered.getByText(/— \/ 100/)).toBeTruthy();
    await rendered.cleanup();
  });

  it('loads existing rating values into the edit form', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(
      sampleMyRating({
        ...uniformDimensions(8),
        score100: 80,
        privateNote: 'keep private',
      }),
    );

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-dim-look-value').props.children).toBe(
        '8',
      ),
    );
    expect(rendered.getByTestId('rate-private-note').props.value).toBe(
      'keep private',
    );
    expect(rendered.getByText('80 / 100')).toBeTruthy();
    await rendered.cleanup();
  });

  it('preserves in-progress dimensions and private note across owner rating refetch', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(
      sampleMyRating({
        ...uniformDimensions(8),
        score100: 80,
        privateNote: 'server-note',
      }),
    );

    const client = testClient();
    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: client,
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-private-note').props.value).toBe(
        'server-note',
      ),
    );

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('rate-private-note'),
        'draft while reconnecting',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-dim-look-clear'));
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-dim-look-dec')); // → 0
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-dim-look-inc')); // → 0.5
    });

    mockGetUserRating.mockResolvedValue(
      sampleMyRating({
        ...uniformDimensions(9),
        score100: 90,
        privateNote: 'server-note-refreshed',
      }),
    );

    await act(async () => {
      await client.refetchQueries({
        queryKey: ratingKeys.mine('user-a', COMPLETE_PRODUCT_ID),
      });
    });

    await waitFor(() =>
      expect(mockGetUserRating.mock.calls.length).toBeGreaterThan(1),
    );

    // Soft-refetch must not remount and wipe draft form state.
    expect(rendered.getByTestId('rate-private-note').props.value).toBe(
      'draft while reconnecting',
    );
    expect(rendered.getByTestId('rate-dim-look-value').props.children).toBe(
      '0.5',
    );
    await rendered.cleanup();
  });

  it('shows why submit cannot proceed when dimensions are incomplete', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-dim-look')).toBeTruthy(),
    );

    // Rate only Look — leave the other nine unanswered.
    await act(async () => {
      fireEvent(
        rendered.getByTestId('rate-dim-look-slider'),
        'valueChange',
        8,
      );
    });

    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-form-error')).toBeTruthy(),
    );
    expect(rendered.getByTestId('rate-form-error').props.children).toBe(
      '9 categories still need a score before you can save.',
    );
    // Incomplete fields show the same inline copy under each unanswered row.
    expect(
      rendered.getAllByText(RATING_USER_MESSAGES.scoreIncomplete).length,
    ).toBe(9);
    expect(mockSaveUserRating).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('preserves form values on failed save', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);
    mockSaveUserRating.mockRejectedValue(
      new Error('network boom'),
    );

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-dim-look')).toBeTruthy(),
    );

    await fillAllDimensions(rendered, 9);

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('rate-private-note'),
        'note preserved',
      );
    });

    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-form-error')).toBeTruthy(),
    );
    expect(rendered.getByTestId('rate-dim-look-value').props.children).toBe(
      '9',
    );
    expect(rendered.getByTestId('rate-private-note').props.value).toBe(
      'note preserved',
    );
    expect(mockDismissTo).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('prevents duplicate submit while save is in flight and dismisses on success', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);

    let resolveSave: ((value: MyRating) => void) | undefined;
    mockSaveUserRating.mockImplementation(
      () =>
        new Promise<MyRating>((resolve) => {
          resolveSave = resolve;
        }),
    );

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-dim-look')).toBeTruthy(),
    );

    await fillAllDimensions(rendered, 8);

    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });

    expect(mockSaveUserRating).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.(sampleMyRating());
    });

    await waitFor(() =>
      expect(mockDismissTo).toHaveBeenCalledWith(
        `/product/${COMPLETE_PRODUCT_ID}`,
      ),
    );
    await rendered.cleanup();
  });

  it('does not flash User A rating when switched to User B', async () => {
    signInAsA();
    mockGetUserRating.mockImplementation(async (_productId, userId) => {
      if (userId === 'user-a') {
        return sampleMyRating({ score100: 90, privateNote: 'a-secret' });
      }
      return null;
    });

    const client = testClient();
    const renderedA = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: client,
    });

    await waitFor(() =>
      expect(renderedA.getByTestId('edit-my-rating')).toBeTruthy(),
    );
    expect(renderedA.getByText('90 / 100')).toBeTruthy();
    await renderedA.cleanup();

    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-b', email: 'b@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    };

    const renderedB = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: client,
    });

    await waitFor(() =>
      expect(renderedB.getByTestId('rate-this-product')).toBeTruthy(),
    );
    expect(renderedB.queryByText('a-secret')).toBeNull();
    expect(renderedB.getByText('Not rated yet')).toBeTruthy();
    await renderedB.cleanup();
  });
});
