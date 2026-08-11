import {
  getUserRatedProducts,
  getUserRating,
  saveUserRating,
} from '@/src/features/ratings/api';
import { RatingError } from '@/src/features/ratings/errors';
import { RATING_METHODOLOGY_VERSION } from '@/src/features/ratings/dimensions';
import { uniformDimensions } from '@/src/features/ratings/testFixtures';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

const sampleDims = uniformDimensions(8);
const sampleRow = {
  look: 8,
  outfit: 8,
  material: 8,
  craftsmanship: 8,
  maintenance: 8,
  comfort: 8,
  collection: 8,
  value: 8,
  resale_potential: 8,
  acquisition_ease: 8,
  score: 80,
  methodology_version: RATING_METHODOLOGY_VERSION,
  private_note: 'secret',
};

const sampleInput = {
  productId: 'product-1',
  userId: 'user-a',
  ...sampleDims,
  privateNote: null as string | null,
};

function buildChain(options: {
  existing?: unknown | null;
  existingError?: unknown;
  insertResult?: { data?: unknown; error?: unknown };
  updateResult?: { data?: unknown; error?: unknown };
  listData?: unknown;
  listError?: unknown;
  methods: string[];
  insertPayloads: unknown[];
  updatePayloads: unknown[];
}) {
  const chain: Record<string, unknown> = {};
  const self = chain;
  chain.select = jest.fn(() => {
    options.methods.push('select');
    return self;
  });
  chain.eq = jest.fn(() => {
    options.methods.push('eq');
    return self;
  });
  chain.order = jest.fn(() => {
    options.methods.push('order');
    return self;
  });
  chain.limit = jest.fn(() => {
    options.methods.push('limit');
    return self;
  });
  chain.abortSignal = jest.fn(() => self);
  chain.insert = jest.fn((payload: unknown) => {
    options.methods.push('insert');
    options.insertPayloads.push(payload);
    return self;
  });
  chain.update = jest.fn((payload: unknown) => {
    options.methods.push('update');
    options.updatePayloads.push(payload);
    return self;
  });
  chain.upsert = jest.fn(() => {
    options.methods.push('upsert');
    return self;
  });
  chain.maybeSingle = jest.fn(async () => {
    options.methods.push('maybeSingle');
    const lastWrite = [...options.methods]
      .reverse()
      .find((m) => m === 'insert' || m === 'update');
    if (lastWrite === 'insert') {
      return {
        data: options.insertResult?.data ?? null,
        error: options.insertResult?.error ?? null,
      };
    }
    if (lastWrite === 'update') {
      return {
        data: options.updateResult?.data ?? null,
        error: options.updateResult?.error ?? null,
      };
    }
    return {
      data: options.existing === undefined ? null : options.existing,
      error: options.existingError ?? null,
    };
  });

  const listResponse = {
    data: options.listData ?? [],
    error: options.listError ?? null,
  };
  Object.defineProperty(chain, 'then', {
    value: (
      onFulfilled?: (value: typeof listResponse) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(listResponse).then(onFulfilled, onRejected),
    configurable: true,
  });
  return chain;
}

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
  const shared = {
    ...options,
    methods,
    insertPayloads,
    updatePayloads,
  };

  const from = jest.fn(() => buildChain(shared));

  return {
    client: { from } as unknown as AppSupabaseClient,
    methods,
    insertPayloads,
    updatePayloads,
    from,
  };
}

