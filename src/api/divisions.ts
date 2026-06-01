import { supabase } from '@/api/supabase';
import { mapUserRow, type UserRow } from '@/api/users';
import type { AppUser } from '@/contexts/auth';

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

interface UserDivisionWrite {
  division_id: string;
  user_id: string;
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
      'user(id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role)',
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

export async function addUsersToDivision(divisionId: string, userIds: string[]): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const rows: UserDivisionWrite[] = userIds.map((userId) => ({
    division_id: divisionId,
    user_id: userId,
  }));

  const { error } = await supabase
    .from('user_divisions')
    .upsert(rows, { onConflict: 'division_id,user_id', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

function getUserSortName(user: AppUser) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}
