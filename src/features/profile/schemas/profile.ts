import { z } from 'zod';

const trimmedText = (maximum: number) => z.string().trim().max(maximum);

export const updateCurrentUserNameSchema = z.object({
  firstName: trimmedText(100).min(1, 'Tên không được để trống.'),
  lastName: trimmedText(100).min(1, 'Họ không được để trống.'),
  middleName: trimmedText(100),
});

export const updateCurrentUserNicknameSchema = z.object({
  nickname: trimmedText(100),
});

export const updateCurrentUserPersonnelSchema = z.object({
  phoneNumber: trimmedText(50).transform((value) => value || '-'),
  schoolName: trimmedText(200),
  cohort: trimmedText(50),
  enterYear: trimmedText(50),
  gender: z.union([z.literal(0), z.literal(1), z.null()]),
});

export const setCurrentUserAvatarSchema = z.object({
  avatarUrl: z.url('URL ảnh đại diện không hợp lệ.'),
  avatarKey: z.string().trim().min(1, 'Avatar key không hợp lệ.').max(500),
});
