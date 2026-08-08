import { getMyProfile, formatMemberSince } from '@/src/features/account/api';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

describe('getMyProfile', () => {
  it('selects only required columns for the owner id', async () => {
    const maybeSingle = jest.fn(async () => ({
      data: {
        id: 'user-a',
        display_name: 'Ada',
        username: null,
        avatar_url: null,
        created_at: '2026-08-01T00:00:00.000Z',
      },
      error: null,
    }));
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    const client = { from } as unknown as AppSupabaseClient;

    const profile = await getMyProfile('user-a', { client });

    expect(from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith(
      'id, display_name, username, avatar_url, created_at',
    );
    expect(eq).toHaveBeenCalledWith('id', 'user-a');
    expect(profile).toEqual({
      id: 'user-a',
      displayName: 'Ada',
      username: null,
      avatarUrl: null,
      joinedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(formatMemberSince(profile.joinedAt)).toBe('Aug 2026');
  });
});
