import type { UserRole } from '@/constants/userRoles';
import type { UserStatus } from '@/features/organization-structure/permissions';

export interface UserSummaryDto {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
  avatarUrl: string;
  avatarKey: string;
  role: UserRole;
  status: UserStatus;
}

export type UserSearchResultDto = Pick<
  UserSummaryDto,
  | 'uid'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'middleName'
  | 'nickname'
  | 'username'
  | 'avatarUrl'
  | 'role'
  | 'status'
>;

export interface PageDto<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SearchUsersInput {
  ids?: string[];
  emails?: string[];
  search?: string;
  roles?: UserRole[];
  limit?: number;
  offset?: number;
}

export interface UserStatusDto {
  userId: string;
  status: UserStatus;
  updatedAt: string;
}
