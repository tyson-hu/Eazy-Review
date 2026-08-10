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

const earlyCommunityDetail = {
  ...completeProductDetail,
  ratingSummary: {
    ...completeProductDetail.ratingSummary,
    ratingCount: 1,
    lookAvg: 8,
    outfitAvg: 8.5,
    materialAvg: 7.5,
    craftsmanshipAvg: 4.5,
    maintenanceAvg: 8,
    comfortAvg: 7,
    collectionAvg: 7.5,
    valueAvg: 7,
    resalePotentialAvg: 8,
    acquisitionEaseAvg: 6.5,
    communityScore: 71,
    methodologyVersion: 'sneaker-10-v1',
  },
};

const tiedCommunityDetail = {
  ...earlyCommunityDetail,
  ratingSummary: {
    ...earlyCommunityDetail.ratingSummary,
    ratingCount: 5,
    lookAvg: 8,
    outfitAvg: 8,
    materialAvg: 8,
    craftsmanshipAvg: 8,
    maintenanceAvg: 8,
    comfortAvg: 8,
    collectionAvg: 8,
    valueAvg: 8,
    resalePotentialAvg: 8,
    acquisitionEaseAvg: 8,
    communityScore: 80,
  },
};

const matchingCommunityDetail = {
  ...earlyCommunityDetail,
  ratingSummary: {
    ...earlyCommunityDetail.ratingSummary,
    ratingCount: 4,
    communityScore: 79,
  },
};

const mismatchedCommunityDetail = {
  ...earlyCommunityDetail,
  ratingSummary: {
    ...earlyCommunityDetail.ratingSummary,
    methodologyVersion: 'sneaker-10-v2',
  },
};

const partialCommunityDetail = {
  ...earlyCommunityDetail,
  ratingSummary: {
    ...earlyCommunityDetail.ratingSummary,
    materialAvg: null,
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
    expect(rendered.getByText('Editorial assessment')).toBeTruthy();
    expect(rendered.getByText('Community Score')).toBeTruthy();
    expect(rendered.getAllByText('No ratings yet').length).toBeGreaterThan(0);
    expect(rendered.getByText('Decision summary')).toBeTruthy();
    expect(rendered.getByText('No community ratings yet.')).toBeTruthy();
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

  it('restores decision-first context for an early community score', async () => {
    mockGetProductById.mockResolvedValue(earlyCommunityDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(rendered.getByText('Editorial assessment')).toBeTruthy();
    expect(rendered.getByText('Early score · 1 rating')).toBeTruthy();
    expect(rendered.getByText('Decision summary')).toBeTruthy();
    expect(
      rendered.getByText('Community is 8 points below Eazy.'),
    ).toBeTruthy();
    expect(rendered.getByText('Top strength')).toBeTruthy();
    expect(rendered.getByText('Styling · 8.5/10')).toBeTruthy();
    expect(rendered.getByText('Weakest category')).toBeTruthy();
    expect(rendered.getByText('Craftsmanship · 4.5/10')).toBeTruthy();
    expect(
      rendered.queryByText('Eazy Assessment · Editorial evaluation'),
    ).toBeNull();
    await rendered.cleanup();
  });

  it('uses normal count copy and avoids opposing highlights for tied dimensions', async () => {
    mockGetProductById.mockResolvedValue(tiedCommunityDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(rendered.getByText('5 ratings')).toBeTruthy();
    expect(rendered.queryByText(/Early score/)).toBeNull();
    expect(
      rendered.getByText('Community is 1 point above Eazy.'),
    ).toBeTruthy();
    expect(
      rendered.getByText('No clear community strengths or weaknesses yet.'),
    ).toBeTruthy();
    expect(rendered.queryByText('Top strength')).toBeNull();
    expect(rendered.queryByText('Weakest category')).toBeNull();
    await rendered.cleanup();
  });

  it('keeps four ratings early and describes an overall match', async () => {
    mockGetProductById.mockResolvedValue(matchingCommunityDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(rendered.getByText('Early score · 4 ratings')).toBeTruthy();
    expect(rendered.getByText('Community matches Eazy overall.')).toBeTruthy();
    await rendered.cleanup();
  });

  it('suppresses direct comparison across methodology versions', async () => {
    mockGetProductById.mockResolvedValue(mismatchedCommunityDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(
      rendered.getByText(
        'Direct comparison is unavailable because these scores use different methods.',
      ),
    ).toBeTruthy();
    expect(
      rendered.queryByText('Community is 8 points below Eazy.'),
    ).toBeNull();
    expect(rendered.queryByTestId('score-compare-look')).toBeNull();
    await rendered.cleanup();
  });

  it('announces partial dimension values without relying on visual columns', async () => {
    mockGetProductById.mockResolvedValue(partialCommunityDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(
      rendered.getByText(
        'Both scores use the same 10 dimensions, scored from 0 to 10.',
      ),
    ).toBeTruthy();
    expect(rendered.getByText('Dimension')).toBeTruthy();
    expect(rendered.queryByText('Category')).toBeNull();
    expect(rendered.getByTestId('score-compare-look').props).toMatchObject({
      accessible: true,
      accessibilityLabel:
        'Appearance. Eazy 8 out of 10. Community 8 out of 10.',
    });
    expect(rendered.getByTestId('score-compare-material').props).toMatchObject({
      accessible: true,
      accessibilityLabel:
        'Materials. Eazy 8 out of 10. Community not available.',
    });
    await rendered.cleanup();
  });

  it('keeps decision context and verified offers ahead of the long score breakdown', async () => {
    mockGetProductById.mockResolvedValue(earlyCommunityDetail);
    const rendered = await renderWithProviders(<ProductDetailScreen />, {
      queryClient: testClient(),
    });

    await waitFor(() =>
      expect(rendered.getByText('Nike Air Force 1 Low White')).toBeTruthy(),
    );
    expect(
      rendered
        .getAllByTestId(/^product-detail-section-/)
        .map((section) => section.props.testID),
    ).toEqual([
      'product-detail-section-decision',
      'product-detail-section-offers',
      'product-detail-section-comparison',
      'product-detail-section-my-rating',
      'product-detail-section-description',
    ]);
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
    expect(rendered.getByText('Editorial assessment')).toBeTruthy();
    expect(rendered.getByText('Not assessed yet')).toBeTruthy();
    expect(rendered.getAllByText('No ratings yet').length).toBeGreaterThan(0);
    expect(rendered.getByText('Decision summary')).toBeTruthy();
    expect(rendered.getByText('No community ratings yet.')).toBeTruthy();
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
