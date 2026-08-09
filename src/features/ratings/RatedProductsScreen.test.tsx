import { waitFor } from '@testing-library/react-native';

import RatedProductsScreen from '@/app/account/rated-products';
import type { RatedProductItem } from '@/src/features/ratings/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { renderWithProviders } from '@/src/test/renderWithProviders';

const mockPush = jest.fn();
let mockAuth = {
  status: 'signed-in' as 'initializing' | 'signed-out' | 'signed-in',
  user: { id: 'user-a', email: 'a@example.com' } as null | {
    id: string;
    email: string;
  },
  isSignedIn: true,
};

let mockQuery: Partial<UseQueryResult<RatedProductItem[], Error>> = {
  data: undefined,
  isPending: true,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    dismissTo: jest.fn(),
  }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/src/features/ratings/queries', () => ({
  useUserRatedProductsQuery: () => mockQuery,
}));

const item: RatedProductItem = {
  productId: 'product-1',
  brand: 'Nike',
  name: 'Air Force 1',
  sku: 'CW2288-111',
  imageUrl: 'https://example.test/a.png',
  communityScore: 80,
  ratingCount: 2,
  myOverall: 9,
  myScores: {
    look: 8,
    comfort: 7,
    quality: 9,
    outfit: 6,
    value: 8,
    overall: 9,
  },
  ratedAt: '2026-08-09T12:00:00.000Z',
};

describe('Rated Products screen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
    };
    mockQuery = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
  });

  it('shows loading state', async () => {
    const rendered = await renderWithProviders(<RatedProductsScreen />);
    expect(rendered.getByText('Loading rated products...')).toBeTruthy();
    await rendered.cleanup();
  });

  it('shows empty state', async () => {
    mockQuery = {
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    const rendered = await renderWithProviders(<RatedProductsScreen />);
    expect(rendered.getByText('No rated products yet')).toBeTruthy();
    await rendered.cleanup();
  });

  it('shows error with retry', async () => {
    const refetch = jest.fn();
    mockQuery = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('fail'),
      refetch,
    };
    const rendered = await renderWithProviders(<RatedProductsScreen />);
    expect(rendered.getByText('Could not load rated products')).toBeTruthy();
    await rendered.cleanup();
  });

  it('renders rated products with My Rating distinct from Community Score', async () => {
    mockQuery = {
      data: [item],
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    const rendered = await renderWithProviders(<RatedProductsScreen />);
    await waitFor(() =>
      expect(rendered.getByTestId('rated-product-product-1')).toBeTruthy(),
    );
    expect(rendered.getByText('My Rating')).toBeTruthy();
    expect(rendered.getByText('Community Score')).toBeTruthy();
    expect(rendered.getByText('9')).toBeTruthy();
    expect(rendered.queryByText(/private|secret note/i)).toBeNull();
    await rendered.cleanup();
  });
});
