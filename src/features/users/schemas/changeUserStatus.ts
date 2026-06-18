import { z } from 'zod';

export const changeUserStatusSchema = z.object({
  userId: z.string().uuid('Mã nhân sự không hợp lệ.'),
  status: z.enum(['active', 'disabled'], {
    error: 'Trạng thái nhân sự không hợp lệ.',
  }),
});
