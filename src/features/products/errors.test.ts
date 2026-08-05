import { PublicEnvError } from '@/src/lib/env/publicEnv';
import {
  CatalogError,
  normalizeCatalogError,
  shouldRetryCatalogQuery,
} from '@/src/features/products/errors';

describe('catalog errors and retries', () => {
  it.each([
    ['offline', false],
    ['not-found', false],
    ['unauthorized', false],
    ['invalid-response', false],
    ['timeout', true],
    ['server-error', true],
  ] as const)('applies the retry contract for %s', (code, expected) => {
    const error = new CatalogError(code, code);
    expect(shouldRetryCatalogQuery(0, error)).toBe(expected);
    expect(shouldRetryCatalogQuery(1, error)).toBe(false);
  });

  it('does not retry unknown or invalid-environment failures', () => {
    expect(shouldRetryCatalogQuery(0, new Error('unknown'))).toBe(false);
    const error = normalizeCatalogError(
      new PublicEnvError('EXPO_PUBLIC_SUPABASE_URL', 'missing'),
    );
    expect(error.code).toBe('invalid-response');
    expect(error.source).toBe('configuration');
    expect(shouldRetryCatalogQuery(0, error)).toBe(false);
  });

  it('normalizes anonymous RLS denial, not-found, and server failures', () => {
    expect(normalizeCatalogError({ code: '42501', status: 403 }).code).toBe(
      'unauthorized',
    );
    expect(normalizeCatalogError({ status: 404 }).code).toBe('not-found');
    expect(normalizeCatalogError({ status: 503 }).code).toBe('server-error');
  });

  it('distinguishes explicit offline state from a transport interruption', () => {
    const interruption = new TypeError('Network request failed');
    expect(normalizeCatalogError(interruption, { isOffline: true }).code).toBe(
      'offline',
    );
    expect(normalizeCatalogError(interruption, { isOffline: false }).code).toBe(
      'server-error',
    );
  });
});
