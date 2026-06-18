import { getSportGameManagementPath } from '@/constants/routes';
import { supabaseFetch } from '@/server/supabase';
import { JoinGuestInput } from '@/features/sports/server/sportRepository/types';
import {
  cleanString,
  isSportGameExpired,
  toNullableString,
} from '@/features/sports/server/sportRepository/utils';
import {
  fetchAccountMember,
  fetchGameById,
  updateGameHost,
} from '@/features/sports/server/sportRepository/data';
import {
  assertNotExpiredOrDeleted,
  getActiveAccountMemberOrThrow,
  isOrganizer,
  requireGameAndMembers,
} from '@/features/sports/server/sportRepository/costSupport';

export async function leaveSportGame(gameId: string, actorUserId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);

  assertNotExpiredOrDeleted(game);

  if (actor.role === 'host') {
    throw new Error('Host cần chuyển quyền hoặc xóa kèo trước khi rời.');
  }

  const { response } = await supabaseFetch(`/rest/v1/sport_game_members?id=eq.${actor.id}`, {
    method: 'PATCH',
    body: {
      role: 'participant',
      status: 'left',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể rời kèo.');
  }
}

export async function kickSportMember(gameId: string, actorUserId: string, targetMemberId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);
  const target = members.find((member) => member.id === targetMemberId);

  if (!target) {
    throw new Error('Không tìm thấy người tham gia.');
  }

  if (!isOrganizer(actor)) {
    throw new Error('Chỉ host hoặc co-host có thể xóa người tham gia.');
  }

  assertNotExpiredOrDeleted(game);

  if (target.id === actor.id) {
    throw new Error('Không thể tự kick chính mình.');
  }

  if (target.role === 'host') {
    if (actor.role !== 'co_host') {
      throw new Error('Host không thể kick chính host.');
    }

    await updateGameHost(gameId, actorUserId);

    const { response: actorResponse } = await supabaseFetch(
      `/rest/v1/sport_game_members?id=eq.${actor.id}`,
      {
        method: 'PATCH',
        body: {
          role: 'host',
          status: 'active',
        },
      },
    );

    if (!actorResponse.ok) {
      throw new Error('Không thể chuyển host cho co-host.');
    }
  }

  const { response } = await supabaseFetch(`/rest/v1/sport_game_members?id=eq.${target.id}`, {
    method: 'PATCH',
    body: {
      role: 'participant',
      status: 'kicked',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể kick người tham gia.');
  }
}

export async function promoteSportMember(
  gameId: string,
  actorUserId: string,
  targetMemberId: string,
) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);
  const target = members.find((member) => member.id === targetMemberId);

  if (actor.role !== 'host') {
    throw new Error('Chỉ host có thể promote co-host.');
  }

  assertNotExpiredOrDeleted(game);

  if (!target || !target.user_id || target.status !== 'active') {
    throw new Error('Chỉ active account participant có thể được promote.');
  }

  const { response } = await supabaseFetch(`/rest/v1/sport_game_members?id=eq.${target.id}`, {
    method: 'PATCH',
    body: {
      role: 'co_host',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể promote co-host.');
  }
}

export async function demoteSportMember(
  gameId: string,
  actorUserId: string,
  targetMemberId: string,
) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);
  const target = members.find((member) => member.id === targetMemberId);

  if (actor.role !== 'host') {
    throw new Error('Chỉ host có thể demote co-host.');
  }

  assertNotExpiredOrDeleted(game);

  if (!target || target.role !== 'co_host') {
    throw new Error('Chỉ co-host có thể bị demote.');
  }

  const { response } = await supabaseFetch(`/rest/v1/sport_game_members?id=eq.${target.id}`, {
    method: 'PATCH',
    body: {
      role: 'participant',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể demote co-host.');
  }
}

export async function transferSportOwnership(
  gameId: string,
  actorUserId: string,
  targetMemberId: string,
) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = getActiveAccountMemberOrThrow(members, actorUserId);
  const target = members.find((member) => member.id === targetMemberId);

  if (actor.role !== 'host') {
    throw new Error('Chỉ host có thể chuyển quyền sở hữu.');
  }

  assertNotExpiredOrDeleted(game);

  if (!target || !target.user_id || target.status !== 'active') {
    throw new Error('Chỉ active account participant/co-host có thể nhận quyền host.');
  }

  if (target.id === actor.id) {
    return;
  }

  await updateGameHost(gameId, target.user_id);

  const { response: actorResponse } = await supabaseFetch(
    `/rest/v1/sport_game_members?id=eq.${actor.id}`,
    {
      method: 'PATCH',
      body: {
        role: 'participant',
        status: 'active',
      },
    },
  );
  const { response: targetResponse } = await supabaseFetch(
    `/rest/v1/sport_game_members?id=eq.${target.id}`,
    {
      method: 'PATCH',
      body: {
        role: 'host',
        status: 'active',
      },
    },
  );

  if (!actorResponse.ok || !targetResponse.ok) {
    throw new Error('Không thể chuyển quyền sở hữu.');
  }
}

export async function joinSportGameAsAccount(gameId: string, userId: string) {
  const game = await fetchGameById(gameId);

  if (!game || game.deleted_at) {
    throw new Error('Kèo không tồn tại hoặc đã bị xóa.');
  }

  if (isSportGameExpired(game)) {
    throw new Error('Kèo đã kết thúc, không thể tham gia.');
  }

  const existingMember = await fetchAccountMember(gameId, userId);

  if (existingMember?.status === 'active') {
    return { gameId, managementPath: getSportGameManagementPath(gameId) };
  }

  if (existingMember) {
    const { response } = await supabaseFetch(
      `/rest/v1/sport_game_members?id=eq.${existingMember.id}`,
      {
        method: 'PATCH',
        body: {
          role: 'participant',
          status: 'active',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Không thể tham gia lại kèo.');
    }

    return { gameId, managementPath: getSportGameManagementPath(gameId) };
  }

  const { response } = await supabaseFetch('/rest/v1/sport_game_members', {
    method: 'POST',
    body: {
      game_id: gameId,
      user_id: userId,
      role: 'participant',
      status: 'active',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể tham gia kèo.');
  }

  return { gameId, managementPath: getSportGameManagementPath(gameId) };
}

export async function joinSportGameAsGuest(input: JoinGuestInput) {
  const game = await fetchGameById(input.gameId);
  const guestName = cleanString(input.guestName);

  if (!guestName) {
    throw new Error('Tên khách không được để trống.');
  }

  if (!game || game.deleted_at) {
    throw new Error('Kèo không tồn tại hoặc đã bị xóa.');
  }

  if (isSportGameExpired(game)) {
    throw new Error('Kèo đã kết thúc, không thể tham gia.');
  }

  const { response } = await supabaseFetch('/rest/v1/sport_game_members', {
    method: 'POST',
    body: {
      game_id: input.gameId,
      guest_name: guestName,
      guest_contact: toNullableString(input.guestContact),
      role: 'participant',
      status: 'active',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể thêm khách tham gia kèo.');
  }

  return { gameId: input.gameId };
}
