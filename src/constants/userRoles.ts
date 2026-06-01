export const USER_ROLE_LABELS = {
  member: 'Thành viên',
} as const;

export type UserRole = keyof typeof USER_ROLE_LABELS;
