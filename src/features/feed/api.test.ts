import { getFeedCollections } from '@/src/features/feed/api';
import { CatalogError } from '@/src/features/products/errors';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

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

function createFakeClient(response: FakeResponse) {
  const calls: { method: string; args: unknown[] }[] = [];
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
    abortSignal(...args: unknown[]) {
      calls.push({ method: 'abortSignal', args });
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
      return Promise.resolve(response).then(onfulfilled, onrejected);
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

describe('feed collections API', () => {
  afterEach(() => {
    mockGetSupabase.mockReset();
  });

  it('loads published Feed collections in one nested request', async () => {
    const fake = createFakeClient(
      ok([
        {
          id: 'collection-1',
          slug: 'editors-picks',
          title: "Editor's Picks",
          caption: 'Picked by Eazy Review',
          lead_label: "Editor's pick",
          signal: 'eazy',
          is_ranked: false,
          feed_position: 150,
          product_collection_items: [
            { id: 'item-1', product_id: 'p1', position: 1 },
          ],
        },
      ]),
    );

    const collections = await getFeedCollections({ client: fake.client });

    expect(collections).toHaveLength(1);
    expect(collections[0].slug).toBe('editors-picks');
    expect(fake.from).toHaveBeenCalledTimes(1);
    expect(fake.from).toHaveBeenCalledWith('product_collections');
    const selected = String(
      fake.calls.find((call) => call.method === 'select')?.args[0],
    );
    expect(selected).toContain('product_collection_items');
    expect(selected).not.toMatch(/profiles|user_ratings|private_note/);
    expect(fake.calls).toContainEqual({
      method: 'eq',
      args: ['is_published', true],
    });
    expect(fake.calls).toContainEqual({
      method: 'not',
      args: ['feed_position', 'is', null],
    });
    expect(fake.calls).toContainEqual({ method: 'retry', args: [false] });
    expect(fake.calls.filter((call) => call.method === 'order')).toEqual(
      expect.arrayContaining([
        { method: 'order', args: ['feed_position', { ascending: true }] },
        { method: 'order', args: ['id', { ascending: true }] },
      ]),
    );
  });

  it('normalizes a server failure', async () => {
    const denied = createFakeClient({
      data: null,
      error: { code: '42501', message: 'permission denied' },
      status: 403,
      statusText: 'Forbidden',
    });

    await expect(getFeedCollections({ client: denied.client })).rejects.toEqual(
      expect.objectContaining({ code: 'unauthorized' }),
    );
    expect(denied.from).toHaveBeenCalledWith('product_collections');
  });

  it('uses the shared client when none is provided', async () => {
    const fake = createFakeClient(ok([]));
    mockGetSupabase.mockReturnValue(fake.client);

    await expect(getFeedCollections()).resolves.toEqual([]);
    expect(mockGetSupabase).toHaveBeenCalledTimes(1);
  });

  it('wraps unexpected failures as catalog errors', async () => {
    await expect(
      getFeedCollections({
        client: {
          from() {
            throw new Error('boom');
          },
        } as unknown as AppSupabaseClient,
      }),
    ).rejects.toBeInstanceOf(CatalogError);
  });
});
