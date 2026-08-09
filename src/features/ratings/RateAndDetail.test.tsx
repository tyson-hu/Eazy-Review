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
import type { MyRating } from '@/src/features/ratings/types';
import { createAppQueryClient } from '@/src/lib/query/client';
import { renderWithProviders } from '@/src/test/renderWithProviders';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismissTo = jest.fn();
let mockRouteId: string | undefined = COMPLETE_PRODUCT_ID;
let mockAuth = {
  status: 'signed-out' as 'initializing' | 'signed-out' | 'signed-in',
  user: null as null | { id: string; email: string },
  isSignedIn: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
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

describe('Task 17 rate gate and My Rating composition', () => {
  beforeEach(() => {
    mockRouteId = COMPLETE_PRODUCT_ID;
    mockPush.mockReset();
    mockReplace.mockReset();
    mockDismissTo.mockReset();
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
    expect(rendered.queryByText(/Rating isn't available yet/i)).toBeNull();
    await rendered.cleanup();
  });

  it('shows Edit my rating when signed in with an existing rating', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue({
      look: 8,
      comfort: 7,
      quality: 9,
      outfit: 6,
      value: 8,
      overall: 9,
      privateNote: 'owner only',
    });

    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByTestId('edit-my-rating')).toBeTruthy(),
    );
    expect(rendered.getAllByText('9/10').length).toBeGreaterThan(0);
    // Private note must not appear in the public Detail composition.
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

  it('loads empty form for first rating and empties private note', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByLabelText('Overall')).toBeTruthy(),
    );
    expect(rendered.getByLabelText('Look').props.value).toBe('');
    expect(rendered.getByTestId('rate-private-note').props.value).toBe('');
    expect(rendered.getByText('Private note')).toBeTruthy();
    await rendered.cleanup();
  });

  it('loads existing rating values into the edit form', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue({
      look: 8,
      comfort: 7,
      quality: 9,
      outfit: 6,
      value: 8,
      overall: 9,
      privateNote: 'keep private',
    });

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByLabelText('Overall').props.value).toBe('9'),
    );
    expect(rendered.getByLabelText('Look').props.value).toBe('8');
    expect(rendered.getByTestId('rate-private-note').props.value).toBe(
      'keep private',
    );
    await rendered.cleanup();
  });

  it('rejects non-whole scores and preserves values on failed save', async () => {
    signInAsA();
    mockGetUserRating.mockResolvedValue(null);
    mockSaveUserRating.mockRejectedValue(new Error('network boom'));

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByLabelText('Overall')).toBeTruthy(),
    );

    await act(async () => {
      fireEvent.changeText(rendered.getByLabelText('Overall'), '5.5');
      fireEvent.changeText(rendered.getByLabelText('Look'), '8');
      fireEvent.changeText(rendered.getByLabelText('Comfort'), '7');
      fireEvent.changeText(rendered.getByLabelText('Quality'), '9');
      fireEvent.changeText(rendered.getByLabelText('Outfit'), '6');
      fireEvent.changeText(rendered.getByLabelText('Value'), '8');
    });

    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });

    expect(mockSaveUserRating).not.toHaveBeenCalled();
    expect(rendered.getByText(/whole number from 1 to 10/i)).toBeTruthy();

    // Fix overall and leave others; force save failure.
    await act(async () => {
      fireEvent.changeText(rendered.getByDisplayValue('5.5'), '9');
    });

    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('rate-form-error')).toBeTruthy(),
    );
    expect(rendered.getAllByDisplayValue('9').length).toBeGreaterThan(0);
    expect(rendered.getAllByDisplayValue('8').length).toBeGreaterThan(0);
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
      expect(rendered.getByLabelText('Overall')).toBeTruthy(),
    );

    await act(async () => {
      for (const [label, value] of [
        ['Overall', '9'],
        ['Look', '8'],
        ['Comfort', '7'],
        ['Quality', '9'],
        ['Outfit', '6'],
        ['Value', '8'],
      ] as const) {
        fireEvent.changeText(rendered.getByLabelText(label), value);
      }
    });

    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('rate-submit'));
    });

    expect(mockSaveUserRating).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave?.({
        look: 8,
        comfort: 7,
        quality: 9,
        outfit: 6,
        value: 8,
        overall: 9,
        privateNote: null,
      });
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
        return {
          look: 8,
          comfort: 7,
          quality: 9,
          outfit: 6,
          value: 8,
          overall: 9,
          privateNote: 'a-secret',
        };
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
    expect(renderedA.getAllByText('9/10').length).toBeGreaterThan(0);
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
