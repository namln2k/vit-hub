import { getPublicSportGamePath } from '@/constants/routes';
import { supabaseFetch } from '@/server/supabase';
import type { SportManagementGame, PublicSportGame } from '@/features/sports/types';
import { SportGameRow, SportMemberRow } from '@/features/sports/server/sportRepository/types';
import {
  encodeIn,
  getUserDisplayName,
  isSportGameExpired,
  mapParticipant,
  mapSummary,
} from '@/features/sports/server/sportRepository/utils';
import {
  fetchGameById,
  fetchMembersByGameIds,
  fetchUsersByIds,
} from '@/features/sports/server/sportRepository/data';
import {
  getManagementPermissions,
  requireGameAndMembers,
} from '@/features/sports/server/sportRepository/costSupport';

export async function getPublicSportGame(gameId: string) {
  const game = await fetchGameById(gameId);

  if (!game || game.deleted_at) {
    return null;
  }

  const members = await fetchMembersByGameIds([game.id]);
  const activeMembers = members.filter((member) => member.status === 'active');
  const userIds = [game.host_user_id, ...activeMembers.flatMap((member) => member.user_id ?? [])];
  const usersById = await fetchUsersByIds(userIds);

  return {
    id: game.id,
    type: game.type,
    name: game.name,
    hostName: getUserDisplayName(usersById.get(game.host_user_id)),
    gameDate: game.game_date,
    gameTime: game.game_time ?? '',
    locationName: game.location_name ?? '',
    locationUrl: game.location_url ?? '',
    sharePath: getPublicSportGamePath(game.id),
    deletedAt: game.deleted_at ?? '',
    isExpired: isSportGameExpired(game),
    participants: activeMembers.map((member) => mapParticipant(member, usersById)),
  } satisfies PublicSportGame;
}

export async function getSportManagementGame(gameId: string, actorUserId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = members.find((member) => member.user_id === actorUserId) ?? null;

  if (!actor) {
    throw new Error('Bạn không có quyền xem trang quản lý kèo này.');
  }

  const userIds = [game.host_user_id, ...members.flatMap((member) => member.user_id ?? [])];
  const usersById = await fetchUsersByIds(userIds);
  const participants = members.map((member) => mapParticipant(member, usersById));
  const permissions = getManagementPermissions(game, actor);

  return {
    id: game.id,
    type: game.type,
    name: game.name,
    hostUserId: game.host_user_id,
    hostName: getUserDisplayName(usersById.get(game.host_user_id)),
    gameDate: game.game_date,
    gameTime: game.game_time ?? '',
    locationName: game.location_name ?? '',
    locationUrl: game.location_url ?? '',
    deletedAt: game.deleted_at ?? '',
    isExpired: isSportGameExpired(game),
    currentUserMemberId: actor.id,
    currentUserRole: actor.role,
    currentUserStatus: actor.status,
    permissions,
    participants,
  } satisfies SportManagementGame;
}

export async function listSportGamesForUser(userId: string) {
  const memberQuery = new URLSearchParams({
    select: 'game_id',
    user_id: `eq.${userId}`,
  });
  const { response: memberResponse, data: memberData } = await supabaseFetch<
    Array<{ game_id: string }>
  >(`/rest/v1/sport_game_members?${memberQuery.toString()}`);

  if (!memberResponse.ok || !Array.isArray(memberData)) {
    throw new Error('Không thể tải danh sách kèo.');
  }

  const gameIds = [...new Set(memberData.map((row) => row.game_id))];

  if (gameIds.length === 0) {
    return [];
  }

  const gameQuery = new URLSearchParams({
    select:
      'id, type, name, host_user_id, game_date, game_time, location_name, location_url, deleted_at, created_at',
    id: `in.${encodeIn(gameIds)}`,
    order: 'game_date.desc,game_time.desc.nullslast,created_at.desc',
  });
  const { response: gameResponse, data: gameData } = await supabaseFetch<SportGameRow[]>(
    `/rest/v1/sport_games?${gameQuery.toString()}`,
  );

  if (!gameResponse.ok || !Array.isArray(gameData)) {
    throw new Error('Không thể tải danh sách kèo.');
  }

  const members = await fetchMembersByGameIds(gameIds);
  const membersByGameId = new Map<string, SportMemberRow[]>();

  for (const member of members) {
    membersByGameId.set(member.game_id, [...(membersByGameId.get(member.game_id) ?? []), member]);
  }

  const usersById = await fetchUsersByIds([
    ...gameData.map((game) => game.host_user_id),
    ...members.flatMap((member) => member.user_id ?? []),
  ]);

  return gameData.map((game) => mapSummary(game, usersById, membersByGameId));
}
