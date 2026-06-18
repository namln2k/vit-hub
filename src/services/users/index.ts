import { API_ROUTES } from '@/constants/routes';
import { supabase } from '@/services/supabase';
import type { AppUser } from '@/contexts/auth';
import type { UserRole } from '@/constants/userRoles';
import type { UserStatus } from '@/features/organization-structure/permissions';

const USER_SELECT =
  'id, email, first_name, last_name, middle_name, nickname, username, phone_number, school_name, enter_year, cohort, gender, avatar_url, avatar_key, role, status';
const DEFAULT_USERS_LIMIT = 20;
const ALL_USERS_PAGE_SIZE = 1000;

export interface QueryUsersParams {
  ids?: string[];
  emails?: string[];
  search?: string;
  roles?: UserRole[];
  limit?: number;
  offset?: number;
  fetchAll?: boolean;
}

export interface ImportUserInput {
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
}

export interface UserRow {
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
  status?: UserStatus;
}

export interface UserWrite {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  nickname: string;
  username: string;
  phone_number: string;
  school_name: string;
  enter_year: string;
  cohort: string;
  gender: 0 | 1 | null;
  avatar_url: string;
  avatar_key: string;
  role: UserRole;
  status: UserStatus;
}

export function mapUserRow(row: UserRow): AppUser {
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
    gender: row.gender ?? null,
    avatarUrl: row.avatar_url ?? '',
    avatarKey: row.avatar_key ?? '',
    role: row.role,
    status: row.status ?? 'active',
  };
}

export function mapUserToWrite(user: AppUser): UserWrite {
  return {
    id: user.uid,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    middle_name: user.middleName,
    nickname: user.nickname,
    username: user.username,
    phone_number: user.phoneNumber || '-',
    school_name: user.schoolName,
    enter_year: user.enterYear,
    cohort: user.cohort,
    gender: user.gender,
    avatar_url: user.avatarUrl ?? '',
    avatar_key: user.avatarKey ?? '',
    role: user.role,
    status: user.status ?? 'active',
  };
}

export async function getUser(userId: string): Promise<AppUser | null> {
  const users = await queryUsers({ ids: [userId], limit: 1 });

  return users[0] ?? null;
}

export async function usernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user')
    .select('id')
    .eq('username', username)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function upsertUser(user: AppUser): Promise<AppUser> {
  const { data, error } = await supabase
    .from('user')
    .upsert(mapUserToWrite(user), { onConflict: 'id' })
    .select(USER_SELECT)
    .single<UserRow>();

  if (error) {
    throw error;
  }

  return mapUserRow(data);
}

export async function queryUsers(params: QueryUsersParams = {}): Promise<AppUser[]> {
  if (params.ids && params.ids.length === 0) {
    return [];
  }

  if (params.emails && params.emails.length === 0) {
    return [];
  }

  const pageSize = params.limit ?? (params.fetchAll ? ALL_USERS_PAGE_SIZE : DEFAULT_USERS_LIMIT);
  if (pageSize <= 0) {
    return [];
  }

  const rows: UserRow[] = [];
  let offset = params.offset ?? 0;

  while (true) {
    const { data, error } = await createUserQuery(params)
      .range(offset, offset + pageSize - 1)
      .returns<UserRow[]>();

    if (error) {
      throw error;
    }

    rows.push(...data);

    if (!params.fetchAll || data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows.map(mapUserRow);
}

export async function importUsers(users: ImportUserInput[]): Promise<number> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập để import nhân sự.');
  }

  const response = await fetch(API_ROUTES.usersImport, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? 'Không thể import nhân sự.');
  }

  return Number(result.importedCount) || 0;
}

export async function updateUserStatus(userId: string, status: UserStatus) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập để cập nhật trạng thái nhân sự.');
  }

  const response = await fetch(`/api/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    const message = result.error ?? 'Không thể cập nhật trạng thái nhân sự.';
    throw new Error(`${response.status} ${getHttpStatusLabel(response.status)}: ${message}`);
  }
}

function getHttpStatusLabel(status: number) {
  if (status === 403) {
    return 'Forbidden';
  }

  if (status === 409) {
    return 'Conflict';
  }

  return 'Error';
}

function createUserQuery(params: QueryUsersParams) {
  const search = params.search?.trim();
  let query = supabase.from('user').select(USER_SELECT).order('username', { ascending: true });

  if (params.ids?.length === 1) {
    query = query.eq('id', params.ids[0]);
  } else if (params.ids && params.ids.length > 1) {
    query = query.in('id', params.ids);
  }

  if (params.emails?.length) {
    query = query.or(
      params.emails.map((email) => `email.ilike.${escapeSearchPattern(email.trim())}`).join(','),
    );
  }

  if (search) {
    const pattern = `%${escapeSearchPattern(search)}%`;
    query = query.or(
      `username.ilike.${pattern},email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},middle_name.ilike.${pattern},nickname.ilike.${pattern},phone_number.ilike.${pattern},school_name.ilike.${pattern},enter_year.ilike.${pattern},cohort.ilike.${pattern}`,
    );
  }

  if (params.roles?.length === 1) {
    query = query.eq('role', params.roles[0]);
  } else if (params.roles && params.roles.length > 1) {
    query = query.in('role', params.roles);
  }

  return query;
}

function escapeSearchPattern(value: string) {
  return value.replaceAll('%', '\\%').replaceAll('_', '\\_');
}
