import { render } from '@testing-library/react-native';

import { ProductRankRow } from '@/src/components/ui/ProductRankRow';
import { completeProductCard } from '@/src/features/products/catalogViewModelTestFixtures';

describe('ProductRankRow', () => {
  it('includes rank, signal, score, and caption in the accessibility label', async () => {
    const rendered = await render(
      <ProductRankRow
        product={completeProductCard}
        signal="eazy"
        rank={1}
      />,
    );

    expect(
      rendered.getByRole('button', {
        name: 'Open Nike Nike Air Force 1 Low White. Rank 1. Eazy Score 79 out of 100. Good.',
      }),
    ).toBeTruthy();
  });

  it('omits rank and names an unavailable community score', async () => {
    const rendered = await render(
      <ProductRankRow product={completeProductCard} signal="community" />,
    );

    expect(
      rendered.getByRole('button', {
        name: 'Open Nike Nike Air Force 1 Low White. Community Score not available. No ratings yet.',
      }),
    ).toBeTruthy();
  });
});
