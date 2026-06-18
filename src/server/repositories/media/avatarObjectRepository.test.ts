import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { avatarObjectRepository } from './avatarObjectRepository';

beforeEach(() => {
  process.env.R2_ACCOUNT_ID = 'account-id';
  process.env.R2_ACCESS_KEY_ID = 'access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
  process.env.R2_BUCKET_NAME = 'avatars';
  process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('avatarObjectRepository', () => {
  it('creates a short-lived upload URL and actor-namespaced object key', async () => {
    const intent = await avatarObjectRepository.createUploadIntent('user-1', 'image/webp');

    expect(intent.avatarKey).toMatch(/^avatars\/user-1\/[0-9a-f-]+\.webp$/);
    expect(intent.avatarUrl).toBe(`https://cdn.example.com/${intent.avatarKey}`);
    expect(intent.uploadUrl).toContain(
      `account-id.r2.cloudflarestorage.com/avatars/${intent.avatarKey}`,
    );
    expect(intent.uploadUrl).toContain('X-Amz-Expires=60');
  });

  it('sends a signed delete request for the supplied object key', async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await avatarObjectRepository.delete('avatars/user-1/old.webp');

    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/avatars/avatars/user-1/old.webp');
    expect(request).toMatchObject({
      method: 'DELETE',
      headers: expect.objectContaining({
        Authorization: expect.stringContaining('AWS4-HMAC-SHA256'),
      }),
    });
  });
});
