import 'server-only';

import { supabaseFetch } from '@/server/supabase';
import { InfrastructureError } from '@/server/services/shared/errors';
import type { UserRole } from '@/constants/userRoles';
import type { UserStatus } from '@/features/organization-structure/permissions';

const USER_SELECT =
  'id,email,first_name,last_name,middle_name,nickname,username,phone_number,school_name,enter_year,cohort,gender,avatar_url,avatar_key,role,status';

export interface UserAccountRecord {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export interface UserRecord extends UserAccountRecord {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  nickname: string | null;
  username: string;
  phoneNumber: string | null;
  schoolName: string | null;
  enterYear: string | null;
  cohort: string | null;
  gender: 0 | 1 | null;
  avatarUrl: string | null;
  avatarKey: string | null;
}

export interface SearchUserRecordsInput {
  ids?: string[];
  emails?: string[];
  search?: string;
  roles?: UserRole[];
  limit: number;
  offset: number;
}

export interface UserRecordPage {
  records: UserRecord[];
  total: number;
}

export interface CreateUserRecordInput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  avatarUrl: string;
  avatarKey: string;
}

export interface ImportUserRecordInput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
}

export interface UpdateUserProfileRecordInput {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickname?: string;
  phoneNumber?: string;
  schoolName?: string;
  enterYear?: string;
  cohort?: string;
  gender?: 0 | 1 | null;
  avatarUrl?: string;
  avatarKey?: string;
}

export interface UserStatusRecord {
  id: string;
  status: UserStatus;
  updatedAt: string;
}

interface UserAccountRow {
  id: string;
  role: UserRole;
  status: UserStatus;
}

interface UserStatusRow {
  id: string;
  status: UserStatus;
  updated_at: string;
}

interface UserRow extends UserAccountRow {
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
}

