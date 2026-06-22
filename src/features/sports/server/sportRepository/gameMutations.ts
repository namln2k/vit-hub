import { getSportGameManagementPath, getPublicSportGamePath } from '@/constants/routes';
import { supabaseFetch } from '@/server/supabase';
import {
  CreateSportGameInput,
  SportGameRow,
  UpdateGameInput,
} from '@/features/sports/server/sportRepository/types';
import {
  cleanString,
  getUserDisplayName,
  isSportGameExpired,
  normalizeGameDate,
  toNullableString,
} from '@/features/sports/server/sportRepository/utils';
import { fetchUsersByIds } from '@/features/sports/server/sportRepository/data';
import {
  assertNotExpiredOrDeleted,
  getActiveAccountMemberOrThrow,
  isOrganizer,
  requireGameAndMembers,
} from '@/features/sports/server/sportRepository/costSupport';
import { generateGameName } from '@/features/sports/server/sportRepository/naming';

export async function createSportGame(input: CreateSportGameInput) {
  const usersById = await fetchUsersByIds([input.hostUserId]);
  const hostName = getUserDisplayName(usersById.get(input.hostUserId));
  const gameDate = normalizeGameDate(input.gameDate);
  const name = await generateGameName({ ...input, gameDate }, hostName);
  const row = {
    type: input.type,
    name,
    host_user_id: input.hostUserId,
    game_date: gameDate,
    game_time: toNullableString(input.gameTime),
    location_name: toNullableString(input.locationName),
    location_url: toNullableString(input.locationUrl),
  };
  const { response, data } = await supabaseFetch<SportGameRow[]>(
    '/rest/v1/sport_games?select=id, type, name, host_user_id, game_date, game_time, location_name, location_url, deleted_at, created_at',
    {
      method: 'POST',
      body: row,
      headers: {
        Prefer: 'return=representation',
      },
    },
  );

  if (!response.ok || !Array.isArray(data) || !data[0]) {
    throw new Error('Không thể tạo kèo.');
  }

  const game = data[0];
  const { response: memberResponse } = await supabaseFetch('/rest/v1/sport_game_members', {
    method: 'POST',
    body: {
      game_id: game.id,
      user_id: input.hostUserId,
      role: 'host',
      status: 'active',
    },
  });

  if (!memberResponse.ok) {
    throw new Error('Không thể thêm host vào kèo.');
  }

  return {
    id: game.id,
    managementPath: getSportGameManagementPath(game.id),
    publicPath: getPublicSportGamePath(game.id),
  };
}

export async function updateSportGame(input: UpdateGameInput) {
  const { game, members } = await requireGameAndMembers(input.gameId);
  const actor = getActiveAccountMemberOrThrow(members, input.actorUserId);

  if (!isOrganizer(actor)) {
    throw new Error('Chỉ host hoặc co-host có thể sửa kèo.');
  }

  assertNotExpiredOrDeleted(game);

  const name = cleanString(input.name);
  const gameDate = normalizeGameDate(input.gameDate);

  if (!name) {
    throw new Error('Tên kèo không được để trống khi chỉnh sửa.');
  }

  const { response } = await supabaseFetch(`/rest/v1/sport_games?id=eq.${input.gameId}`, {
    method: 'PATCH',
    body: {
      name,
      type: input.type,
      game_date: gameDate,
      game_time: toNullableString(input.gameTime),
      location_name: toNullableString(input.locationName),
      location_url: toNullableString(input.locationUrl),
    },
  });

  if (!response.ok) {
    throw new Error('Không thể cập nhật kèo.');
  }
}

export async function softDeleteSportGame(gameId: string, actorUserId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);

  if (!isOrganizer(actor)) {
    throw new Error('Chỉ host hoặc co-host có thể xóa kèo.');
  }

  assertNotExpiredOrDeleted(game);

  const { response } = await supabaseFetch(`/rest/v1/sport_games?id=eq.${gameId}`, {
    method: 'PATCH',
    body: {
      deleted_at: new Date().toISOString(),
    },
  });

  if (!response.ok) {
    throw new Error('Không thể xóa kèo.');
  }
}

export async function restoreSportGame(gameId: string, actorUserId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);

  if (!isOrganizer(actor)) {
    throw new Error('Chỉ host hoặc co-host có thể khôi phục kèo.');
  }

  if (!game.deleted_at) {
    return;
  }

  if (isSportGameExpired(game)) {
    throw new Error('Kèo đã hết hạn, không thể khôi phục.');
  }

  const { response } = await supabaseFetch(`/rest/v1/sport_games?id=eq.${gameId}`, {
    method: 'PATCH',
    body: {
      deleted_at: null,
    },
  });

  if (!response.ok) {
    throw new Error('Không thể khôi phục kèo.');
  }
}
