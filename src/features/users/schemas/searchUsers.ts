import { z } from 'zod';

const userRoleSchema = z.enum(['member', 'super_admin']);

export const searchUsersSchema = z.object({
  ids: z.array(z.string().uuid('Mã nhân sự không hợp lệ.')).max(100).optional(),
  emails: z.array(z.string().email('Email không hợp lệ.')).max(100).optional(),
  search: z.string().trim().max(200).optional(),
  roles: z.array(userRoleSchema).max(2).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
