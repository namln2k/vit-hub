import 'server-only';

import {
  userRepository,
  type UserRecord,
  type UserRepository,
} from '@/server/repositories/users/userRepository';
import { organizationAuthorization } from '@/server/services/organization/authorization';
import type { Actor } from '@/server/services/shared/actor';
import type {
  PageDto,
  SearchUsersInput,
  UserSearchResultDto,
  UserSummaryDto,
} from '@/features/users/types';

const DEFAULT_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const ADMIN_PAGE_SIZE = 1000;

interface SearchUsersDependencies {
  users: Pick<UserRepository, 'search'>;
  authorization: Pick<typeof organizationAuthorization, 'requireOrganizationPermission'>;
}

const defaultDependencies: SearchUsersDependencies = {
  users: userRepository,
  authorization: organizationAuthorization,
};

export function createUserQueries(dependencies: SearchUsersDependencies = defaultDependencies) {
  async function searchUsers(input: SearchUsersInput = {}): Promise<PageDto<UserSearchResultDto>> {
    const limit = clamp(input.limit ?? DEFAULT_LIMIT, 1, MAX_SEARCH_LIMIT);
    const offset = Math.max(0, input.offset ?? 0);
    const page = await dependencies.users.search({
      ids: input.ids,
      emails: input.emails,
      search: input.search,
      roles: input.roles,
      limit,
      offset,
    });

    return {
      items: page.records.map(mapUserSearchResult),
      total: page.total,
      limit,
      offset,
      hasMore: offset + page.records.length < page.total,
    };
  }

  async function listUsersForAdministration(actor: Actor): Promise<UserSummaryDto[]> {
    await dependencies.authorization.requireOrganizationPermission(actor, 'scope.member.manage');

    const users: UserSummaryDto[] = [];
    let offset = 0;

    while (true) {
      const page = await dependencies.users.search({
        limit: ADMIN_PAGE_SIZE,
        offset,
      });
      users.push(...page.records.map(mapUserSummary));

      if (page.records.length < ADMIN_PAGE_SIZE || users.length >= page.total) {
        return users;
      }

      offset += ADMIN_PAGE_SIZE;
    }
  }

  async function getUsersByIds(userIds: string[]): Promise<UserSummaryDto[]> {
    if (userIds.length === 0) {
      return [];
    }

    const page = await dependencies.users.search({
      ids: userIds,
      limit: Math.min(userIds.length, MAX_SEARCH_LIMIT),
      offset: 0,
    });
    return page.records.map(mapUserSummary);
  }

  return {
    getUsersByIds,
    listUsersForAdministration,
    searchUsers,
  };
}

export const { getUsersByIds, listUsersForAdministration, searchUsers } = createUserQueries();

export function mapUserSummary(record: UserRecord): UserSummaryDto {
  return {
    uid: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    middleName: record.middleName ?? '',
    nickname: record.nickname ?? '',
    username: record.username,
    phoneNumber: record.phoneNumber ?? '-',
    schoolName: record.schoolName ?? '',
    enterYear: record.enterYear ?? '',
    cohort: record.cohort ?? '',
    gender: record.gender,
    avatarUrl: record.avatarUrl ?? '',
    avatarKey: record.avatarKey ?? '',
    role: record.role,
    status: record.status,
  };
}

function mapUserSearchResult(record: UserRecord): UserSearchResultDto {
  return {
    uid: record.id,
    email: record.email,
    firstName: record.firstName,
    lastName: record.lastName,
    middleName: record.middleName ?? '',
    nickname: record.nickname ?? '',
    username: record.username,
    avatarUrl: record.avatarUrl ?? '',
    role: record.role,
    status: record.status,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
