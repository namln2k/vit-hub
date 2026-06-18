import { describe, expect, it } from 'vitest';
import { createAvatarUploadIntentSchema, deleteAvatarObjectSchema } from './avatarMedia';

describe('avatar media schemas', () => {
  it('accepts a valid upload-intent request', () => {
    expect(
      createAvatarUploadIntentSchema.parse({
        contentType: 'image/webp',
        size: 512,
      }),
    ).toEqual({ contentType: 'image/webp', size: 512 });
  });

  it('rejects invalid upload and delete adapter input', () => {
    expect(
      createAvatarUploadIntentSchema.safeParse({
        contentType: 'image/svg+xml',
        size: 0,
      }).success,
    ).toBe(false);
    expect(deleteAvatarObjectSchema.safeParse({ avatarKey: ' ' }).success).toBe(false);
  });
});
