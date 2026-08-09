import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import { getProductById, getProducts } from '@/src/features/products/api';
import { getSupabase } from '@/src/lib/supabase/client';
import { PublicEnvError } from '@/src/lib/env/publicEnv';
import {
  COMPLETE_PRODUCT_ID,
  completeCatalogRow,
  sparseCatalogRow,
} from '@/src/features/products/catalogTestFixtures';

jest.mock('@/src/lib/supabase/client', () => ({
  getSupabase: jest.fn(),
}));

const mockGetSupabase = jest.mocked(getSupabase);

type FakeResponse = {
  data: unknown;
  error: unknown;
  status: number;
  statusText: string;
};

function createFakeClient(
  response: FakeResponse | Promise<FakeResponse>,
  options: { rejectOnAbort?: boolean } = {},
) {
  const calls: { method: string; args: unknown[] }[] = [];
  let rejectOnAbort: ((reason: unknown) => void) | undefined;
  const responsePromise = options.rejectOnAbort
    ? new Promise<FakeResponse>((_, reject) => {
        rejectOnAbort = reject;
      })
    : Promise.resolve(response);
  const builder = {
    select(...args: unknown[]) {
      calls.push({ method: 'select', args });
      return this;
    },
    eq(...args: unknown[]) {
      calls.push({ method: 'eq', args });
      return this;
    },
    not(...args: unknown[]) {
      calls.push({ method: 'not', args });
      return this;
    },
    order(...args: unknown[]) {
      calls.push({ method: 'order', args });
      return this;
    },
    limit(...args: unknown[]) {
      calls.push({ method: 'limit', args });
      return this;
    },
    maybeSingle(...args: unknown[]) {
      calls.push({ method: 'maybeSingle', args });
      return this;
    },
    abortSignal(...args: unknown[]) {
      calls.push({ method: 'abortSignal', args });
      const signal = args[0];
      if (signal instanceof AbortSignal && rejectOnAbort) {
        signal.addEventListener(
          'abort',
          () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            rejectOnAbort?.(error);
          },
          { once: true },
        );
      }
      return this;
    },
    retry(...args: unknown[]) {
      calls.push({ method: 'retry', args });
      return this;
    },
    then<TResult1 = FakeResponse, TResult2 = never>(
      onfulfilled?: ((value: FakeResponse) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return responsePromise.then(onfulfilled, onrejected);
    },
  };
  const from = jest.fn(() => builder);
  return {
    client: { from } as unknown as AppSupabaseClient,
    calls,
    from,
  };
}

const ok = (data: unknown): FakeResponse => ({
  data,
  error: null,
  status: 200,
  statusText: 'OK',
});

describe('public catalog API', () => {
  it('loads Browse in one nested public-only Supabase request', async () => {
    const fake = createFakeClient(ok([completeCatalogRow, sparseCatalogRow]));

    const products = await getProducts({ client: fake.client });

    expect(products).toHaveLength(2);
    expect(fake.from).toHaveBeenCalledTimes(1);
    expect(fake.from).toHaveBeenCalledWith('products');
    const selected = String(
      fake.calls.find((call) => call.method === 'select')?.args[0],
    );
    expect(selected).toContain('product_images');
    expect(selected).toContain('eazy_assessments');
    expect(selected).toContain('rating_aggregates');
    expect(selected).toContain('product_offers');
    expect(selected).not.toMatch(
      /profiles|user_ratings|private_note|user_id|website_link/,
    );
    expect(selected).not.toMatch(
      /size_type|release_date|description|methodology_version|look_avg|outfit_avg|material_avg|craftsmanship_avg|maintenance_avg|comfort_avg|collection_avg|value_avg|resale_potential_avg|acquisition_ease_avg/,
    );
    expect(fake.calls).toContainEqual({ method: 'retry', args: [false] });
    expect(fake.calls.filter((call) => call.method === 'order')).toEqual(
      expect.arrayContaining([
        { method: 'order', args: ['created_at', { ascending: true }] },
        { method: 'order', args: ['id', { ascending: true }] },
      ]),
    );
    expect(fake.calls).toContainEqual({
      method: 'limit',
      args: [1, { referencedTable: 'product_images' }],
    });
  });

  it('loads Product Detail in one request without viewer-owned fields', async () => {
    const fake = createFakeClient(ok(completeCatalogRow));

    const detail = await getProductById(COMPLETE_PRODUCT_ID, {
      client: fake.client,
    });

    expect(detail.product.id).toBe(COMPLETE_PRODUCT_ID);
    expect(fake.from).toHaveBeenCalledTimes(1);
    const selected = String(
      fake.calls.find((call) => call.method === 'select')?.args[0],
    );
    expect(selected).not.toMatch(/myRating|profiles|user_ratings|private_note/);
    expect(fake.calls).toContainEqual({
      method: 'eq',
      args: ['id', COMPLETE_PRODUCT_ID],
    });
    expect(fake.calls).toContainEqual({ method: 'maybeSingle', args: [] });
    expect(fake.calls).toContainEqual({ method: 'retry', args: [false] });
  });

  it('returns a domain not-found error for an invisible or missing product', async () => {
    const fake = createFakeClient(ok(null));

    await expect(
      getProductById('missing-product', { client: fake.client }),
    ).rejects.toEqual(
      expect.objectContaining({ code: 'not-found' }),
    );
  });

  it('normalizes anonymous RLS denial and server failure', async () => {
    const denied = createFakeClient({
      data: null,
      error: { code: '42501', message: 'permission denied' },
      status: 403,
      statusText: 'Forbidden',
    });
    await expect(getProducts({ client: denied.client })).rejects.toEqual(
      expect.objectContaining({ code: 'unauthorized' }),
    );

    const server = createFakeClient({
      data: null,
      error: { message: 'upstream unavailable' },
      status: 503,
      statusText: 'Unavailable',
    });
    await expect(getProducts({ client: server.client })).rejects.toEqual(
      expect.objectContaining({ code: 'server-error' }),
    );
  });

  it('times out instead of leaving the request pending indefinitely', async () => {
    const never = new Promise<FakeResponse>(() => {});
    const fake = createFakeClient(never);

    await expect(
      getProducts({ client: fake.client, timeoutMs: 1 }),
    ).rejects.toEqual(expect.objectContaining({ code: 'timeout' }));
  });

  it('keeps timeout classification when the transport rejects on abort', async () => {
    const fake = createFakeClient(ok(null), { rejectOnAbort: true });

    await expect(
      getProducts({ client: fake.client, timeoutMs: 1 }),
    ).rejects.toEqual(expect.objectContaining({ code: 'timeout' }));
  });

  it('normalizes invalid public environment configuration at the API boundary', async () => {
    mockGetSupabase.mockImplementationOnce(() => {
      throw new PublicEnvError('EXPO_PUBLIC_SUPABASE_URL', 'missing');
    });

    await expect(getProducts()).rejects.toEqual(
      expect.objectContaining({
        code: 'invalid-response',
        source: 'configuration',
      }),
    );
  });
});
