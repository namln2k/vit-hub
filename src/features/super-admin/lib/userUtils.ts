import type { AppUser } from '@/contexts/auth';

export function getFullName(user: Pick<AppUser, 'lastName' | 'middleName' | 'firstName'>) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function getSearchableUserValues(
  user: Pick<
    AppUser,
    | 'lastName'
    | 'middleName'
    | 'firstName'
    | 'nickname'
    | 'username'
    | 'schoolName'
    | 'enterYear'
    | 'cohort'
  > & {
    email?: string | null;
    phoneNumber?: string | null;
  },
) {
  return [
    getFullName(user),
    user.nickname,
    user.username,
    user.email ?? '',
    user.phoneNumber ?? '',
    user.schoolName,
    user.enterYear,
    user.cohort,
  ];
}
