import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postRepository } from './postRepository';

const postRow = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Post title',
  slug: 'post-title',
  thumbnail_url: null,
  thumbnail_image_key: null,
  status: 'published',
  content: [],
  created_by: '22222222-2222-4222-8222-222222222222',
  created_at: '2026-06-18T10:00:00.000Z',
  updated_at: '2026-06-18T11:00:00.000Z',
  published_at: '2026-06-18T11:00:00.000Z',
};

beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('postRepository', () => {
  it('maps published rows and applies stable publication ordering', async () => {
    const fetchMock = vi.fn(async () => Response.json([postRow]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(postRepository.list({ status: 'published', limit: 10 })).resolves.toEqual([
      {
        id: postRow.id,
        title: 'Post title',
        slug: 'post-title',
        thumbnailUrl: null,
        thumbnailImageKey: null,
        status: 'published',
        content: [],
        createdBy: postRow.created_by,
        createdAt: postRow.created_at,
        updatedAt: postRow.updated_at,
        publishedAt: postRow.published_at,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /status=eq\.published.*order=published_at\.desc\.nullslast%2Ccreated_at\.desc.*limit=10/,
      ),
      expect.any(Object),
    );
  });

  it('maps create input to persistence columns', async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return Response.json([postRow]);
    });
    vi.stubGlobal('fetch', fetchMock);

    await postRepository.create({
      title: 'Post title',
      slug: 'post-title',
      thumbnailUrl: null,
      thumbnailImageKey: null,
      status: 'published',
      content: [],
      publishedAt: postRow.published_at,
      updatedAt: postRow.updated_at,
      createdBy: postRow.created_by,
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      title: 'Post title',
      slug: 'post-title',
      thumbnail_url: null,
      thumbnail_image_key: null,
      status: 'published',
      content: [],
      updated_at: postRow.updated_at,
      published_at: postRow.published_at,
      created_by: postRow.created_by,
    });
  });

  it('replaces featured post IDs through one RPC call', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await postRepository.replaceFeaturedPostIds([postRow.id]);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/rpc/replace_home_featured_posts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ post_ids: [postRow.id] }),
      }),
    );
  });
});
