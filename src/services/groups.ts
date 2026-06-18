import { supabase } from '@/services/supabase';
import { mapLegacyUserRow, type LegacyUserRow } from '@/services/users/legacyMapping';
import type { AppUser } from '@/contexts/auth';
import {
  addScopeMembers,
  archiveOrganizationScope,
  listScopeMembers,
  listScopeMembersWithCapabilities,
  removeScopeMembers,
  revokeScopeMembers,
  type ScopeMemberCapabilities,
  type OrganizationMember,
} from '@/services/organizationAdmin';

export interface Group {
  id: string;
  name: string;
  description: string;
  archivedAt: string | null;
}

interface GroupRow {
  id: string | number;
  name: string;
  description?: string | null;
  archived_at?: string | null;
}

interface UserGroupRow {
  user: LegacyUserRow | null;
}

interface GroupWrite {
  name: string;
  description: string | null;
}

function mapGroupRow(row: GroupRow): Group {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    archivedAt: row.archived_at ?? null,
  };
}

export async function listGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, archived_at')
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
    .select('id, name, description, archived_at')
    .single<GroupRow>();

  if (error) {
    throw error;
  }

  return mapGroupRow(data);
}

export async function updateGroup(
  groupId: string,
  name: string,
  description: string,
): Promise<Group> {
  const row: GroupWrite = {
    name: name.trim(),
    description: description.trim() || null,
  };

  const { data, error } = await supabase
    .from('groups')
    .update(row)
    .eq('id', groupId)
    .select('id, name, description, archived_at')
    .single<GroupRow>();

  if (error) {
    throw error;
  }

  return mapGroupRow(data);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error: membershipError } = await supabase
    .from('user_groups')
    .delete()
    .eq('group_id', groupId);

  if (membershipError) {
    throw membershipError;
  }

  const { error } = await supabase.from('groups').delete().eq('id', groupId);

  if (error) {
    throw error;
  }
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
    .filter((user): user is LegacyUserRow => Boolean(user))
    .map(mapLegacyUserRow)
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function listGroupMembers(groupId: string): Promise<OrganizationMember[]> {
  return listScopeMembers('group', groupId);
}

export async function listGroupMembersWithCapabilities(
  groupId: string,
): Promise<{ members: OrganizationMember[]; capabilities: ScopeMemberCapabilities }> {
  return listScopeMembersWithCapabilities('group', groupId);
}

export async function addUsersToGroup(
  groupId: string,
  userIds: string[],
  startsAt?: string,
): Promise<void> {
  return addScopeMembers('group', groupId, userIds, startsAt);
}

export async function removeUsersFromGroup(
  groupId: string,
  userIds: string[],
  endedAt?: string,
): Promise<void> {
  return removeScopeMembers('group', groupId, userIds, endedAt);
}

export async function revokeUsersFromGroup(groupId: string, userIds: string[]): Promise<void> {
  return revokeScopeMembers('group', groupId, userIds);
}

export async function archiveGroup(groupId: string, archivedAt: string): Promise<void> {
  return archiveOrganizationScope('group', groupId, archivedAt);
}

function getUserSortName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}
