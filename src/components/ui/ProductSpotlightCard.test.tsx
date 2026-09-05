import { render } from '@testing-library/react-native';

import { ProductSpotlightCard } from '@/src/components/ui/ProductSpotlightCard';
import {
  COMPLETE_PRODUCT_ID,
  SPARSE_PRODUCT_ID,
} from '@/src/features/products/catalogTestFixtures';
import {
  completeProductCard,
  sparseProductCard,
} from '@/src/features/products/catalogViewModelTestFixtures';

describe('ProductSpotlightCard', () => {
  it('includes eyebrow, scores, captions, and offer in the accessibility label', async () => {
    const rendered = await render(
      <ProductSpotlightCard
        product={completeProductCard}
        eyebrow="Latest addition"
      />,
    );

    expect(
      rendered.getByRole('button', {
        name: 'Open Nike Nike Air Force 1 Low White. Latest addition. Eazy Score 79 out of 100. Good · Editorial assessment. Community Score not available. No ratings yet. $114.99 USD · DICK\'S Sporting Goods.',
      }),
    ).toBeTruthy();
  });

  it('names unavailable scores and a missing offer', async () => {
    const rendered = await render(
      <ProductSpotlightCard
        product={sparseProductCard}
        eyebrow="Latest addition"
      />,
    );

    expect(
      rendered.getByRole('button', {
        name: 'Open Adidas Adidas Samba OG Cloud White Core Black. Latest addition. Eazy Score not available. Not assessed yet. Community Score not available. No ratings yet. No verified offer available.',
      }),
    ).toBeTruthy();
    expect(
      rendered.queryByTestId(`feed-spotlight-rank-${SPARSE_PRODUCT_ID}`),
    ).toBeNull();
  });

  it('shows and announces rank 1 when it leads a numbered ranking', async () => {
    const rendered = await render(
      <ProductSpotlightCard
        product={completeProductCard}
        eyebrow="Top Eazy Score"
        rank={1}
      />,
    );

    expect(
      rendered.getByTestId(`feed-spotlight-rank-${COMPLETE_PRODUCT_ID}`).props
        .children,
    ).toBe(1);
    expect(
      rendered.getByRole('button', {
        name: 'Open Nike Nike Air Force 1 Low White. Rank 1. Top Eazy Score. Eazy Score 79 out of 100. Good · Editorial assessment. Community Score not available. No ratings yet. $114.99 USD · DICK\'S Sporting Goods.',
      }),
    ).toBeTruthy();
  });
});
