import type { ImageSourcePropType } from 'react-native';

const mockProductImageSources: Record<string, ImageSourcePropType> = {
  'mock-product://catalog/1': require('../../../assets/images/products/product-01-stan-smith-orange.png'),
  'mock-product://catalog/2': require('../../../assets/images/products/product-02-dunk-white-black.png'),
  'mock-product://catalog/3': require('../../../assets/images/products/product-03-990v6-grey.png'),
  'mock-product://catalog/4': require('../../../assets/images/products/product-04-gel-kayano-white-midnight.png'),
  'mock-product://catalog/5': require('../../../assets/images/products/product-05-air-force-1-white.png'),
  'mock-product://catalog/6': require('../../../assets/images/products/product-06-xt6-black.png'),
  'mock-product://catalog/7': require('../../../assets/images/products/product-07-samba-white-black.png'),
  'mock-product://catalog/8': require('../../../assets/images/products/product-08-old-skool-black-white.png'),
};

/** Resolve mock-only asset URIs while leaving future HTTP product URLs unchanged. */
export function resolveProductImageSource(
  imageUrl: string | null | undefined,
): ImageSourcePropType | undefined {
  if (!imageUrl) {
    return undefined;
  }

  const mockSource = mockProductImageSources[imageUrl];
  if (mockSource) {
    return mockSource;
  }

  // Unmapped mock-product URIs have no bundled asset — fall through to the
  // "Image coming soon" placeholder instead of a broken remote URI.
  if (imageUrl.startsWith('mock-product://')) {
    return undefined;
  }

  return { uri: imageUrl };
}
