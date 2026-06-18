import { describe, expect, it } from 'vitest';
import { postWriteSchema, setHomeFeaturedPostsSchema } from './posts';

describe('post schemas', () => {
  it('accepts a valid post write payload', () => {
    expect(
      postWriteSchema.parse({
        title: ' Post title ',
        slug: 'post-title',
        thumbnailUrl: '',
        status: 'draft',
        content: [
          {
            id: 'block-1',
            type: 'paragraph',
            text: 'Content',
          },
        ],
      }),
    ).toMatchObject({
      title: 'Post title',
      slug: 'post-title',
      status: 'draft',
    });
  });

  it('rejects invalid slugs, empty content, and oversized featured lists', () => {
    expect(
      postWriteSchema.safeParse({
        title: 'Post',
        slug: 'Invalid Slug',
        thumbnailUrl: '',
        status: 'draft',
        content: [],
      }).success,
    ).toBe(false);
    expect(
      setHomeFeaturedPostsSchema.safeParse({
        postIds: Array.from({ length: 11 }, () => '11111111-1111-4111-8111-111111111111'),
      }).success,
    ).toBe(false);
  });
});
