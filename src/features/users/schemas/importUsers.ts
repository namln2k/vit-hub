import { z } from 'zod';

export const MAX_IMPORT_USERS = 500;

const importUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Email không hợp lệ.')),
  firstName: z.string().trim().min(1, 'Tên không được để trống.').max(200),
  lastName: z.string().trim().min(1, 'Họ không được để trống.').max(200),
  middleName: z.string().trim().max(200),
  phoneNumber: z
    .string()
    .trim()
    .max(50)
    .transform((value) => value.replace(/\s+/g, '') || '-'),
  schoolName: z.string().trim().max(300),
  enterYear: z.string().trim().max(50),
  cohort: z.string().trim().max(100),
  gender: z.union([z.literal(0), z.literal(1), z.null()]),
});

export const importUsersSchema = z.object({
  users: z
    .array(importUserSchema)
    .min(1, 'Không có nhân sự nào để import.')
    .max(MAX_IMPORT_USERS, `Mỗi lần chỉ import tối đa ${MAX_IMPORT_USERS} nhân sự.`),
});

export type ImportUsersInput = z.output<typeof importUsersSchema>;
