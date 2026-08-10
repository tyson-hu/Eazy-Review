import { render } from '@testing-library/react-native';

import { ProductCard } from '@/src/components/ui/ProductCard';
import { useIsLargeContentSize } from '@/src/lib/accessibility/fontScale';
import type { ProductCardData } from '@/src/types/product';

jest.mock('@/src/lib/accessibility/fontScale', () => {
  const actual = jest.requireActual<
    typeof import('@/src/lib/accessibility/fontScale')
  >('@/src/lib/accessibility/fontScale');
  return {
    ...actual,
    useIsLargeContentSize: jest.fn(() => false),
  };
});

const mockUseIsLargeContentSize = jest.mocked(useIsLargeContentSize);

const sampleProduct: ProductCardData = {
  id: 'product-a',
  brand: 'Nike',
  name: 'Air Force 1 Low White',
  sku: 'CW2288-111',
  imageUrl: 'https://example.com/af1.png',
  eazyScore: 82,
  communityScore: 74,
  ratingCount: 12,
  lowestOffer: {
    amount: 110,
    currency: 'USD',
    retailer: 'Example Shop',
    market: 'US',
    sizeLabel: 'US 10',
    checkedAt: '2026-08-01T00:00:00.000Z',
  },
};

describe('ProductCard Dynamic Type layout', () => {
  beforeEach(() => {
    mockUseIsLargeContentSize.mockReturnValue(false);
  });

  it('keeps required product identity, scores, and offer in the tree', async () => {
    const rendered = await render(
      <ProductCard product={sampleProduct} onPress={jest.fn()} />,
    );

    expect(rendered.getByTestId('product-card-product-a')).toBeTruthy();
    expect(rendered.getByText('Nike')).toBeTruthy();
    expect(rendered.getByText('Air Force 1 Low White')).toBeTruthy();
    expect(rendered.getByText('CW2288-111')).toBeTruthy();
    expect(rendered.getByText('Eazy Score')).toBeTruthy();
    expect(rendered.getByText('Community Score')).toBeTruthy();
    expect(rendered.getByText('82 / 100')).toBeTruthy();
    expect(rendered.getByText('74 / 100')).toBeTruthy();
    expect(rendered.getByText('Lowest verified offer')).toBeTruthy();
    expect(rendered.getByTestId('product-scores-product-a')).toBeTruthy();
  });

  it('stacks score badges under large Dynamic Type without dropping copy', async () => {
    mockUseIsLargeContentSize.mockReturnValue(true);
    const rendered = await render(
      <ProductCard product={sampleProduct} onPress={jest.fn()} />,
    );

    const scores = rendered.getByTestId('product-scores-product-a');
    expect(scores.props.className).not.toContain('flex-row');
    expect(rendered.getByText('Eazy Score')).toBeTruthy();
    expect(rendered.getByText('Community Score')).toBeTruthy();
    expect(rendered.getByText('82 / 100')).toBeTruthy();
    expect(rendered.getByText('Air Force 1 Low White')).toBeTruthy();
  });
});
