/**
 * Safe internal return destinations for post-auth navigation.
 * Rejects external URLs, schemes, and arbitrary paths.
 */

const DEFAULT_RETURN_PATH = '/(tabs)/browse';

/** Product detail: UUID product id only. */
const PRODUCT_DETAIL_PATH =
  /^\/product\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACCOUNT_PATH = /^\/(\(tabs\)\/)?account\/?$/i;

/**
 * Minimal router surface used after successful authentication.
 * Prefer stack-unwinding `dismissTo` so existing destinations are revealed
 * instead of forward-replaced into duplicate routes.
 */
export type AuthReturnRouter = {
  // Expo Router typed Href is narrower than string; callers still pass
  // sanitized internal paths via `as never` at the call site below.
  dismissTo: (href: never) => void;
};

/**
 * Returns a safe internal app path, or the default Browse tab when the input
 * is missing, external, or outside the Task 16 allowlist.
 */
export function sanitizeReturnPath(
  returnTo: string | string[] | undefined | null,
): string {
  const raw = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (typeof raw !== 'string' || raw.length === 0) {
    return DEFAULT_RETURN_PATH;
  }

  const trimmed = raw.trim();

  // Block schemes and protocol-relative URLs.
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ||
    trimmed.startsWith('//') ||
    trimmed.includes('://') ||
    trimmed.includes('\\')
  ) {
    return DEFAULT_RETURN_PATH;
  }

  // Normalize to a single leading slash path without query/hash hijacks.
  const withoutHash = trimmed.split('#')[0] ?? '';
  const pathOnly = withoutHash.split('?')[0] ?? '';
  const normalized = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;

  if (PRODUCT_DETAIL_PATH.test(normalized)) {
    return normalized;
  }

  if (ACCOUNT_PATH.test(normalized)) {
    return '/(tabs)/account';
  }

  if (
    normalized === '/browse' ||
    normalized === '/(tabs)/browse' ||
    normalized === '/(tabs)'
  ) {
    return DEFAULT_RETURN_PATH;
  }

  return DEFAULT_RETURN_PATH;
}

/**
 * After successful auth, dismiss auth screens until the sanitized destination
 * is reached. Expo Router `dismissTo` pops until an existing matching route is
 * found; if none exists it replaces the current auth screen instead of pushing
 * a second copy of a product still under the auth stack.
 *
 * Intentionally not `router.replace`: replace on success created a duplicate
 * Product screen (human-observed: Product → Sign In → Product → Back → Product).
 */
export function dismissAuthToReturnPath(
  router: AuthReturnRouter,
  returnTo: string | string[] | undefined | null,
): string {
  const destination = sanitizeReturnPath(returnTo);
  router.dismissTo(destination as never);
  return destination;
}

export function productDetailReturnPath(productId: string): string {
  return `/product/${productId}`;
}

export { DEFAULT_RETURN_PATH };
