import { getMyProfile, formatMemberSince } from '@/src/features/account/api';
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

    expect(chain.abortSignal).toHaveBeenCalledWith(controller.signal);
    expect(order.indexOf('abortSignal')).toBeLessThan(
      order.indexOf('maybeSingle'),
    );
    expect(order.indexOf('abortSignal')).toBeGreaterThan(order.indexOf('eq'));
  });
});
