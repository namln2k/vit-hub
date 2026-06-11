import { supabase } from '@/services/supabase';
import { mapUserRow, type UserRow } from '@/services/users';
import type { AppUser } from '@/contexts/auth';
import {
  addScopeMembers,
  listScopeMembers,
  removeScopeMembers,
  type OrganizationMember,
} from '@/services/organizationAdmin';

export interface Division {
  id: string;
  name: string;
  description: string;
}

interface DivisionRow {
  id: string | number;
  name: string;
  description?: string | null;
}

interface UserDivisionRow {
  user: UserRow | null;
}

function mapDivisionRow(row: DivisionRow): Division {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description ?? '',
  };
}

export async function listDivisions(): Promise<Division[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, description')
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
    .filter((user): user is UserRow => Boolean(user))
    .map(mapUserRow)
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function listDivisionMembers(divisionId: string): Promise<OrganizationMember[]> {
  return listScopeMembers('division', divisionId);
}

export async function addUsersToDivision(divisionId: string, userIds: string[]): Promise<void> {
  return addScopeMembers('division', divisionId, userIds);
}

export async function removeUsersFromDivision(
  divisionId: string,
  userIds: string[],
): Promise<void> {
  return removeScopeMembers('division', divisionId, userIds);
}

function getUserSortName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}
