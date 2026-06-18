import type { AppUser } from '@/contexts/auth';
import type { UserRole } from '@/constants/userRoles';

export interface LegacyUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  nickname: string | null;
  username: string;
  phone_number: string | null;
  school_name: string | null;
  enter_year: string | null;
  cohort: string | null;
  gender: 0 | 1 | null;
  avatar_url: string | null;
  avatar_key: string | null;
  role: UserRole;
}

export function mapLegacyUserRow(row: LegacyUserRow): AppUser {
  return {
    uid: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name ?? '',
    nickname: row.nickname ?? '',
    username: row.username,
    phoneNumber: row.phone_number ?? '-',
    schoolName: row.school_name ?? '',
    enterYear: row.enter_year ?? '',
    cohort: row.cohort ?? '',
    gender: row.gender,
    avatarUrl: row.avatar_url ?? '',
    avatarKey: row.avatar_key ?? '',
    role: row.role,
    status: 'active',
  };
}
