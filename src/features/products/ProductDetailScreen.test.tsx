import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';

import ProductDetailScreen from '@/app/product/[id]/index';
import { getProductById } from '@/src/features/products/api';
import { CatalogError } from '@/src/features/products/errors';
import {
  completeProductDetail,
  sparseProductDetail,
} from '@/src/features/products/catalogViewModelTestFixtures';
import {
  COMPLETE_PRODUCT_ID,
  SPARSE_PRODUCT_ID,
} from '@/src/features/products/catalogTestFixtures';
import { createAppQueryClient } from '@/src/lib/query/client';
import { catalogKeys } from '@/src/lib/query/keys';
import { renderWithProviders } from '@/src/test/renderWithProviders';

let mockRouteId: string | undefined = COMPLETE_PRODUCT_ID;

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/src/features/products/api', () => ({
  getProducts: jest.fn(),
  getProductById: jest.fn(),
}));

const mockGetProductById = jest.mocked(getProductById);

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

describe('connected Product Detail screen', () => {
  beforeEach(() => {
    mockRouteId = COMPLETE_PRODUCT_ID;
    onlineManager.setOnline(true);
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('renders the initial loading state', async () => {
    mockGetProductById.mockReturnValue(new Promise(() => {}));
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    expect(rendered.getByText('Loading product...')).toBeTruthy();
    await rendered.cleanup();
  });

  it('renders the complete Air Force 1 editorial, community, and verified-offer content', async () => {
    mockGetProductById.mockResolvedValue(completeProductDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(rendered.getByTestId('product-detail-image').props.source).toEqual({
      uri: completeProductDetail.imageUrls[0],
    });
    expect(rendered.getByText('Eazy Score')).toBeTruthy();
    expect(rendered.getByText('79 / 100')).toBeTruthy();
    expect(rendered.getByText('Eazy Assessment · Editorial evaluation')).toBeTruthy();
    expect(rendered.getByText('Community Score')).toBeTruthy();
    expect(rendered.getAllByText('No ratings yet').length).toBeGreaterThan(0);
    expect(rendered.getByText('Lowest verified offer')).toBeTruthy();
    expect(rendered.getByText('$114.99 USD')).toBeTruthy();
    expect(rendered.getByText("DICK'S Sporting Goods · US 10")).toBeTruthy();
    expect(rendered.getAllByText('Checked Aug 3, 2026').length).toBeGreaterThan(0);
    expect(
      rendered.getAllByTestId(/^verified-offer-/).map((node) => node.props.testID),
    ).toEqual(['verified-offer-offer-dicks', 'verified-offer-offer-finish-line']);
    expect(rendered.getByText('Sign in to rate this product.')).toBeTruthy();
    expect(rendered.getByText('Sign in to rate')).toBeTruthy();
    expect(
      rendered.getByText('Your scores and private note stay owner-only.'),
    ).toBeTruthy();
    expect(rendered.queryByText(/myRating|raw rating/i)).toBeNull();
    await rendered.cleanup();
  });

  it('renders the sparse Samba without fabricated image, assessment, score, or price', async () => {
    mockRouteId = SPARSE_PRODUCT_ID;
    mockGetProductById.mockResolvedValue(sparseProductDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(
        rendered.getByText('Adidas Samba OG Cloud White Core Black'),
      ).toBeTruthy(),
    );
    expect(rendered.getByText('No image available')).toBeTruthy();
    expect(rendered.getByText('Eazy Assessment · Editorial evaluation')).toBeTruthy();
    expect(rendered.getByText('Not assessed yet')).toBeTruthy();
    expect(rendered.getAllByText('No ratings yet').length).toBeGreaterThan(0);
    expect(rendered.getByText('Verified offers')).toBeTruthy();
    expect(rendered.getByText('No verified offer available')).toBeTruthy();
    expect(rendered.queryByText('$0')).toBeNull();
    expect(rendered.queryByText('0/10')).toBeNull();
    await rendered.cleanup();
  });

  it('renders domain not-found without an automatic retry', async () => {
    mockGetProductById.mockRejectedValue(
      new CatalogError('not-found', 'missing'),
    );
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Product not found')).toBeTruthy(),
    );
    expect(mockGetProductById).toHaveBeenCalledTimes(1);
    await rendered.cleanup();
  });

  it('shows offline without cache and makes no request', async () => {
    onlineManager.setOnline(false);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() => expect(rendered.getByText("You're offline.")).toBeTruthy());
    expect(mockGetProductById).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('retains cached product data while offline', async () => {
    const queryClient = testClient();
    queryClient.setQueryData(
      catalogKeys.product(COMPLETE_PRODUCT_ID),
      completeProductDetail,
    );
    onlineManager.setOnline(false);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient,
    });

    expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy();
    expect(rendered.getByText("You're offline.")).toBeTruthy();
    expect(
      rendered.getByText('Prices and availability may have changed.'),
    ).toBeTruthy();
    expect(mockGetProductById).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('keeps cached content visible during background refresh', async () => {
    const queryClient = testClient({ staleTime: 0 });
    queryClient.setQueryData(
      catalogKeys.product(COMPLETE_PRODUCT_ID),
      completeProductDetail,
    );
    mockGetProductById.mockReturnValue(new Promise(() => {}));
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient,
    });

    expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy();
    await waitFor(() =>
      expect(rendered.getByText('Refreshing product...')).toBeTruthy(),
    );
    await rendered.cleanup();
  });

  it('shows a request error and manual retry fetches again', async () => {
    const failure = new CatalogError('server-error', 'failed');
    mockGetProductById
      .mockRejectedValueOnce(failure)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(completeProductDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Could not load product')).toBeTruthy(),
    );
    expect(mockGetProductById).toHaveBeenCalledTimes(2);
    await act(async () => {
      await fireEvent.press(rendered.getByText('Try again'));
    });
    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(mockGetProductById).toHaveBeenCalledTimes(3);
    await rendered.cleanup();
  });

  it('treats an invalid route id as not found without requesting', async () => {
    mockRouteId = undefined;
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    expect(rendered.getByText('Product not found')).toBeTruthy();
    expect(mockGetProductById).not.toHaveBeenCalled();
    await rendered.cleanup();
  });
});
