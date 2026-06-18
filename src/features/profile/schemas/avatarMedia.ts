import { z } from 'zod';

export const createAvatarUploadIntentSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    error: 'Định dạng ảnh đại diện không hợp lệ.',
  }),
  size: z
    .number()
    .int('Dung lượng ảnh đại diện không hợp lệ.')
    .positive('Dung lượng ảnh đại diện không hợp lệ.'),
});

export const deleteAvatarObjectSchema = z.object({
  avatarKey: z.string().trim().min(1, 'Avatar key không hợp lệ.').max(500),
});
