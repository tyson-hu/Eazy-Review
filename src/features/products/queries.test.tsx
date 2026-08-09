import { act, waitFor } from '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { Text } from 'react-native';

import { getProductById, getProducts } from '@/src/features/products/api';
import { CatalogError } from '@/src/features/products/errors';
import {
  useProductQuery,
  useProductsQuery,
} from '@/src/features/products/queries';
import {
  COMPLETE_PRODUCT_ID,
  SPARSE_PRODUCT_ID,
} from '@/src/features/products/catalogTestFixtures';
import { createAppQueryClient } from '@/src/lib/query/client';
import { catalogKeys } from '@/src/lib/query/keys';
import { renderWithProviders } from '@/src/test/renderWithProviders';
import type {
  ProductCardData,
  ProductDetailPublicData,
} from '@/src/types/product';

jest.mock('@/src/features/products/api', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
}));

const mockGetProducts = jest.mocked(getProducts);
const mockGetProductById = jest.mocked(getProductById);

const completeCard: ProductCardData = {
  id: COMPLETE_PRODUCT_ID,
  brand: 'Nike',
  name: 'Nike Air Force 1 Low White',
  sku: 'CW2288-111',
  imageUrl: 'https://example.test/air-force.png',
  eazyScore: 79,
  communityScore: null,
  ratingCount: 0,
  lowestOffer: {
    retailer: "DICK'S Sporting Goods",
    amount: 114.99,
    currency: 'USD',
    market: 'US',
    sizeLabel: 'US 10',
    checkedAt: '2026-08-03T16:17:14.000Z',
  },
};

const completeDetail: ProductDetailPublicData = {
  product: {
    id: COMPLETE_PRODUCT_ID,
    brand: 'Nike',
    name: 'Nike Air Force 1 Low White',
    sku: 'CW2288-111',
    sizeType: 'men',
    releaseDate: '2020-07-15',
    description: 'The all-white staple Air Force 1 Low.',
    imageUrl: 'https://example.test/air-force.png',
    eazyScore: 79,
    communityScore: null,
    ratingCount: 0,
    lowestPrice: 114.99,
  },
  imageUrls: ['https://example.test/air-force.png'],
  eazyAssessment: {
    score100: 79,
    methodologyVersion: 'task13-seed-v1',
    assessedAt: '2026-08-03T16:17:14.000Z',
    dimensions: null,
  },
  offers: [
    {
      id: 'offer-1',
      retailer: "DICK'S Sporting Goods",
      amount: 114.99,
      currency: 'USD',
      market: 'US',
      sizeLabel: 'US 10',
      checkedAt: '2026-08-03T16:17:14.000Z',
    },
  ],
  ratingSummary: {
    productId: COMPLETE_PRODUCT_ID,
    ratingCount: 0,
    lookAvg: null,
    outfitAvg: null,
    materialAvg: null,
    craftsmanshipAvg: null,
    maintenanceAvg: null,
    comfortAvg: null,
    collectionAvg: null,
    valueAvg: null,
    resalePotentialAvg: null,
    acquisitionEaseAvg: null,
    communityScore: null,
    methodologyVersion: null,
  },
};

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

function ProductsProbe() {
  const query = useProductsQuery();
  return (
    <Text>
      {query.isOffline
        ? `offline:${query.data?.length ?? 'none'}`
        : query.isError
          ? 'error'
          : `online:${query.data?.length ?? 'pending'}`}
    </Text>
  );
}

function ProductProbe({ productId }: { productId: string }) {
  const query = useProductQuery(productId);
  return <Text>{query.data?.product.name ?? 'pending'}</Text>;
}

