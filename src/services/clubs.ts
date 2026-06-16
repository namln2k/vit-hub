import {
  addScopeMembers,
  listScopeMembers,
  listScopeMembersWithCapabilities,
  removeScopeMembers,
  revokeScopeMembers,
  type ScopeMemberCapabilities,
  type OrganizationMember,
} from '@/services/organizationAdmin';
import { supabase } from '@/services/supabase';

export interface ClubPersonSummary {
  userId: string;
  name: string;
  email: string;
}

export interface Club {
  id: string;
  divisionId: string;
  divisionName: string;
  name: string;
  description: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  leads: ClubPersonSummary[];
  deputies: ClubPersonSummary[];
}

const CLUBS_API = '/api/organization/clubs';

export async function listClubs(): Promise<Club[]> {
  const result = await apiFetch<{ clubs: Club[] }>(CLUBS_API);

  return result.clubs;
}

export async function createClub(
  divisionId: string,
  name: string,
  description: string,
): Promise<Club> {
  const result = await apiFetch<{ club: Club }>(CLUBS_API, {
    method: 'POST',
    body: { divisionId, name, description },
  });

  return result.club;
}

export async function updateClub(
  clubId: string,
  divisionId: string,
  name: string,
  description: string,
): Promise<Club> {
  const result = await apiFetch<{ club: Club }>(CLUBS_API, {
    method: 'PATCH',
    body: { id: clubId, divisionId, name, description },
  });

  return result.club;
}

export async function archiveClub(clubId: string): Promise<Club> {
  const result = await apiFetch<{ club: Club }>(CLUBS_API, {
    method: 'PATCH',
    body: { id: clubId, archived: true },
  });

  return result.club;
}

export async function listClubMembers(clubId: string): Promise<OrganizationMember[]> {
  return listScopeMembers('club', clubId);
}

export async function listClubMembersWithCapabilities(
  clubId: string,
): Promise<{ members: OrganizationMember[]; capabilities: ScopeMemberCapabilities }> {
  return listScopeMembersWithCapabilities('club', clubId);
}

export async function addUsersToClub(
  clubId: string,
  userIds: string[],
  startsAt?: string,
): Promise<void> {
  return addScopeMembers('club', clubId, userIds, startsAt);
}

export async function removeUsersFromClub(
  clubId: string,
  userIds: string[],
  endedAt?: string,
): Promise<void> {
  return removeScopeMembers('club', clubId, userIds, endedAt);
}

export async function revokeUsersFromClub(clubId: string, userIds: string[]): Promise<void> {
  return revokeScopeMembers('club', clubId, userIds);
}

async function apiFetch<T>(
  input: RequestInfo | URL,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? 'Không thể thực hiện thao tác.');
  }

  return result;
}
