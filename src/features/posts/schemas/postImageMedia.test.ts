import { describe, expect, it } from 'vitest';
import { createPostImageUploadIntentSchema, deletePostImageObjectsSchema } from './postImageMedia';

describe('post image media schemas', () => {
  it('accepts valid upload and deletion inputs', () => {
    expect(
      createPostImageUploadIntentSchema.parse({
        contentType: 'image/webp',
        size: 1024,
      }),
    ).toEqual({ contentType: 'image/webp', size: 1024 });
    expect(
      deletePostImageObjectsSchema.parse({
        images: [
          { postImageKey: 'posts/admin-1/image.webp' },
          { url: 'https://cdn.example.com/posts/admin-1/legacy.webp' },
        ],
      }).images,
    ).toHaveLength(2);
  });

  it('rejects empty references and invalid adapter input', () => {
    expect(
      createPostImageUploadIntentSchema.safeParse({
        contentType: 'image/svg+xml',
        size: 0,
      }).success,
    ).toBe(false);
    expect(deletePostImageObjectsSchema.safeParse({ images: [{}] }).success).toBe(false);
  });
});
