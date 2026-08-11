import { act, fireEvent, waitFor } from '@testing-library/react-native';

import ProductDetailScreen from '@/app/product/[id]/index';
import RateProductScreen from '@/app/product/[id]/rate';
import { getProductById } from '@/src/features/products/api';
import { completeProductDetail } from '@/src/features/products/catalogViewModelTestFixtures';
import { COMPLETE_PRODUCT_ID } from '@/src/features/products/catalogTestFixtures';
import { getUserRating } from '@/src/features/ratings/api';
import { createAppQueryClient } from '@/src/lib/query/client';
import { renderWithProviders } from '@/src/test/renderWithProviders';

const mockPush = jest.fn();
const mockReplace = jest.fn();
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
    dismissTo: jest.fn(),
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

function testClient() {
  return createAppQueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retryDelay: 0,
        staleTime: Infinity,
      },
    },
  });
}

/**
 * Task 16 sign-in gate remains authoritative for signed-out users.
 * Task 17 owns the signed-in Rate / Edit path (covered in RateAndDetail tests).
 */
describe('rate authentication gate', () => {
  beforeEach(() => {
    mockRouteId = COMPLETE_PRODUCT_ID;
    mockPush.mockReset();
    mockReplace.mockReset();
    mockAuth = {
      status: 'signed-out',
      user: null,
      isSignedIn: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    };
    mockGetProductById.mockResolvedValue(completeProductDetail);
    mockGetUserRating.mockResolvedValue(null);
  });

  it('shows Sign in to rate with safe return path for signed-out detail', async () => {
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
});
