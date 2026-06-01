export const USER_ROLE_LABELS = {
  member: 'Thành viên',
  super_admin: 'Super Admin',
} as const;

export type UserRole = keyof typeof USER_ROLE_LABELS;
