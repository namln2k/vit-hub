import { supabase } from '@/lib/supabase/client';
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

export interface Division {
  id: string;
  name: string;
  description: string;
  archivedAt: string | null;
}

interface DivisionRow {
  id: string | number;
  name: string;
  description?: string | null;
  archived_at?: string | null;
}

interface UserDivisionRow {
  user: LegacyUserRow | null;
}

function mapDivisionRow(row: DivisionRow): Division {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
    archivedAt: row.archived_at ?? null,
  };
}

export async function listDivisions(): Promise<Division[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, description, archived_at')
    .order('name', { ascending: true })
    .returns<DivisionRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapDivisionRow);
}

export async function listUsersByDivision(divisionId: string): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from('user_divisions')
    .select(
      'user:user!user_divisions_user_id_fkey(id, email, first_name, last_name, middle_name, nickname, username, phone_number, school_name, enter_year, cohort, gender, avatar_url, avatar_key, role)',
    )
    .eq('division_id', divisionId)
    .returns<UserDivisionRow[]>();

  if (error) {
    throw error;
  }

  return data
    .map((row) => row.user)
    .filter((user): user is LegacyUserRow => Boolean(user))
    .map(mapLegacyUserRow)
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function listDivisionMembers(divisionId: string): Promise<OrganizationMember[]> {
  return listScopeMembers('division', divisionId);
}

export async function listDivisionMembersWithCapabilities(
  divisionId: string,
): Promise<{ members: OrganizationMember[]; capabilities: ScopeMemberCapabilities }> {
  return listScopeMembersWithCapabilities('division', divisionId);
}

export async function addUsersToDivision(
  divisionId: string,
  userIds: string[],
  startsAt?: string,
): Promise<void> {
  return addScopeMembers('division', divisionId, userIds, startsAt);
}

export async function removeUsersFromDivision(
  divisionId: string,
  userIds: string[],
  endedAt?: string,
): Promise<void> {
  return removeScopeMembers('division', divisionId, userIds, endedAt);
}

export async function revokeUsersFromDivision(
  divisionId: string,
  userIds: string[],
): Promise<void> {
  return revokeScopeMembers('division', divisionId, userIds);
}

export async function archiveDivision(divisionId: string, archivedAt: string): Promise<void> {
  return archiveOrganizationScope('division', divisionId, archivedAt);
}

function getUserSortName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}
