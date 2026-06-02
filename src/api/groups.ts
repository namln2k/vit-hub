import { supabase } from '@/api/supabase';
import { mapUserRow, type UserRow } from '@/api/users';
import type { AppUser } from '@/contexts/auth';

export interface Group {
  id: string;
  name: string;
  description: string;
}

interface GroupRow {
  id: string | number;
  name: string;
  description?: string | null;
}

interface UserGroupRow {
  user: UserRow | null;
}

interface GroupWrite {
  name: string;
  description: string | null;
}

interface UserGroupWrite {
  group_id: string;
  user_id: string;
}

function mapGroupRow(row: GroupRow): Group {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
  };
}

export async function listGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description')
    .order('name', { ascending: true })
    .returns<GroupRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapGroupRow);
}

export async function createGroup(name: string, description: string): Promise<Group> {
  const row: GroupWrite = {
    name: name.trim(),
    description: description.trim() || null,
  };

  const { data, error } = await supabase
    .from('groups')
    .insert(row)
    .select('id, name, description')
    .single<GroupRow>();

  if (error) {
    throw error;
  }

  return mapGroupRow(data);
}

export async function listUsersByGroup(groupId: string): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('user_groups')
    .select(
      'user:user!user_groups_user_id_fkey(id, email, first_name, last_name, middle_name, nickname, username, phone_number, school_name, enter_year, cohort, gender, avatar_url, avatar_key, role)',
    )
    .eq('group_id', groupId)
    .returns<UserGroupRow[]>();

  if (error) {
    throw error;
  }

  return data
    .map((row) => row.user)
    .filter((user): user is UserRow => Boolean(user))
    .map(mapUserRow)
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function addUsersToGroup(groupId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const rows: UserGroupWrite[] = userIds.map((userId) => ({
    group_id: groupId,
    user_id: userId,
  }));

  const { error } = await supabase
    .from('user_groups')
    .upsert(rows, { onConflict: 'group_id,user_id', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

export async function removeUsersFromGroup(groupId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('group_id', groupId)
    .in('user_id', userIds);

  if (error) {
    throw error;
  }
}

function getUserSortName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}
