/**
 * Centralized TanStack Query key factories.
 *
 * Two structural classes of keys:
 *
 * 1. **Public catalog keys** (`catalogKeys`) — never include the authenticated
 *    user id. Anonymous Browse/Detail cache stays shareable across sign-in,
 *    sign-out, and account switches (see ADR: separate public Product Detail
 *    cache from My Rating).
 *
 * 2. **User-scoped keys** (`accountKeys`, `ratingKeys`) — must include the
 *    authenticated `userId` so owner-only data cannot collide or leak after an
 *    auth transition. Ordinary full sign-out/known-invalid cleanup may remove
 *    complete roots; account switching and superseded deletion remove only the
 *    displaced principal's documented keys.
 *
 * Components should use these factories rather than hand-built key arrays.
 * These factories establish conventions only; Task 15+ owns real query hooks.
 */

type KeyPart = string | number | boolean | null | undefined;

function assertSerializableParts(parts: readonly KeyPart[]): void {
  for (const part of parts) {
    const t = typeof part;
    if (
      part !== null &&
      part !== undefined &&
      t !== 'string' &&
      t !== 'number' &&
      t !== 'boolean'
    ) {
      throw new Error(
        `Query keys must be serializable primitives; received ${t}`,
      );
    }
  }
}

/** Public catalog — no user identity in any key. */
export const catalogKeys = {
  all: ['catalog'] as const,
  products: () => {
    const key = [...catalogKeys.all, 'products'] as const;
    assertSerializableParts(key);
    return key;
  },
  product: (productId: string) => {
    const key = [...catalogKeys.all, 'product', productId] as const;
    assertSerializableParts(key);
    return key;
  },
  feedCollections: () => {
    const key = [...catalogKeys.all, 'feedCollections'] as const;
    assertSerializableParts(key);
    return key;
  },
} as const;

/** Owner profile and account reads — always user-scoped. */
export const accountKeys = {
  all: ['account'] as const,
  profile: (userId: string) => {
    const key = [...accountKeys.all, 'profile', userId] as const;
    assertSerializableParts(key);
    return key;
  },
} as const;

/** Owner ratings — always user-scoped. */
export const ratingKeys = {
  all: ['rating'] as const,
  mine: (userId: string, productId: string) => {
    const key = [...ratingKeys.all, 'mine', userId, productId] as const;
    assertSerializableParts(key);
    return key;
  },
  ratedProducts: (userId: string) => {
    const key = [...ratingKeys.all, 'ratedProducts', userId] as const;
    assertSerializableParts(key);
    return key;
  },
} as const;

/**
 * Prefixes of every user-scoped key family. Used when purging cache for a
 * prior authenticated principal without dropping public catalog data.
 */
export const USER_SCOPED_KEY_ROOTS = [
  accountKeys.all,
  ratingKeys.all,
] as const;
