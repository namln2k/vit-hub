import { z } from 'zod';

export const registerSchema = z.object({
  lastName: z.string().trim().min(1, 'Họ không được để trống'),
  middleName: z.string().trim().optional().default(''),
  firstName: z.string().trim().min(1, 'Tên không được để trống'),
  nickname: z.string().trim().optional().default(''),
  username: z
    .string()
    .trim()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(20, 'Username tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  email: z.string().trim().pipe(z.email('Email không hợp lệ')),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type RegisterFormData = z.input<typeof registerSchema>;
