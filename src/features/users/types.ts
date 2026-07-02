import type { UserRole } from '@/constants/userRoles';
import type {
  MembershipStatus,
  NonEventRoleKey,
  NonEventScopeType,
  UserStatus,
} from '@/features/organization-structure/permissions';

export interface UserOrganizationRoleDto {
  id: string;
  roleKey: NonEventRoleKey;
  roleLabel: string;
  scopeType: NonEventScopeType;
  scopeName: string;
  startsAt: string;
  endsAt: string | null;
  status: MembershipStatus;
}

export interface UserOrganizationMembershipDto {
  id: string;
  scopeId: string;
  scopeName: string;
  startsAt: string;
  endsAt: string | null;
  status: MembershipStatus;
}

export interface UserOrganizationProfileDto {
  currentRoles: UserOrganizationRoleDto[];
  pastRoles: UserOrganizationRoleDto[];
  divisions: {
    current: UserOrganizationMembershipDto[];
    past: UserOrganizationMembershipDto[];
  };
  groups: {
    current: UserOrganizationMembershipDto[];
    past: UserOrganizationMembershipDto[];
  };
  clubs: {
    current: UserOrganizationMembershipDto[];
    past: UserOrganizationMembershipDto[];
  };
}

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
  organizationProfile: UserOrganizationProfileDto;
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
