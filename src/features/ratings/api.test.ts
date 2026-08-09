import {
  getUserRatedProducts,
  getUserRating,
  saveUserRating,
} from '@/src/features/ratings/api';
import { RatingError } from '@/src/features/ratings/errors';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

function buildWriteClient(options: {
  existing?: unknown | null;
  existingError?: unknown;
  insertResult?: { data?: unknown; error?: unknown };
  updateResult?: { data?: unknown; error?: unknown };
  listData?: unknown;
  listError?: unknown;
}) {
  const methods: string[] = [];
  const insertPayloads: unknown[] = [];
  const updatePayloads: unknown[] = [];

  const from = jest.fn((table: string) => {
    methods.push(`from:${table}`);

    const chain: Record<string, unknown> = {};
    const self = chain;

    chain.select = jest.fn((..._args: unknown[]) => {
      methods.push('select');
      return self;
    });
    chain.eq = jest.fn((..._args: unknown[]) => {
      methods.push('eq');
      return self;
    });
    chain.order = jest.fn((..._args: unknown[]) => {
      methods.push('order');
      return self;
    });
    chain.abortSignal = jest.fn(() => self);
    chain.insert = jest.fn((payload: unknown) => {
      methods.push('insert');
      insertPayloads.push(payload);
      return self;
    });
    chain.update = jest.fn((payload: unknown) => {
      methods.push('update');
      updatePayloads.push(payload);
      return self;
    });
    chain.upsert = jest.fn(() => {
      methods.push('upsert');
      return self;
    });
    chain.maybeSingle = jest.fn(async () => {
      methods.push('maybeSingle');
      if (methods.includes('insert')) {
        return {
          data: options.insertResult?.data ?? null,
          error: options.insertResult?.error ?? null,
        };
      }
      if (methods.includes('update')) {
        return {
          data: options.updateResult?.data ?? null,
          error: options.updateResult?.error ?? null,
        };
      }
      // read path
      return {
        data: options.existing === undefined ? null : options.existing,
        error: options.existingError ?? null,
      };
    });

    // for list queries that await the builder directly
    const listResponse = {
      data: options.listData ?? [],
      error: options.listError ?? null,
    };
    // Make chain thenable for await query
    Object.defineProperty(chain, 'then', {
      value: (
        onFulfilled?: (value: typeof listResponse) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(listResponse).then(onFulfilled, onRejected),
      configurable: true,
    });

    return chain;
  });

  return {
    client: { from } as unknown as AppSupabaseClient,
    methods,
    insertPayloads,
    updatePayloads,
    from,
  };
}

const sampleRow = {
  look: 8,
  comfort: 7,
  quality: 9,
  outfit: 6,
  value: 8,
  overall: 8,
  private_note: 'secret',
};

describe('getUserRating', () => {
  it('returns null when the owner has no rating', async () => {
    const { client } = buildWriteClient({ existing: null });
    await expect(
      getUserRating('product-1', 'user-a', { client }),
    ).resolves.toBeNull();
  });

  it('normalizes private_note to privateNote for an existing rating', async () => {
    const { client } = buildWriteClient({ existing: sampleRow });
    await expect(
      getUserRating('product-1', 'user-a', { client }),
    ).resolves.toEqual({
      look: 8,
      comfort: 7,
      quality: 9,
      outfit: 6,
      value: 8,
      overall: 8,
      privateNote: 'secret',
    });
  });

  it('requires authenticated identity', async () => {
    const { client } = buildWriteClient({});
    await expect(getUserRating('product-1', '', { client })).rejects.toBeInstanceOf(
      RatingError,
    );
  });

  it('never surfaces raw SDK text in RatingError messages', async () => {
    const { client } = buildWriteClient({
      existingError: { message: 'relation boom raw secret', code: 'XX000' },
    });
    await expect(
      getUserRating('product-1', 'user-a', { client }),
    ).rejects.toMatchObject({
      message: expect.not.stringMatching(/boom|secret|relation/i),
    });
  });
});

describe('saveUserRating', () => {
  it('INSERTs when no existing rating row exists', async () => {
    let readCount = 0;
    const methods: string[] = [];
    const insertPayloads: unknown[] = [];

    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn((payload: unknown) => {
        methods.push('insert');
        insertPayloads.push(payload);
        return chain;
      });
      chain.update = jest.fn(() => {
        methods.push('update');
        return chain;
      });
      chain.upsert = jest.fn(() => {
        methods.push('upsert');
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => {
        if (methods.includes('insert')) {
          return { data: { ...sampleRow, private_note: null }, error: null };
        }
        readCount += 1;
        return { data: null, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    const saved = await saveUserRating(
      {
        productId: 'product-1',
        userId: 'user-a',
        look: 8,
        comfort: 7,
        quality: 9,
        outfit: 6,
        value: 8,
        overall: 8,
        privateNote: null,
      },
      { client },
    );

    expect(saved.overall).toBe(8);
    expect(methods).toContain('insert');
    expect(methods).not.toContain('update');
    expect(methods).not.toContain('upsert');
    expect(insertPayloads[0]).toMatchObject({
      user_id: 'user-a',
      product_id: 'product-1',
      look: 8,
      overall: 8,
      private_note: null,
    });
    expect(readCount).toBe(1);
  });

  it('UPDATEs only score and private_note fields when a row exists', async () => {
    const methods: string[] = [];
    const updatePayloads: Record<string, unknown>[] = [];

    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn(() => {
        methods.push('insert');
        return chain;
      });
      chain.update = jest.fn((payload: Record<string, unknown>) => {
        methods.push('update');
        updatePayloads.push(payload);
        return chain;
      });
      chain.upsert = jest.fn(() => {
        methods.push('upsert');
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => {
        if (methods.includes('update')) {
          return {
            data: { ...sampleRow, overall: 9, private_note: 'updated' },
            error: null,
          };
        }
        return { data: sampleRow, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    const saved = await saveUserRating(
      {
        productId: 'product-1',
        userId: 'user-a',
        look: 8,
        comfort: 7,
        quality: 9,
        outfit: 6,
        value: 8,
        overall: 9,
        privateNote: 'updated',
      },
      { client },
    );

    expect(saved.overall).toBe(9);
    expect(saved.privateNote).toBe('updated');
    expect(methods).toContain('update');
    expect(methods).not.toContain('insert');
    expect(methods).not.toContain('upsert');
    expect(Object.keys(updatePayloads[0]!).sort()).toEqual(
      [
        'comfort',
        'look',
        'outfit',
        'overall',
        'private_note',
        'quality',
        'value',
      ].sort(),
    );
    expect(updatePayloads[0]).not.toHaveProperty('user_id');
    expect(updatePayloads[0]).not.toHaveProperty('product_id');
    expect(updatePayloads[0]).not.toHaveProperty('id');
    expect(updatePayloads[0]).not.toHaveProperty('created_at');
  });

  it('recovers from concurrent first-save unique violation 23505 with permitted UPDATE', async () => {
    const methods: string[] = [];
    const updatePayloads: Record<string, unknown>[] = [];
    let insertAttempts = 0;

    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn(() => {
        methods.push('insert');
        insertAttempts += 1;
        return chain;
      });
      chain.update = jest.fn((payload: Record<string, unknown>) => {
        methods.push('update');
        updatePayloads.push(payload);
        return chain;
      });
      chain.upsert = jest.fn(() => {
        methods.push('upsert');
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => {
        if (methods.filter((m) => m === 'insert').length === 1 && !methods.includes('update')) {
          // First insert loses the race.
          return {
            data: null,
            error: {
              code: '23505',
              message: 'duplicate key value violates unique constraint',
            },
          };
        }
        if (methods.includes('update')) {
          return {
            data: { ...sampleRow, overall: 10, private_note: 'race-winner' },
            error: null,
          };
        }
        // Initial read: no row yet (both concurrent attempts observed this).
        return { data: null, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    const saved = await saveUserRating(
      {
        productId: 'product-1',
        userId: 'user-a',
        look: 8,
        comfort: 7,
        quality: 9,
        outfit: 6,
        value: 8,
        overall: 10,
        privateNote: 'race-winner',
      },
      { client },
    );

    expect(saved.overall).toBe(10);
    expect(saved.privateNote).toBe('race-winner');
    expect(insertAttempts).toBe(1);
    expect(methods).toContain('insert');
    expect(methods).toContain('update');
    expect(methods).not.toContain('upsert');
    expect(updatePayloads[0]).not.toHaveProperty('user_id');
    expect(updatePayloads[0]).not.toHaveProperty('product_id');
    expect(updatePayloads[0]).toMatchObject({
      overall: 10,
      private_note: 'race-winner',
    });
  });

  it('surfaces non-23505 insert failures honestly without upsert', async () => {
    const methods: string[] = [];
    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn(() => {
        methods.push('insert');
        return chain;
      });
      chain.update = jest.fn(() => {
        methods.push('update');
        return chain;
      });
      chain.upsert = jest.fn(() => {
        methods.push('upsert');
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => {
        if (methods.includes('insert')) {
          return {
            data: null,
            error: { code: '42501', message: 'permission denied raw' },
          };
        }
        return { data: null, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    await expect(
      saveUserRating(
        {
          productId: 'product-1',
          userId: 'user-a',
          look: 8,
          comfort: 7,
          quality: 9,
          outfit: 6,
          value: 8,
          overall: 8,
        },
        { client },
      ),
    ).rejects.toMatchObject({
      code: 'unauthorized',
      message: expect.not.stringMatching(/permission denied raw/i),
    });
    expect(methods).not.toContain('upsert');
  });

  it('rejects private notes longer than 500 characters before any write', async () => {
    const from = jest.fn();
    const client = { from } as unknown as AppSupabaseClient;
    await expect(
      saveUserRating(
        {
          productId: 'product-1',
          userId: 'user-a',
          look: 8,
          comfort: 7,
          quality: 9,
          outfit: 6,
          value: 8,
          overall: 8,
          privateNote: 'x'.repeat(501),
        },
        { client },
      ),
    ).rejects.toMatchObject({ code: 'validation' });
    expect(from).not.toHaveBeenCalled();
  });

  it('accepts a 500-character private note', async () => {
    const note = 'a'.repeat(500);
    const methods: string[] = [];
    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn((payload: { private_note: string | null }) => {
        methods.push('insert');
        expect(payload.private_note).toHaveLength(500);
        return chain;
      });
      chain.upsert = jest.fn(() => {
        methods.push('upsert');
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => {
        if (methods.includes('insert')) {
          return {
            data: { ...sampleRow, private_note: note },
            error: null,
          };
        }
        return { data: null, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    const saved = await saveUserRating(
      {
        productId: 'product-1',
        userId: 'user-a',
        look: 8,
        comfort: 7,
        quality: 9,
        outfit: 6,
        value: 8,
        overall: 8,
        privateNote: note,
      },
      { client },
    );
    expect(saved.privateNote).toHaveLength(500);
    expect(methods).not.toContain('upsert');
  });

  it('does not implement PostgREST upsert on saveUserRating', () => {
    // Static guarantee: the save path must never call .upsert(
    expect(saveUserRating.toString()).not.toMatch(/\.upsert\s*\(/);
  });
});

describe('getUserRatedProducts', () => {
  it('returns a single-query list without private notes', async () => {
    const { client, from } = buildWriteClient({
      listData: [
        {
          product_id: 'product-1',
          look: 8,
          comfort: 7,
          quality: 9,
          outfit: 6,
          value: 8,
          overall: 9,
          updated_at: '2026-08-09T12:00:00.000Z',
          products: {
            id: 'product-1',
            brand: 'Nike',
            name: 'Air Force 1',
            sku: 'CW2288-111',
            is_published: true,
            product_images: [
              {
                id: 'img-1',
                image_url: 'https://example.test/a.png',
                sort_order: 0,
                created_at: '2026-08-01T00:00:00.000Z',
              },
            ],
            rating_aggregates: {
              product_id: 'product-1',
              rating_count: 3,
              score: 82,
            },
          },
        },
      ],
    });

    const items = await getUserRatedProducts('user-a', { client });
    expect(from).toHaveBeenCalledWith('user_ratings');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: 'product-1',
      brand: 'Nike',
      myOverall: 9,
      communityScore: 82,
      ratingCount: 3,
    });
    expect(items[0]).not.toHaveProperty('privateNote');
    expect(items[0]).not.toHaveProperty('private_note');
  });
});
