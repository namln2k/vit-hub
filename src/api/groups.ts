import { supabase } from '@/api/supabase';
import { mapProfileRow, type ProfileRow } from '@/api/profiles';
import type { UserProfile } from '@/contexts/auth';

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

interface ProfileGroupRow {
  profiles: ProfileRow | null;
}

interface GroupWrite {
  name: string;
  description: string | null;
}

interface ProfileGroupWrite {
  group_id: string;
  profile_id: string;
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

export async function listProfilesByGroup(groupId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profile_groups')
    .select(
      'profiles(id, email, first_name, last_name, middle_name, username, avatar_url, avatar_key, role)',
    )
    .eq('group_id', groupId)
    .returns<ProfileGroupRow[]>();

  if (error) {
    throw error;
  }

  return data
    .map((row) => row.profiles)
    .filter((profile): profile is ProfileRow => Boolean(profile))
    .map(mapProfileRow)
    .sort((first, second) => getProfileSortName(first).localeCompare(getProfileSortName(second)));
}

export async function addProfilesToGroup(groupId: string, profileIds: string[]): Promise<void> {
  if (profileIds.length === 0) {
    return;
  }

  const rows: ProfileGroupWrite[] = profileIds.map((profileId) => ({
    group_id: groupId,
    profile_id: profileId,
  }));

  const { error } = await supabase
    .from('profile_groups')
    .upsert(rows, { onConflict: 'group_id,profile_id', ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

function getProfileSortName(profile: UserProfile) {
  return `${profile.lastName} ${profile.middleName} ${profile.firstName}`.trim();
}
