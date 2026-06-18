import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationAuthorizationRepository } from './authorizationRepository';

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('organizationAuthorizationRepository', () => {
  it('maps a club parent division identifier to a string', async () => {
    const fetchMock = vi.fn(async () => Response.json([{ division_id: 42 }]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      organizationAuthorizationRepository.findClubParentDivisionId('club-a'),
    ).resolves.toBe('42');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/rest\/v1\/clubs\?.*id=eq\.club-a.*limit=1/),
      expect.any(Object),
    );
  });

  it('returns null when the club does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json([])),
    );

    await expect(
      organizationAuthorizationRepository.findClubParentDivisionId('missing-club'),
    ).resolves.toBeNull();
  });
});
