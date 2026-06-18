import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postImageObjectRepository } from './postImageObjectRepository';

beforeEach(() => {
  process.env.R2_ACCOUNT_ID = 'account-id';
  process.env.R2_ACCESS_KEY_ID = 'access-key';
  process.env.R2_SECRET_ACCESS_KEY = 'secret-key';
  process.env.R2_BUCKET_NAME = 'media';
  process.env.R2_PUBLIC_BASE_URL = 'https://cdn.example.com';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('postImageObjectRepository', () => {
  it('creates an actor-namespaced post-image upload intent', async () => {
    const intent = await postImageObjectRepository.createUploadIntent('admin-1', 'image/png');

    expect(intent.postImageKey).toMatch(/^posts\/admin-1\/[0-9a-f-]+\.png$/);
    expect(intent.postImageUrl).toBe(`https://cdn.example.com/${intent.postImageKey}`);
    expect(intent.uploadUrl).toContain(
      `account-id.r2.cloudflarestorage.com/media/${intent.postImageKey}`,
    );
  });

  it('deduplicates explicit and public-URL references before deletion', async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      postImageObjectRepository.deleteReferences([
        { postImageKey: 'posts/admin-1/image.webp' },
        { url: 'https://cdn.example.com/posts/admin-1/image.webp' },
        { url: 'https://foreign.example.com/posts/admin-1/foreign.webp' },
      ]),
    ).resolves.toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/media/posts/admin-1/image.webp');
  });
});
