import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';

import FeedScreen from '@/app/(tabs)/feed';
import { getProducts } from '@/src/features/products/api';
import {
  completeProductCard,
  sparseProductCard,
} from '@/src/features/products/catalogViewModelTestFixtures';
import { CatalogError } from '@/src/features/products/errors';
import { createAppQueryClient } from '@/src/lib/query/client';
import { catalogKeys } from '@/src/lib/query/keys';
import { renderWithProviders } from '@/src/test/renderWithProviders';
import type { ProductCardData } from '@/src/types/product';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/src/features/products/api', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
}));

const mockGetProducts = jest.mocked(getProducts);

function testClient(options: { staleTime?: number } = {}) {
  return createAppQueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retryDelay: 0,
        staleTime: options.staleTime ?? Infinity,
      },
    },
  });
}

function card(
  overrides: Partial<ProductCardData> & Pick<ProductCardData, 'id'>,
): ProductCardData {
  return {
    ...completeProductCard,
    name: overrides.name ?? `Product ${overrides.id}`,
    sku: overrides.sku ?? overrides.id,
    ...overrides,
  };
}

describe('connected Feed screen', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    mockPush.mockClear();
    mockGetProducts.mockReset();
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('renders the initial loading state', async () => {
    mockGetProducts.mockReturnValue(new Promise(() => {}));
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    expect(rendered.getByText('Loading products...')).toBeTruthy();
    expect(rendered.queryByText('Feed comes after connected data')).toBeNull();
    await rendered.cleanup();
  });

  it('shows the empty catalog state', async () => {
    mockGetProducts.mockResolvedValue([]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('No published products yet')).toBeTruthy(),
    );
    expect(rendered.queryByText('Newly Added')).toBeNull();
    await rendered.cleanup();
  });

  it('shows Newly Added and hides ranked sections on the two-product fixtures', async () => {
    mockGetProducts.mockResolvedValue([
      completeProductCard,
      sparseProductCard,
    ]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Newly Added')).toBeTruthy(),
    );
    expect(rendered.queryByText('Best Eazy Scores')).toBeNull();
    expect(rendered.queryByText('Most Rated')).toBeNull();
    expect(rendered.queryByText('Feed comes after connected data')).toBeNull();

    const newlyAdded = rendered.getByTestId('feed-section-newly-added');
    expect(newlyAdded).toBeTruthy();
    expect(rendered.getByText(completeProductCard.name)).toBeTruthy();
    expect(rendered.getByText(sparseProductCard.name)).toBeTruthy();

    await fireEvent.press(
      rendered.getByTestId(`product-card-${sparseProductCard.id}`),
    );
    expect(mockPush).toHaveBeenCalledWith(
      `/product/${sparseProductCard.id}`,
    );
    await rendered.cleanup();
  });

  it('shows Best Eazy Scores when two products have scores and keeps Most Rated hidden', async () => {
    const olderHigh = card({
      id: 'older-high',
      name: 'Older High',
      eazyScore: 91,
      ratingCount: 0,
    });
    const newerLow = card({
      id: 'newer-low',
      name: 'Newer Low',
      eazyScore: 74,
      ratingCount: 0,
    });
    mockGetProducts.mockResolvedValue([olderHigh, newerLow]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Best Eazy Scores')).toBeTruthy(),
    );
    expect(rendered.getByText('Newly Added')).toBeTruthy();
    expect(rendered.queryByText('Most Rated')).toBeNull();

    const newlyAddedCards = within(
      rendered.getByTestId('feed-section-newly-added'),
    ).getAllByTestId(/^product-card-/);
    expect(
      newlyAddedCards.map((node) => node.props.testID),
    ).toEqual([
      `product-card-${newerLow.id}`,
      `product-card-${olderHigh.id}`,
    ]);
    await rendered.cleanup();
  });

  it('shows Most Rated only when two products have ratings', async () => {
    mockGetProducts.mockResolvedValue([
      card({
        id: 'oldest-high-eazy',
        name: 'Oldest High Eazy',
        eazyScore: 90,
        ratingCount: 2,
      }),
      card({
        id: 'middle-most-rated',
        name: 'Middle Most Rated',
        eazyScore: 70,
        ratingCount: 8,
      }),
      card({
        id: 'newest-mid',
        name: 'Newest Mid',
        eazyScore: 80,
        ratingCount: 3,
      }),
    ]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Most Rated')).toBeTruthy(),
    );
    expect(rendered.getByTestId('feed-section-most-rated')).toBeTruthy();
    await rendered.cleanup();
  });

  it('opens Product Detail from a ranked-section card', async () => {
    const first = card({
      id: 'first',
      name: 'First',
      eazyScore: 88,
      ratingCount: 3,
    });
    const second = card({
      id: 'second',
      name: 'Second',
      eazyScore: 70,
      ratingCount: 4,
    });
    mockGetProducts.mockResolvedValue([first, second]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Best Eazy Scores')).toBeTruthy(),
    );

    const bestEazy = rendered.getByTestId('feed-section-best-eazy-scores');
    await fireEvent.press(
      within(bestEazy).getByTestId(`product-card-${first.id}`),
    );
    expect(mockPush).toHaveBeenCalledWith(`/product/${first.id}`);
    await rendered.cleanup();
  });

  it('shows offline without cache and makes no request', async () => {
    onlineManager.setOnline(false);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText("You're offline.")).toBeTruthy(),
    );
    expect(rendered.getByText('Connect to the internet and try again.')).toBeTruthy();
    expect(mockGetProducts).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('retains cached data offline with a restrained stale-data warning', async () => {
    const queryClient = testClient();
    queryClient.setQueryData(catalogKeys.products(), [completeProductCard]);
    onlineManager.setOnline(false);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient,
    });

    expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy();
    expect(rendered.getByText('Newly Added')).toBeTruthy();
    expect(rendered.getByText("You're offline.")).toBeTruthy();
    expect(
      rendered.getByText('Prices and availability may have changed.'),
    ).toBeTruthy();
    expect(mockGetProducts).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('keeps cached data visible during a background refresh', async () => {
    const queryClient = testClient({ staleTime: 0 });
    queryClient.setQueryData(catalogKeys.products(), [completeProductCard]);
    mockGetProducts.mockReturnValue(new Promise(() => {}));
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient,
    });

    expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy();
    await waitFor(() =>
      expect(rendered.getByText('Refreshing catalog...')).toBeTruthy(),
    );
    await rendered.cleanup();
  });

  it('shows a request error and manual retry issues a new request', async () => {
    const failure = new CatalogError('server-error', 'failed');
    mockGetProducts
      .mockRejectedValueOnce(failure)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce([completeProductCard]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Could not load products')).toBeTruthy(),
    );
    expect(mockGetProducts).toHaveBeenCalledTimes(2);

    await act(async () => {
      await fireEvent.press(rendered.getByText('Try again'));
    });
    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(mockGetProducts).toHaveBeenCalledTimes(3);
    await rendered.cleanup();
  });
});