export interface UserRepository {
  findAccountById(userId: string): Promise<UserAccountRecord | null>;
  findById(userId: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findExistingEmails(emails: string[]): Promise<string[]>;
  listUsernames(): Promise<string[]>;
  usernameExists(username: string): Promise<boolean>;
  create(input: CreateUserRecordInput): Promise<UserRecord>;
  createMany(input: ImportUserRecordInput[]): Promise<number>;
  updateProfile(
    userId: string,
    input: UpdateUserProfileRecordInput,
    updatedAt: string,
  ): Promise<UserRecord>;
  search(input: SearchUserRecordsInput): Promise<UserRecordPage>;
  updateStatus(userId: string, status: UserStatus, updatedAt: string): Promise<UserStatusRecord>;
}

export class UserRecordConflictError extends Error {
  constructor() {
    super('The application user record conflicts with an existing record.');
    this.name = 'UserRecordConflictError';
  }
}

async function findUserById(userId: string): Promise<UserRecord | null> {
  const query = new URLSearchParams({
    select: USER_SELECT,
    id: `eq.${userId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`);

  if (!response.ok) {
    throw new InfrastructureError('Không thể tải hồ sơ người dùng.');
  }

  const row = Array.isArray(data) ? data[0] : null;
  return row ? mapUserRow(row) : null;
}

export const userRepository: UserRepository = {
  async findAccountById(userId) {
    const query = new URLSearchParams({
      select: 'id,role,status',
      id: `eq.${userId}`,
      limit: '1',
    });
    const { response, data } = await supabaseFetch<UserAccountRow[]>(
      `/rest/v1/user?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải thông tin người dùng.');
    }

    const row = Array.isArray(data) ? data[0] : null;
    return row ? { id: row.id, role: row.role, status: row.status } : null;
  },

  async findById(userId) {
    return findUserById(userId);
  },

  async findByUsername(username) {
    const query = new URLSearchParams({
      select: USER_SELECT,
      username: `ilike.${escapeSearchPattern(username)}`,
      limit: '1',
    });
    const { response, data } = await supabaseFetch<UserRow[]>(
      `/rest/v1/user?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải hồ sơ thành viên.');
    }

    const row = Array.isArray(data) ? data[0] : null;
    return row ? mapUserRow(row) : null;
  },

  async findExistingEmails(emails) {
    if (emails.length === 0) {
      return [];
    }

    const query = new URLSearchParams({
      select: 'email',
      email: `in.(${emails.map(quotePostgrestValue).join(',')})`,
    });
    const { response, data } = await supabaseFetch<Array<{ email: string }>>(
      `/rest/v1/user?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể kiểm tra email đã tồn tại.');
    }

    return (Array.isArray(data) ? data : []).map((row) => row.email);
  },

  async listUsernames() {
    const query = new URLSearchParams({ select: 'username' });
    const { response, data } = await supabaseFetch<Array<{ username: string }>>(
      `/rest/v1/user?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải danh sách username.');
    }

    return (Array.isArray(data) ? data : []).map((row) => row.username);
  },

  async usernameExists(username) {
    const query = new URLSearchParams({
      select: 'id',
      username: `eq.${username}`,
      limit: '1',
    });
    const { response, data } = await supabaseFetch<Array<{ id: string }>>(
      `/rest/v1/user?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể kiểm tra username.');
    }

    return Array.isArray(data) && data.length > 0;
  },

  async create(input) {
    const query = new URLSearchParams({
      on_conflict: 'id',
      select: USER_SELECT,
    });
    const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: {
        id: input.id,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        middle_name: input.middleName,
        nickname: input.nickname,
        username: input.username,
        phone_number: '-',
        school_name: '',
        enter_year: '',
        cohort: '',
        gender: null,
        avatar_url: input.avatarUrl,
        avatar_key: input.avatarKey,
        role: 'member',
        status: 'active',
      },
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new UserRecordConflictError();
      }

      throw new InfrastructureError('Không thể tạo hồ sơ người dùng.');
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (row) {
      return mapUserRow(row);
    }

    const existing = await findUserById(input.id);

    if (!existing) {
      throw new InfrastructureError('Không thể xác nhận hồ sơ người dùng sau khi tạo.');
    }

    return existing;
  },

  async createMany(input) {
    if (input.length === 0) {
      return 0;
    }

    const { response, data } = await supabaseFetch<UserRow[]>(
      `/rest/v1/user?select=${encodeURIComponent(USER_SELECT)}`,
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: input.map((user) => ({
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          middle_name: user.middleName,
          nickname: '',
          username: user.username,
          phone_number: user.phoneNumber,
          school_name: user.schoolName,
          enter_year: user.enterYear,
          cohort: user.cohort,
          gender: user.gender,
          avatar_url: '',
          avatar_key: '',
          role: 'member',
          status: 'active',
        })),
      },
    );

    if (!response.ok) {
      if (response.status === 409) {
        throw new UserRecordConflictError();
      }

      throw new InfrastructureError('Không thể import nhân sự.');
    }

    return Array.isArray(data) ? data.length : input.length;
  },

  async updateProfile(userId, input, updatedAt) {
    const query = new URLSearchParams({
      select: USER_SELECT,
      id: `eq.${userId}`,
    });
    const body = {
      ...(input.firstName !== undefined ? { first_name: input.firstName } : {}),
      ...(input.lastName !== undefined ? { last_name: input.lastName } : {}),
      ...(input.middleName !== undefined ? { middle_name: input.middleName } : {}),
      ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
      ...(input.phoneNumber !== undefined ? { phone_number: input.phoneNumber } : {}),
      ...(input.schoolName !== undefined ? { school_name: input.schoolName } : {}),
      ...(input.enterYear !== undefined ? { enter_year: input.enterYear } : {}),
      ...(input.cohort !== undefined ? { cohort: input.cohort } : {}),
      ...(input.gender !== undefined ? { gender: input.gender } : {}),
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
      ...(input.avatarKey !== undefined ? { avatar_key: input.avatarKey } : {}),
      updated_at: updatedAt,
    };
    const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body,
    });

    if (!response.ok) {
      throw new InfrastructureError('Không thể cập nhật hồ sơ người dùng.');
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      throw new InfrastructureError('Không thể xác nhận hồ sơ người dùng sau khi cập nhật.');
    }

    return mapUserRow(row);
  },

  async search(input) {
    if (input.ids?.length === 0 || input.emails?.length === 0 || input.limit <= 0) {
      return { records: [], total: 0 };
    }

    const query = createSearchQuery(input);
    const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`, {
      headers: { Prefer: 'count=exact' },
    });

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải danh sách nhân sự.');
    }

    return {
      records: (Array.isArray(data) ? data : []).map(mapUserRow),
      total: readTotalCount(response.headers.get('content-range')),
    };
  },

  async updateStatus(userId, status, updatedAt) {
    const query = new URLSearchParams({
      select: 'id,status,updated_at',
      id: `eq.${userId}`,
    });
    const { response, data } = await supabaseFetch<UserStatusRow[]>(
      `/rest/v1/user?${query.toString()}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: {
          status,
          updated_at: updatedAt,
        },
      },
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể cập nhật trạng thái nhân sự.');
    }

    const row = Array.isArray(data) ? data[0] : null;

    if (!row) {
      throw new InfrastructureError('Không thể xác nhận trạng thái nhân sự sau khi cập nhật.');
    }

    return {
      id: row.id,
      status: row.status,
      updatedAt: row.updated_at,
    };
  },
};

function createSearchQuery(input: SearchUserRecordsInput) {
  const query = new URLSearchParams({
    select: USER_SELECT,
    order: 'username.asc',
    limit: String(input.limit),
    offset: String(input.offset),
  });
  const search = input.search?.trim();

  if (input.ids?.length === 1) {
    query.set('id', `eq.${input.ids[0]}`);
  } else if (input.ids && input.ids.length > 1) {
    query.set('id', `in.(${input.ids.join(',')})`);
  }

  if (input.emails?.length) {
    query.append(
      'or',
      `(${input.emails
        .map((email) => `email.ilike.${escapeSearchPattern(email.trim())}`)
        .join(',')})`,
    );
  }

  if (search) {
    const pattern = `*${escapeSearchPattern(search)}*`;
    query.append(
      'or',
      `(${[
        'username',
        'email',
        'first_name',
        'last_name',
        'middle_name',
        'nickname',
        'phone_number',
        'school_name',
        'enter_year',
        'cohort',
      ]
        .map((column) => `${column}.ilike.${pattern}`)
        .join(',')})`,
    );
  }

  if (input.roles?.length === 1) {
    query.set('role', `eq.${input.roles[0]}`);
  } else if (input.roles && input.roles.length > 1) {
    query.set('role', `in.(${input.roles.join(',')})`);
  }

  return query;
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    nickname: row.nickname,
    username: row.username,
    phoneNumber: row.phone_number,
    schoolName: row.school_name,
    enterYear: row.enter_year,
    cohort: row.cohort,
    gender: row.gender,
    avatarUrl: row.avatar_url,
    avatarKey: row.avatar_key,
    role: row.role,
    status: row.status,
  };
}

function readTotalCount(contentRange: string | null) {
  const total = contentRange?.split('/')[1];
  return total && total !== '*' ? Number(total) || 0 : 0;
}

function escapeSearchPattern(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll('*', '\\*');
}

function quotePostgrestValue(value: string) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}
