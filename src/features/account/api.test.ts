import { getMyProfile, formatMemberSince } from '@/src/features/account/api';
import { RequestTimeoutError } from '@/src/lib/network/requestTimeout';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

function buildProfileChain(options?: {
  data?: unknown;
  error?: unknown;
  track?: (method: string, args: unknown[]) => void;
}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const track = options?.track ?? ((method, args) => calls.push({ method, args }));

  const maybeSingle = jest.fn(async () => ({
    data: options?.data ?? {
      id: 'user-a',
      display_name: 'Ada',
      username: null,
      avatar_url: null,
      created_at: '2026-08-01T00:00:00.000Z',
    },
    error: options?.error ?? null,
  }));

  const chain: Record<string, unknown> = {};
  chain.abortSignal = jest.fn((...args: unknown[]) => {
    track('abortSignal', args);
    return chain;
  });
  chain.eq = jest.fn((...args: unknown[]) => {
    track('eq', args);
    return chain;
  });
  chain.select = jest.fn((...args: unknown[]) => {
    track('select', args);
    return chain;
  });
  chain.maybeSingle = maybeSingle;
  const from = jest.fn(() => chain);

  return { from, chain, maybeSingle, calls };
}

describe('getMyProfile', () => {
  it('selects only required columns for the owner id', async () => {
    const { from } = buildProfileChain();
    const client = { from } as unknown as AppSupabaseClient;

    const profile = await getMyProfile('user-a', { client });

    expect(from).toHaveBeenCalledWith('profiles');
    expect(profile).toEqual({
      id: 'user-a',
      displayName: 'Ada',
      username: null,
      avatarUrl: null,
      joinedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(formatMemberSince(profile.joinedAt)).toBe('Aug 2026');
  });

  it('forwards AbortSignal via abortSignal before maybeSingle', async () => {
    const order: string[] = [];
    const { from, chain } = buildProfileChain({
      track: (method) => order.push(method),
    });
    (chain.maybeSingle as jest.Mock).mockImplementation(async () => {
      order.push('maybeSingle');
      return {
        data: {
          id: 'user-a',
          display_name: null,
          username: null,
          avatar_url: null,
          created_at: '2026-08-01T00:00:00.000Z',
        },
        error: null,
      };
    });
    const client = { from } as unknown as AppSupabaseClient;
    const controller = new AbortController();

    await getMyProfile('user-a', { client, signal: controller.signal });

    expect(chain.abortSignal).toHaveBeenCalledWith(expect.anything());
    expect(order.indexOf('abortSignal')).toBeLessThan(
      order.indexOf('maybeSingle'),
    );
    expect(order.indexOf('abortSignal')).toBeGreaterThan(order.indexOf('eq'));
  });

  it('aborts a stalled profile read at the shared request deadline', async () => {
    jest.useFakeTimers();
    let requestSignal: AbortSignal | undefined;
    let request: Promise<unknown> | undefined;
    let outcome: Promise<unknown> | undefined;
    try {
      const { from, chain } = buildProfileChain();
      (chain.abortSignal as jest.Mock).mockImplementation(
        (signal: AbortSignal) => {
          requestSignal = signal;
          return chain;
        },
      );
      (chain.maybeSingle as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve({ data: null, error: null }),
              2_000,
            );
          }),
      );
      const client = { from } as unknown as AppSupabaseClient;
      const options = { client, timeoutMs: 1_000 };

      request = getMyProfile('user-a', options);
      outcome = request.then(
        (value) => value,
        (error) => error,
      );
      await jest.advanceTimersByTimeAsync(1_000);

      expect(requestSignal?.aborted).toBe(true);
      await expect(outcome).resolves.toBeInstanceOf(RequestTimeoutError);
    } finally {
      await jest.runAllTimersAsync();
      await request?.catch(() => undefined);
      jest.useRealTimers();
    }
  });
});
