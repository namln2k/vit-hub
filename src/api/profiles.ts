import { supabase } from '@/api/supabase';
import type { UserProfile } from '@/contexts/auth';
import type { UserRole } from '@/constants/userRoles';

export interface ProfileRow {
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

export interface ProfileWrite {
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

export function mapProfileRow(row: ProfileRow): UserProfile {
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

export function mapProfileToWrite(profile: UserProfile): ProfileWrite {
  return {
    id: profile.uid,
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    middle_name: profile.middleName,
    username: profile.username,
    avatar_url: profile.avatarUrl ?? '',
    avatar_key: profile.avatarKey ?? '',
    role: profile.role,
  };
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role',
    )
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return data ? mapProfileRow(data) : null;
}

export async function usernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function upsertProfile(profile: UserProfile): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(mapProfileToWrite(profile), { onConflict: 'id' })
    .select(
      'id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role',
    )
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
}

export async function searchProfiles(queryText: string): Promise<UserProfile[]> {
  const escapedQuery = queryText.replaceAll('%', '\\%').replaceAll('_', '\\_');
  const pattern = `%${escapedQuery}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role',
    )
    .or(
      `username.ilike.${pattern},email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`,
    )
    .order('username', { ascending: true })
    .limit(12)
    .returns<ProfileRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapProfileRow);
}
