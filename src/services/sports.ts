import { API_ROUTES } from '@/constants/routes';
import { supabase } from '@/services/supabase';
import type {
  SportCostManagement,
  SportGameSummary,
  SportManagementGame,
  SportPaymentStatus,
  SportType,
} from '@/features/sports/types';

export interface CreateSportGameData {
  type: SportType;
  name: string;
  gameDate: string;
  gameTime: string;
  locationName: string;
  locationUrl: string;
  costSharingEnabled: boolean;
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập để dùng tính năng host kèo.');
  }

  return session.access_token;
}

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : fallbackMessage);
  }

  return result as T;
}

export async function listMySportGames() {
  const accessToken = await getAccessToken();
  const response = await fetch(API_ROUTES.sportsGames, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const result = await readApiJson<{ games: SportGameSummary[] }>(
    response,
    'Không thể tải danh sách kèo.',
  );

  return result.games;
}

export async function createSportGame(data: CreateSportGameData) {
  const accessToken = await getAccessToken();
  const response = await fetch(API_ROUTES.sportsGames, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return readApiJson<{ id: string; managementPath: string; publicPath: string }>(
    response,
    'Không thể tạo kèo.',
  );
}

export async function joinSportGame(gameId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_ROUTES.sportsGames}/${gameId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return readApiJson<{ gameId: string; managementPath: string }>(
    response,
    'Không thể tham gia kèo.',
  );
}

export async function joinSportGameAsGuest(
  gameId: string,
  guestName: string,
  guestContact: string,
) {
  const response = await fetch(`${API_ROUTES.sportsGames}/${gameId}/guests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guestName, guestContact }),
  });

  return readApiJson<{ gameId: string }>(response, 'Không thể thêm khách tham gia.');
}

async function fetchWithAuth(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken();

  return fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
}

export async function getSportManagementGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}`);
  const result = await readApiJson<{ game: SportManagementGame }>(response, 'Không thể tải kèo.');

  return result.game;
}

export async function updateSportGame(gameId: string, data: CreateSportGameData) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật kèo.');
}

export async function softDeleteSportGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}`, {
    method: 'DELETE',
  });

  return readApiJson<{ ok: true }>(response, 'Không thể xóa kèo.');
}

export async function restoreSportGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}/restore`, {
    method: 'POST',
  });

  return readApiJson<{ ok: true }>(response, 'Không thể khôi phục kèo.');
}

export async function leaveSportGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}/leave`, {
    method: 'POST',
  });

  return readApiJson<{ ok: true }>(response, 'Không thể rời kèo.');
}

export async function runSportMemberAction(
  gameId: string,
  memberId: string,
  action: 'kick' | 'promote' | 'demote' | 'transfer',
) {
  const response = await fetchWithAuth(
    `${API_ROUTES.sportsGames}/${gameId}/members/${memberId}/${action}`,
    {
      method: 'POST',
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật thành viên.');
}

export async function getSportCostManagement(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}/costs`);
  const result = await readApiJson<{ costs: SportCostManagement }>(
    response,
    'Không thể tải chia chi phí.',
  );

  return result.costs;
}

export async function createSportCostItem(gameId: string, data: { label: string; amount: number }) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}/cost-items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return readApiJson<{ ok: true }>(response, 'Không thể thêm chi phí.');
}

export async function updateSportCostItem(
  gameId: string,
  costItemId: string,
  data: { label: string; amount: number },
) {
  const response = await fetchWithAuth(
    `${API_ROUTES.sportsGames}/${gameId}/cost-items/${costItemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật chi phí.');
}

export async function deleteSportCostItem(gameId: string, costItemId: string) {
  const response = await fetchWithAuth(
    `${API_ROUTES.sportsGames}/${gameId}/cost-items/${costItemId}`,
    {
      method: 'DELETE',
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể xóa chi phí.');
}

export async function updateSportPayment(
  gameId: string,
  memberId: string,
  data: {
    amountOverride: number | null;
    paymentStatus: SportPaymentStatus;
    paymentNote: string;
  },
) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}/payments/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật thanh toán.');
}

export async function resetSportPayment(gameId: string, memberId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.sportsGames}/${gameId}/payments/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ reset: true }),
  });

  return readApiJson<{ ok: true }>(response, 'Không thể reset thanh toán.');
}
