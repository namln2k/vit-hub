import { z } from 'zod';

export const createPostImageUploadIntentSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    error: 'Định dạng ảnh bài viết không hợp lệ.',
  }),
  size: z
    .number()
    .int('Dung lượng ảnh bài viết không hợp lệ.')
    .positive('Dung lượng ảnh bài viết không hợp lệ.'),
});

const postImageReferenceSchema = z
  .object({
    postImageKey: z.string().trim().max(500).optional(),
    url: z.url('URL ảnh bài viết không hợp lệ.').optional(),
  })
  .refine(
    (reference) => Boolean(reference.postImageKey || reference.url),
    'Thiếu thông tin ảnh bài viết.',
  );

export const deletePostImageObjectsSchema = z.object({
  images: z.array(postImageReferenceSchema).max(100),
});
