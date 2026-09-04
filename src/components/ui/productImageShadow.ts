import { Platform } from 'react-native';

/**
 * The single allowed drop shadow: product imagery resting on a surface
 * (`docs/DESIGN.md`, Card style). Shared by ProductCard and
 * ProductSpotlightCard so the two surfaces never drift apart.
 */
export const productImageShadow = Platform.select({
  web: { boxShadow: '3px 5px 30px rgba(0, 0, 0, 0.22)' },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 15,
    elevation: 6,
  },
});
