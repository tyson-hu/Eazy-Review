import { act, fireEvent, waitFor } from '@testing-library/react-native';

import ProductDetailScreen from '@/app/product/[id]/index';
import RateProductScreen from '@/app/product/[id]/rate';
import { getProductById } from '@/src/features/products/api';
import { completeProductDetail } from '@/src/features/products/catalogViewModelTestFixtures';
import { COMPLETE_PRODUCT_ID } from '@/src/features/products/catalogTestFixtures';
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
  }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/src/features/products/api', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
}));

const mockGetProductById = jest.mocked(getProductById);

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
    expect(rendered.queryByText(/My Rating saved|save rating/i)).toBeNull();
    await rendered.cleanup();
  });

  it('shows honest unavailable state when signed in on detail', async () => {
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    };

    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText("Rating isn't available yet.")).toBeTruthy(),
    );
    expect(rendered.getByTestId('rating-unavailable').props.accessibilityState?.disabled ??
      rendered.getByTestId('rating-unavailable').props.disabled).toBeTruthy();
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

  it('shows unavailable Rate route when signed in without writing ratings', async () => {
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    };

    const rendered = await renderWithProviders(<RateProductScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText("Rating isn't available yet.")).toBeTruthy(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(rendered.queryByText(/look|comfort|quality|private note/i)).toBeNull();
    await rendered.cleanup();
  });
});
