import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import FeedScreen from '@/app/(tabs)/feed';
import { getFeedCollections } from '@/src/features/feed/api';
import { getProducts } from '@/src/features/products/api';
import {
    completeProductCard,
    sparseProductCard,
} from '@/src/features/products/catalogViewModelTestFixtures';
import { CatalogError } from '@/src/features/products/errors';
import { createAppQueryClient } from '@/src/lib/query/client';
import { catalogKeys } from '@/src/lib/query/keys';
import { renderWithProviders } from '@/src/test/renderWithProviders';
import type { FeedCollection, ProductCardData } from '@/src/types/product';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/src/features/products/api', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
}));

jest.mock('@/src/features/feed/api', () => ({
  getFeedCollections: jest.fn(),
}));

const mockGetProducts = jest.mocked(getProducts);
const mockGetFeedCollections = jest.mocked(getFeedCollections);

function curatedCollection(
  overrides: Partial<FeedCollection> & Pick<FeedCollection, 'slug' | 'productIds'>,
): FeedCollection {
  return {
    id: overrides.id ?? `collection-${overrides.slug}`,
    slug: overrides.slug,
    title: overrides.title ?? "Editor's Picks",
    caption: overrides.caption ?? 'Picked by Eazy Review',
    leadLabel: overrides.leadLabel ?? "Editor's pick",
    signal: overrides.signal ?? 'eazy',
    isRanked: overrides.isRanked ?? false,
    feedPosition: overrides.feedPosition ?? 150,
    productIds: overrides.productIds,
  };
}

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
    mockGetFeedCollections.mockReset();
    mockGetFeedCollections.mockResolvedValue([]);
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
    expect(rendered.getByText('Latest additions to the catalog')).toBeTruthy();
    expect(rendered.getByText(completeProductCard.name)).toBeTruthy();
    expect(rendered.getByText(sparseProductCard.name)).toBeTruthy();

    // The newest product leads as the spotlight; the rest continue as rows.
    expect(
      within(newlyAdded).getByTestId(`feed-spotlight-${sparseProductCard.id}`),
    ).toBeTruthy();
    expect(rendered.getByText('Latest addition')).toBeTruthy();
    expect(
      within(newlyAdded).getByTestId(`feed-row-${completeProductCard.id}`),
    ).toBeTruthy();
    expect(rendered.queryAllByTestId(/^product-card-/)).toHaveLength(0);

    await fireEvent.press(
      rendered.getByTestId(`feed-row-${completeProductCard.id}`),
    );
    expect(mockPush).toHaveBeenCalledWith(
      `/product/${completeProductCard.id}`,
    );
    await rendered.cleanup();
  });

  it('renders honest spotlight states for a sparse lead product', async () => {
    mockGetProducts.mockResolvedValue([sparseProductCard]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(
        rendered.getByTestId(`feed-spotlight-${sparseProductCard.id}`),
      ).toBeTruthy(),
    );
    expect(rendered.getByText('No image available')).toBeTruthy();
    expect(rendered.getByText('Not assessed yet')).toBeTruthy();
    expect(rendered.getByText('No ratings yet')).toBeTruthy();
    expect(rendered.getByText('No verified offer available')).toBeTruthy();
    expect(rendered.queryByTestId(/^feed-list-/)).toBeNull();
    await rendered.cleanup();
  });

  it('renders the spotlight score, reason, and price signal for a complete lead product', async () => {
    mockGetProducts.mockResolvedValue([completeProductCard]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(
        rendered.getByTestId(`feed-spotlight-${completeProductCard.id}`),
      ).toBeTruthy(),
    );
    expect(rendered.getByText('79 / 100')).toBeTruthy();
    expect(rendered.getByText('Good · Editorial assessment')).toBeTruthy();
    expect(rendered.getByText('Lowest verified offer')).toBeTruthy();
    expect(
      rendered.getByText("$114.99 USD · DICK'S Sporting Goods"),
    ).toBeTruthy();
    expect(rendered.getByText('View product')).toBeTruthy();
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
    expect(rendered.getByText('Ranked by Eazy Score')).toBeTruthy();

    const newlyAdded = rendered.getByTestId('feed-section-newly-added');
    expect(
      within(newlyAdded).getByTestId(`feed-spotlight-${newerLow.id}`),
    ).toBeTruthy();
    const newlyAddedRows = within(newlyAdded).getAllByTestId(
      /^feed-row-(?!rank-|image-)/,
    );
    expect(newlyAddedRows.map((node) => node.props.testID)).toEqual([
      `feed-row-${olderHigh.id}`,
    ]);
    // Newly Added is recency, not a ranking: no rank numbers.
    expect(within(newlyAdded).queryAllByTestId(/^feed-row-rank-/)).toHaveLength(
      0,
    );
    expect(
      within(newlyAdded).queryAllByTestId(/^feed-spotlight-rank-/),
    ).toHaveLength(0);

    const bestEazy = rendered.getByTestId('feed-section-best-eazy-scores');
    expect(within(bestEazy).queryAllByTestId(/^feed-spotlight-/)).toHaveLength(0);
    const bestEazyRows = within(bestEazy).getAllByTestId(
      /^feed-row-(?!rank-|image-)/,
    );
    expect(bestEazyRows.map((node) => node.props.testID)).toEqual([
      `feed-row-${olderHigh.id}`,
      `feed-row-${newerLow.id}`,
    ]);
    expect(
      within(bestEazy).getByTestId(`feed-row-rank-${olderHigh.id}`).props
        .children,
    ).toBe(1);
    expect(
      within(bestEazy).getByTestId(`feed-row-rank-${newerLow.id}`).props
        .children,
    ).toBe(2);
    expect(within(bestEazy).getByText('91 / 100')).toBeTruthy();
    expect(within(bestEazy).getByText('Excellent')).toBeTruthy();
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
        communityScore: 82,
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
    const mostRated = rendered.getByTestId('feed-section-most-rated');
    expect(
      rendered.getByText('Ranked by number of community ratings'),
    ).toBeTruthy();

    // Most Rated foregrounds Community Score and the rating count, never Eazy Score.
    const rows = within(mostRated).getAllByTestId(/^feed-row-(?!rank-|image-)/);
    expect(rows.map((node) => node.props.testID)).toEqual([
      'feed-row-middle-most-rated',
      'feed-row-newest-mid',
      'feed-row-oldest-high-eazy',
    ]);
    expect(within(mostRated).getAllByText('Community Score')).toHaveLength(3);
    expect(within(mostRated).queryByText('Eazy Score')).toBeNull();
    expect(within(mostRated).getByText('82 / 100')).toBeTruthy();
    expect(within(mostRated).getByText('8 ratings')).toBeTruthy();
    expect(within(mostRated).getAllByText('No score yet')).toHaveLength(2);
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
      within(bestEazy).getByTestId(`feed-row-${first.id}`),
    );
    expect(mockPush).toHaveBeenCalledWith(`/product/${first.id}`);

    mockPush.mockClear();
    await fireEvent.press(rendered.getByTestId(`feed-spotlight-${second.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/product/${second.id}`);
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
    queryClient.setQueryData(catalogKeys.feedCollections(), []);
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
    queryClient.setQueryData(catalogKeys.feedCollections(), []);
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
    expect(mockGetFeedCollections).toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('lets a curated collection at position 50 own the spotlight', async () => {
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
    mockGetFeedCollections.mockResolvedValue([
      curatedCollection({
        slug: 'cover-story',
        title: "Editor's Picks",
        caption: 'Picked by Eazy Review',
        leadLabel: "Editor's pick",
        feedPosition: 50,
        productIds: [olderHigh.id, newerLow.id],
      }),
    ]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText("Editor's Picks")).toBeTruthy(),
    );
    const curated = rendered.getByTestId('feed-section-collection:cover-story');
    expect(within(curated).getByText('Picked by Eazy Review')).toBeTruthy();
    expect(
      within(curated).getByTestId(`feed-spotlight-${olderHigh.id}`),
    ).toBeTruthy();
    expect(rendered.getByText("Editor's pick")).toBeTruthy();
    expect(within(curated).queryAllByTestId(/^feed-row-rank-/)).toHaveLength(0);
    expect(
      within(curated).queryByTestId(`feed-spotlight-rank-${olderHigh.id}`),
    ).toBeNull();
    expect(rendered.getByText('Newly Added')).toBeTruthy();
    await rendered.cleanup();
  });

  it('numbers a ranked curated spotlight as 1 and continues rows at 2', async () => {
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
    mockGetFeedCollections.mockResolvedValue([
      curatedCollection({
        slug: 'cover-story',
        title: "Editor's Picks",
        caption: 'Picked by Eazy Review',
        leadLabel: "Editor's pick",
        isRanked: true,
        feedPosition: 50,
        productIds: [olderHigh.id, newerLow.id],
      }),
    ]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText("Editor's Picks")).toBeTruthy(),
    );
    const curated = rendered.getByTestId('feed-section-collection:cover-story');
    expect(
      within(curated).getByTestId(`feed-spotlight-rank-${olderHigh.id}`).props
        .children,
    ).toBe(1);
    expect(
      within(curated).getByTestId(`feed-spotlight-${olderHigh.id}`).props
        .accessibilityLabel,
    ).toContain('Rank 1');
    expect(
      within(curated).getByTestId(`feed-row-rank-${newerLow.id}`).props.children,
    ).toBe(2);
    await rendered.cleanup();
  });

  it('inserts a curated collection between Newly Added and Best Eazy Scores', async () => {
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
    mockGetFeedCollections.mockResolvedValue([
      curatedCollection({
        slug: 'editors-picks',
        feedPosition: 150,
        productIds: [olderHigh.id],
      }),
    ]);
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText("Editor's Picks")).toBeTruthy(),
    );
    expect(rendered.getByText('Newly Added')).toBeTruthy();
    expect(rendered.getByText('Best Eazy Scores')).toBeTruthy();
    expect(
      rendered.getByTestId('feed-section-collection:editors-picks'),
    ).toBeTruthy();
    const newlyAdded = rendered.getByTestId('feed-section-newly-added');
    expect(
      within(newlyAdded).getByTestId(`feed-spotlight-${newerLow.id}`),
    ).toBeTruthy();
    await rendered.cleanup();
  });

  it('renders auto sections when collections fail to load', async () => {
    mockGetProducts.mockResolvedValue([completeProductCard, sparseProductCard]);
    mockGetFeedCollections.mockRejectedValue(
      new CatalogError('server-error', 'failed'),
    );
    const rendered = await renderWithProviders(<FeedScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Newly Added')).toBeTruthy(),
    );
    expect(rendered.queryByText("Editor's Picks")).toBeNull();
    expect(rendered.queryByText('Could not load products')).toBeNull();
    await rendered.cleanup();
  });
});
