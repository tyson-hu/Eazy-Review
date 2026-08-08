import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';

import BrowseScreen from '@/app/(tabs)/browse';
import { getProducts } from '@/src/features/products/api';
import { CatalogError } from '@/src/features/products/errors';
import {
  completeProductCard,
  sparseProductCard,
} from '@/src/features/products/catalogViewModelTestFixtures';
import { createAppQueryClient } from '@/src/lib/query/client';
import { catalogKeys } from '@/src/lib/query/keys';
import { renderWithProviders } from '@/src/test/renderWithProviders';

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

describe('connected Browse screen', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('renders the initial loading state', async () => {
    mockGetProducts.mockReturnValue(new Promise(() => {}));
    const rendered = await renderWithProviders(<BrowseScreen />, {
      queryClient: testClient(),
    });

    expect(rendered.getByText('Loading products...')).toBeTruthy();
    await rendered.cleanup();
  });

  it('renders both deterministic fixtures with honest image, score, and offer states', async () => {
    mockGetProducts.mockResolvedValue([
      completeProductCard,
      sparseProductCard,
    ]);
    const rendered = await renderWithProviders(<BrowseScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(
      rendered.getByText('Adidas Samba OG Cloud White Core Black'),
    ).toBeTruthy();
    expect(
      rendered.getAllByTestId(/^product-card-/).map((node) => node.props.testID),
    ).toEqual([
      `product-card-${completeProductCard.id}`,
      `product-card-${sparseProductCard.id}`,
    ]);
    expect(
      rendered.getByTestId(`product-image-${completeProductCard.id}`).props
        .source,
    ).toEqual({ uri: completeProductCard.imageUrl });
    expect(rendered.getByText('No image available')).toBeTruthy();
    expect(rendered.getByText('$114.99 USD')).toBeTruthy();
    expect(rendered.getByText("DICK'S Sporting Goods · US 10")).toBeTruthy();
    expect(rendered.getByText('Checked Aug 3, 2026')).toBeTruthy();
    expect(rendered.getByText('No verified offer available')).toBeTruthy();
    expect(rendered.queryByText('$0')).toBeNull();
    expect(rendered.getAllByText('No ratings yet')).toHaveLength(2);

    await fireEvent.press(
      rendered.getByTestId(`product-card-${completeProductCard.id}`),
    );
    expect(mockPush).toHaveBeenCalledWith(
      `/product/${completeProductCard.id}`,
    );
    await rendered.cleanup();
  });

  it('shows separate empty-catalog and empty-search states', async () => {
    mockGetProducts.mockResolvedValue([]);
    const empty = await renderWithProviders(<BrowseScreen />, {
      queryClient: testClient(),
    });
    await waitFor(() =>
      expect(empty.getByText('No published products yet')).toBeTruthy(),
    );
    await empty.cleanup();

    mockGetProducts.mockResolvedValue([completeProductCard]);
    const search = await renderWithProviders(<BrowseScreen />, {
      queryClient: testClient(),
    });
    await waitFor(() =>
      expect(search.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    await fireEvent.changeText(
      search.getByLabelText('Search products'),
      'Samba',
    );
    expect(search.getByText('No products found')).toBeTruthy();
    await fireEvent.press(search.getByText('Clear search'));
    expect(search.getByText('Nike Air Force 1 Low White')).toBeTruthy();
    await search.cleanup();
  });

  it('shows offline without cache and makes no request', async () => {
    onlineManager.setOnline(false);
    const rendered = await renderWithProviders(<BrowseScreen />, {
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
    const rendered = await renderWithProviders(<BrowseScreen />, {
      queryClient,
    });

    expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy();
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
    const rendered = await renderWithProviders(<BrowseScreen />, {
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
    const rendered = await renderWithProviders(<BrowseScreen />, {
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
