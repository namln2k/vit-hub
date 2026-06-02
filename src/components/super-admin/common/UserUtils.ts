import type { AppUser } from '@/contexts/auth';

export function getFullName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function getSearchableUserValues(user: AppUser) {
  return [
    getFullName(user),
    user.nickname,
    user.username,
    user.email,
    user.phoneNumber,
    user.schoolName,
    user.enterYear,
    user.cohort,
  ];
}