describe('getUserRating', () => {
  it('returns null when the owner has no rating', async () => {
    const { client } = buildWriteClient({ existing: null });
    await expect(
      getUserRating('product-1', 'user-a', { client }),
    ).resolves.toBeNull();
  });

  it('normalizes private_note and server composite for an existing rating', async () => {
    const { client } = buildWriteClient({ existing: sampleRow });
    await expect(
      getUserRating('product-1', 'user-a', { client }),
    ).resolves.toEqual({
      ...sampleDims,
      score100: 80,
      privateNote: 'secret',
      methodologyVersion: RATING_METHODOLOGY_VERSION,
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
  it('fails fast with offline RatingError when isOnline is false', async () => {
    const { client, methods } = buildWriteClient({});
    await expect(
      saveUserRating(sampleInput, {
        client,
        isOnline: () => false,
      }),
    ).rejects.toMatchObject({ code: 'offline' });
    expect(methods).toEqual([]);
  });

  it('INSERTs dimensions only (never score or methodology) when no row exists', async () => {
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
        return { data: null, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    const saved = await saveUserRating(sampleInput, { client });
    expect(saved.score100).toBe(80);
    expect(methods).toContain('insert');
    expect(methods).not.toContain('upsert');
    const payload = insertPayloads[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('score');
    expect(payload).not.toHaveProperty('methodology_version');
    expect(payload).not.toHaveProperty('overall');
    expect(payload).not.toHaveProperty('quality');
    expect(payload.resale_potential).toBe(8);
    expect(payload.acquisition_ease).toBe(8);
  });

  it('UPDATEs when a rating already exists', async () => {
    const methods: string[] = [];
    const updatePayloads: unknown[] = [];
    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn(() => {
        methods.push('insert');
        return chain;
      });
      chain.update = jest.fn((payload: unknown) => {
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
            data: { ...sampleRow, score: 90, private_note: 'updated' },
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
        ...sampleInput,
        ...uniformDimensions(9),
        privateNote: 'updated',
      },
      { client },
    );
    expect(saved.score100).toBe(90);
    expect(methods).toContain('update');
    expect(methods).not.toContain('insert');
    expect(methods).not.toContain('upsert');
    const payload = updatePayloads[0] as Record<string, unknown>;
    expect(payload.private_note).toBe('updated');
    expect(payload).not.toHaveProperty('score');
  });

  it('recovers from 23505 by updating scores and private_note only', async () => {
    const methods: string[] = [];
    let phase: 'read' | 'insert' | 'update' = 'read';
    const from = jest.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.abortSignal = jest.fn(() => chain);
      chain.insert = jest.fn(() => {
        methods.push('insert');
        phase = 'insert';
        return chain;
      });
      chain.update = jest.fn(() => {
        methods.push('update');
        phase = 'update';
        return chain;
      });
      chain.upsert = jest.fn(() => {
        methods.push('upsert');
        return chain;
      });
      chain.maybeSingle = jest.fn(async () => {
        if (phase === 'insert') {
          return { data: null, error: { code: '23505', message: 'duplicate' } };
        }
        if (phase === 'update') {
          return {
            data: { ...sampleRow, score: 80, private_note: 'race-winner' },
            error: null,
          };
        }
        return { data: null, error: null };
      });
      return chain;
    });

    const client = { from } as unknown as AppSupabaseClient;
    const saved = await saveUserRating(
      { ...sampleInput, privateNote: 'race-winner' },
      { client },
    );
    expect(saved.privateNote).toBe('race-winner');
    expect(methods).toEqual(expect.arrayContaining(['insert', 'update']));
    expect(methods).not.toContain('upsert');
  });

  it('rejects client composite that disagrees with dimensions', async () => {
    const { client } = buildWriteClient({});
    await expect(
      saveUserRating({ ...sampleInput, score100: 99 }, { client }),
    ).rejects.toMatchObject({ code: 'validation' });
  });
});

describe('getUserRatedProducts', () => {
  it('maps published rated products with 0–100 My Rating', async () => {
    const { client } = buildWriteClient({
      listData: [
        {
          product_id: 'product-1',
          ...sampleRow,
          updated_at: '2026-08-01T00:00:00.000Z',
          products: {
            id: 'product-1',
            brand: 'Nike',
            name: 'Air',
            sku: 'X',
            is_published: true,
            product_images: [],
            rating_aggregates: {
              product_id: 'product-1',
              rating_count: 2,
              score: 75,
            },
          },
        },
      ],
    });

    const items = await getUserRatedProducts('user-a', { client });
    expect(items).toHaveLength(1);
    expect(items[0]?.myScore100).toBe(80);
    expect(items[0]?.communityScore).toBe(75);
  });
});
