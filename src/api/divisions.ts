import { supabase } from '@/api/supabase';
import { mapProfileRow, type ProfileRow } from '@/api/profiles';
import type { UserProfile } from '@/contexts/auth';

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

interface ProfileDivisionRow {
  profiles: ProfileRow | null;
}

interface ProfileDivisionWrite {
  division_id: string;
  profile_id: string;
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

export async function listProfilesByDivision(divisionId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profile_divisions')
    .select(
      'profiles(id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role)',
    )
    .eq('division_id', divisionId)
    .returns<ProfileDivisionRow[]>();

  if (error) {
    throw error;
  }

  return data
    .map((row) => row.profiles)
    .filter((profile): profile is ProfileRow => Boolean(profile))
    .map(mapProfileRow)
    .sort((first, second) => getProfileSortName(first).localeCompare(getProfileSortName(second)));
}

export async function addProfilesToDivision(
  divisionId: string,
  profileIds: string[],
): Promise<void> {
  if (profileIds.length === 0) {
    return;
  }

  const rows: ProfileDivisionWrite[] = profileIds.map((profileId) => ({
    division_id: divisionId,
    profile_id: profileId,
  }));

  const { error } = await supabase
    .from('profile_divisions')
    .upsert(rows, { onConflict: 'division_id,profile_id', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

function getProfileSortName(profile: UserProfile) {
  return `${profile.lastName} ${profile.middleName} ${profile.firstName}`.trim();
}
