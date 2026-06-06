import { z } from 'zod';

export const registerSchema = z.object({
  lastName: z.string().min(1, 'Họ không được để trống'),
  middleName: z.string().optional(),
  firstName: z.string().min(1, 'Tên không được để trống'),
  nickname: z.string().optional(),
  username: z
    .string()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(20, 'Username tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  email: z.email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export type RegisterFormData = z.input<typeof registerSchema>;
