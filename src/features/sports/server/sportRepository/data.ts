import { supabaseFetch } from '@/server/supabase';
import {
  SportCostItemRow,
  SportGameRow,
  SportMemberRow,
  SportPaymentRow,
  UserNameRow,
} from '@/features/sports/server/sportRepository/types';
import { encodeIn } from '@/features/sports/server/sportRepository/utils';

export async function fetchUsersByIds(userIds: Array<string | null | undefined>) {
  const uniqueUserIds = [...new Set(userIds.filter((userId): userId is string => Boolean(userId)))];

  if (uniqueUserIds.length === 0) {
    return new Map<string, UserNameRow>();
  }

  const query = new URLSearchParams({
    select: 'id, first_name, last_name, middle_name, nickname, username, email',
    id: `in.${encodeIn(uniqueUserIds)}`,
  });
  const { response, data } = await supabaseFetch<UserNameRow[]>(
    `/rest/v1/user?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể tải thông tin người dùng.');
  }

  return new Map(data.map((user) => [user.id, user]));
}

export async function fetchGameById(gameId: string) {
  const query = new URLSearchParams({
    select:
      'id, type, name, host_user_id, game_date, game_time, location_name, location_url, deleted_at, created_at',
    id: `eq.${gameId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<SportGameRow[]>(
    `/rest/v1/sport_games?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể tải thông tin kèo.');
  }

  return data[0] ?? null;
}

export async function updateGameHost(gameId: string, hostUserId: string) {
  const { response } = await supabaseFetch(`/rest/v1/sport_games?id=eq.${gameId}`, {
    method: 'PATCH',
    body: {
      host_user_id: hostUserId,
    },
  });

  if (!response.ok) {
    throw new Error('Không thể chuyển host kèo.');
  }
}

export async function fetchMembersByGameIds(gameIds: string[]) {
  if (gameIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id, game_id, user_id, guest_name, guest_contact, role, status',
    game_id: `in.${encodeIn([...new Set(gameIds)])}`,
  });
  const { response, data } = await supabaseFetch<SportMemberRow[]>(
    `/rest/v1/sport_game_members?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể tải danh sách người tham gia.');
  }

  return data;
}

export async function fetchAccountMember(gameId: string, userId: string) {
  const query = new URLSearchParams({
    select: 'id, game_id, user_id, guest_name, guest_contact, role, status',
    game_id: `eq.${gameId}`,
    user_id: `eq.${userId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<SportMemberRow[]>(
    `/rest/v1/sport_game_members?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể kiểm tra trạng thái tham gia.');
  }

  return data[0] ?? null;
}

export async function fetchCostItems(gameId: string) {
  const query = new URLSearchParams({
    select: 'id, game_id, label, amount, created_by, updated_by, updated_at',
    game_id: `eq.${gameId}`,
    order: 'created_at.asc',
  });
  const { response, data } = await supabaseFetch<SportCostItemRow[]>(
    `/rest/v1/sport_game_cost_items?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể tải danh sách chi phí.');
  }

  return data;
}

export async function fetchPayments(gameId: string) {
  const query = new URLSearchParams({
    select:
      'id, game_id, member_id, amount_override, payment_status, payment_note, updated_by, updated_at',
    game_id: `eq.${gameId}`,
  });
  const { response, data } = await supabaseFetch<SportPaymentRow[]>(
    `/rest/v1/sport_game_payments?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể tải trạng thái thanh toán.');
  }

  return data;
}

export async function fetchPaymentByMemberId(memberId: string) {
  const query = new URLSearchParams({
    select: 'id',
    member_id: `eq.${memberId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<Array<{ id: string }>>(
    `/rest/v1/sport_game_payments?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể tải trạng thái thanh toán.');
  }

  return data[0] ?? null;
}
