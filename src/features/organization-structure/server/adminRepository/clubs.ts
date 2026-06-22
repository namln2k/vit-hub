import { supabaseFetch } from '@/server/supabase';
import {
  ClubRow,
  ClubSummary,
} from '@/features/organization-structure/server/adminRepository/types';
import {
  countClubMembers,
  getCreatedOrUpdatedClub,
  listClubRoleSummaries,
  listDivisionsByIds,
  mapClubRow,
} from '@/features/organization-structure/server/adminRepository/helpers';
import { throwRestWriteError } from '@/features/organization-structure/server/adminRepository/errors';

export async function listClubs(): Promise<ClubSummary[]> {
  const { response, data } = await supabaseFetch<ClubRow[]>(
    '/rest/v1/clubs?select=id,division_id,name,description,archived_at,created_at,updated_at&order=name.asc',
  );

  if (!response.ok) {
    throw new Error('Không thể tải danh sách CLB/tổ.');
  }

  const clubs = Array.isArray(data) ? data : [];

  if (clubs.length === 0) {
    return [];
  }

  const [divisions, memberCounts, roleSummaries] = await Promise.all([
    listDivisionsByIds(clubs.map((club) => club.division_id)),
    countClubMembers(clubs.map((club) => club.id)),
    listClubRoleSummaries(clubs.map((club) => club.id)),
  ]);
  const divisionsById = new Map(divisions.map((division) => [division.id, division]));

  return clubs.map((club) => mapClubRow(club, divisionsById, memberCounts, roleSummaries));
}

export async function getClub(clubId: string): Promise<ClubSummary | null> {
  const query = new URLSearchParams({
    select: 'id,division_id,name,description,archived_at,created_at,updated_at',
    id: `eq.${clubId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    return null;
  }

  const [divisions, memberCounts, roleSummaries] = await Promise.all([
    listDivisionsByIds([club.division_id]),
    countClubMembers([club.id]),
    listClubRoleSummaries([club.id]),
  ]);

  return mapClubRow(
    club,
    new Map(divisions.map((division) => [division.id, division])),
    memberCounts,
    roleSummaries,
  );
}

export async function createClub({
  actorId,
  divisionId,
  name,
  description,
}: {
  actorId: string;
  divisionId: string;
  name: string;
  description: string;
}) {
  const { response, data } = await supabaseFetch<ClubRow[]>('/rest/v1/clubs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      division_id: divisionId,
      name,
      description: description || null,
      created_by: actorId,
      updated_by: actorId,
    },
  });

  if (!response.ok) {
    throwRestWriteError(data, 'Không thể tạo CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    throw new Error('Không thể tạo CLB/tổ.');
  }

  return getCreatedOrUpdatedClub(club.id);
}

export async function updateClub({
  actorId,
  clubId,
  divisionId,
  name,
  description,
}: {
  actorId: string;
  clubId: string;
  divisionId: string;
  name: string;
  description: string;
}) {
  const query = new URLSearchParams({ id: `eq.${clubId}` });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: {
      division_id: divisionId,
      name,
      description: description || null,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    },
  });

  if (!response.ok) {
    throwRestWriteError(data, 'Không thể cập nhật CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    throw new Error('Không tìm thấy CLB/tổ.');
  }

  return getCreatedOrUpdatedClub(club.id);
}
