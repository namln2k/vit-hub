import { supabase } from '@/api/supabase';
import type { AppUser } from '@/contexts/auth';
import type { UserRole } from '@/constants/userRoles';

export interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  username: string;
  avatar_url: string | null;
  avatar_key: string | null;
  role: UserRole;
}

export interface UserWrite {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  username: string;
  avatar_url: string;
  avatar_key: string;
  role: UserRole;
}

export function mapUserRow(row: UserRow): AppUser {
  return {
    uid: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name ?? '',
    username: row.username,
    avatarUrl: row.avatar_url ?? '',
    avatarKey: row.avatar_key ?? '',
    role: row.role,
  };
}

export function mapUserToWrite(user: AppUser): UserWrite {
  return {
    id: user.uid,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    middle_name: user.middleName,
    username: user.username,
    avatar_url: user.avatarUrl ?? '',
    avatar_key: user.avatarKey ?? '',
    role: user.role,
  };
}

export async function getUser(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('user')
    .select('id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role')
    .eq('id', userId)
    .maybeSingle<UserRow>();

  if (error) {
    throw error;
  }

  return data ? mapUserRow(data) : null;
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
    .select('id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role')
    .single<UserRow>();

  if (error) {
    throw error;
  }

  return mapUserRow(data);
}

export async function searchUsers(queryText: string): Promise<AppUser[]> {
  const escapedQuery = queryText.replaceAll('%', '\\%').replaceAll('_', '\\_');
  const pattern = `%${escapedQuery}%`;
  const { data, error } = await supabase
    .from('user')
    .select('id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role')
    .or(
      `username.ilike.${pattern},email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    )
    .order('username', { ascending: true })
    .limit(12)
    .returns<UserRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapUserRow);
}