describe('public catalog query hooks', () => {
  beforeEach(() => {
    onlineManager.setOnline(true);
    focusManager.setFocused(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    focusManager.setFocused(undefined);
  });

  it('uses one identity-neutral Browse query across rerenders', async () => {
    mockGetProducts.mockResolvedValue([completeCard]);
    const rendered = await renderWithProviders(<ProductsProbe />, {
      queryClient: testClient(),
    });

    await waitFor(() => expect(rendered.getByText('online:1')).toBeTruthy());
    await rendered.rerender(<ProductsProbe />);

    expect(mockGetProducts).toHaveBeenCalledTimes(1);
    expect(rendered.queryClient.getQueryData(catalogKeys.products())).toEqual([
      completeCard,
    ]);
    await rendered.cleanup();
  });

  it('does not automatically retry deterministic failures', async () => {
    mockGetProducts.mockRejectedValue(
      new CatalogError('unauthorized', 'denied'),
    );
    const rendered = await renderWithProviders(<ProductsProbe />, {
      queryClient: testClient(),
    });

    await waitFor(() => expect(rendered.getByText('error')).toBeTruthy());
    expect(mockGetProducts).toHaveBeenCalledTimes(1);
    await rendered.cleanup();
  });

  it('retries a timeout once, then succeeds', async () => {
    mockGetProducts
      .mockRejectedValueOnce(new CatalogError('timeout', 'timeout'))
      .mockResolvedValueOnce([completeCard]);
    const rendered = await renderWithProviders(<ProductsProbe />, {
      queryClient: testClient(),
    });

    await waitFor(() => expect(rendered.getByText('online:1')).toBeTruthy());
    expect(mockGetProducts).toHaveBeenCalledTimes(2);
    await rendered.cleanup();
  });

  it('pauses an uncached request while offline and fetches once on reconnect', async () => {
    onlineManager.setOnline(false);
    mockGetProducts.mockResolvedValue([completeCard]);
    const rendered = await renderWithProviders(<ProductsProbe />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('offline:none')).toBeTruthy(),
    );
    expect(mockGetProducts).not.toHaveBeenCalled();

    await act(async () => {
      onlineManager.setOnline(true);
    });
    await waitFor(() => expect(rendered.getByText('online:1')).toBeTruthy());
    expect(mockGetProducts).toHaveBeenCalledTimes(1);
    await rendered.cleanup();
  });

  it('keeps cached Browse data visible while offline', async () => {
    const queryClient = testClient();
    queryClient.setQueryData(catalogKeys.products(), [completeCard]);
    onlineManager.setOnline(false);
    const rendered = await renderWithProviders(<ProductsProbe />, {
      queryClient,
    });

    await waitFor(() => expect(rendered.getByText('offline:1')).toBeTruthy());
    expect(mockGetProducts).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('loads Product Detail once under its public product key', async () => {
    mockGetProductById.mockResolvedValue(completeDetail);
    const rendered = await renderWithProviders(
      <ProductProbe productId={COMPLETE_PRODUCT_ID} />,
      { queryClient: testClient() },
    );

    await waitFor(() =>
      expect(
        rendered.getByText('Nike Air Force 1 Low White'),
      ).toBeTruthy(),
    );
    expect(mockGetProductById).toHaveBeenCalledTimes(1);
    expect(
      rendered.queryClient.getQueryData(
        catalogKeys.product(COMPLETE_PRODUCT_ID),
      ),
    ).toEqual(completeDetail);
    await rendered.cleanup();
  });

  it('performs one controlled stale refetch after background and foreground', async () => {
    mockGetProducts.mockResolvedValue([completeCard]);
    const rendered = await renderWithProviders(<ProductsProbe />, {
      queryClient: testClient({ staleTime: 0 }),
    });
    await waitFor(() => expect(rendered.getByText('online:1')).toBeTruthy());
    expect(mockGetProducts).toHaveBeenCalledTimes(1);

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(mockGetProducts).toHaveBeenCalledTimes(2));

    await act(async () => {
      focusManager.setFocused(true);
    });
    expect(mockGetProducts).toHaveBeenCalledTimes(2);
    await rendered.cleanup();
  });

  it('does not mix a product id with user identity', async () => {
    mockGetProductById.mockResolvedValue(completeDetail);
    const rendered = await renderWithProviders(
      <ProductProbe productId={SPARSE_PRODUCT_ID} />,
      { queryClient: testClient() },
    );
    await waitFor(() =>
      expect(
        rendered.getByText('Nike Air Force 1 Low White'),
      ).toBeTruthy(),
    );

    expect(mockGetProductById).toHaveBeenCalledWith(
      SPARSE_PRODUCT_ID,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(catalogKeys.product(SPARSE_PRODUCT_ID)).toEqual([
      'catalog',
      'product',
      SPARSE_PRODUCT_ID,
    ]);
    await rendered.cleanup();
  });
});
