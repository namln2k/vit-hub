import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authRepository } from './authRepository';

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authRepository', () => {
  it('maps a successful password signup without exposing raw Auth fields', async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json({
        user: {
          id: 'auth-user-1',
          identities: [{ id: 'identity-1' }],
        },
        session: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      authRepository.signUpWithPassword({
        email: 'member@example.com',
        password: 'password123',
        emailRedirectTo: 'https://app.example.com/login',
        metadata: { username: 'member' },
      }),
    ).resolves.toEqual({
      userId: 'auth-user-1',
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(String(requestUrl)).toContain(
      '/auth/v1/signup?redirect_to=https%3A%2F%2Fapp.example.com%2Flogin',
    );
    expect(requestInit).toEqual({
      method: 'POST',
      headers: {
        apikey: 'publishable-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'member@example.com',
        password: 'password123',
        data: { username: 'member' },
      }),
    });
  });

  it('detects the obfuscated existing-user response from Supabase Auth', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          user: {
            id: 'obfuscated-user-id',
            identities: [],
          },
          session: null,
        }),
      ),
    );

    await expect(
      authRepository.signUpWithPassword({
        email: 'existing@example.com',
        password: 'password123',
        emailRedirectTo: '',
        metadata: {},
      }),
    ).rejects.toMatchObject({
      reason: 'duplicate_email',
    });
  });
});
