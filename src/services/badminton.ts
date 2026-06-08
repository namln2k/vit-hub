import { API_ROUTES } from '@/constants/routes';
import { supabase } from '@/services/supabase';
import type {
  BadmintonCostManagement,
  BadmintonGameSummary,
  BadmintonManagementGame,
  BadmintonPaymentStatus,
} from '@/features/badminton/types';

export interface CreateBadmintonGameData {
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
    throw new Error('Bạn cần đăng nhập để dùng tính năng cầu lông.');
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

export async function listMyBadmintonGames() {
  const accessToken = await getAccessToken();
  const response = await fetch(API_ROUTES.badmintonGames, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const result = await readApiJson<{ games: BadmintonGameSummary[] }>(
    response,
    'Không thể tải danh sách kèo cầu lông.',
  );

  return result.games;
}

export async function createBadmintonGame(data: CreateBadmintonGameData) {
  const accessToken = await getAccessToken();
  const response = await fetch(API_ROUTES.badmintonGames, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return readApiJson<{ id: string; managementPath: string; publicPath: string }>(
    response,
    'Không thể tạo kèo cầu lông.',
  );
}

export async function joinBadmintonGame(gameId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_ROUTES.badmintonGames}/${gameId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return readApiJson<{ gameId: string; managementPath: string }>(
    response,
    'Không thể tham gia kèo cầu lông.',
  );
}

export async function joinBadmintonGameAsGuest(
  gameId: string,
  guestName: string,
  guestContact: string,
) {
  const response = await fetch(`${API_ROUTES.badmintonGames}/${gameId}/guests`, {
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

export async function getBadmintonManagementGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}`);
  const result = await readApiJson<{ game: BadmintonManagementGame }>(
    response,
    'Không thể tải kèo cầu lông.',
  );

  return result.game;
}

export async function updateBadmintonGame(
  gameId: string,
  data: CreateBadmintonGameData,
) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật kèo cầu lông.');
}

export async function softDeleteBadmintonGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}`, {
    method: 'DELETE',
  });

  return readApiJson<{ ok: true }>(response, 'Không thể xóa kèo cầu lông.');
}

export async function restoreBadmintonGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}/restore`, {
    method: 'POST',
  });

  return readApiJson<{ ok: true }>(response, 'Không thể khôi phục kèo cầu lông.');
}

export async function leaveBadmintonGame(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}/leave`, {
    method: 'POST',
  });

  return readApiJson<{ ok: true }>(response, 'Không thể rời kèo cầu lông.');
}

export async function runBadmintonMemberAction(
  gameId: string,
  memberId: string,
  action: 'kick' | 'promote' | 'demote' | 'transfer',
) {
  const response = await fetchWithAuth(
    `${API_ROUTES.badmintonGames}/${gameId}/members/${memberId}/${action}`,
    {
      method: 'POST',
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật thành viên.');
}

export async function getBadmintonCostManagement(gameId: string) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}/costs`);
  const result = await readApiJson<{ costs: BadmintonCostManagement }>(
    response,
    'Không thể tải chia chi phí.',
  );

  return result.costs;
}

export async function createBadmintonCostItem(
  gameId: string,
  data: { label: string; amount: number },
) {
  const response = await fetchWithAuth(`${API_ROUTES.badmintonGames}/${gameId}/cost-items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return readApiJson<{ ok: true }>(response, 'Không thể thêm chi phí.');
}

export async function updateBadmintonCostItem(
  gameId: string,
  costItemId: string,
  data: { label: string; amount: number },
) {
  const response = await fetchWithAuth(
    `${API_ROUTES.badmintonGames}/${gameId}/cost-items/${costItemId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật chi phí.');
}

export async function deleteBadmintonCostItem(gameId: string, costItemId: string) {
  const response = await fetchWithAuth(
    `${API_ROUTES.badmintonGames}/${gameId}/cost-items/${costItemId}`,
    {
      method: 'DELETE',
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể xóa chi phí.');
}

export async function updateBadmintonPayment(
  gameId: string,
  memberId: string,
  data: {
    amountOverride: number | null;
    paymentStatus: BadmintonPaymentStatus;
    paymentNote: string;
  },
) {
  const response = await fetchWithAuth(
    `${API_ROUTES.badmintonGames}/${gameId}/payments/${memberId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể cập nhật thanh toán.');
}

export async function resetBadmintonPayment(gameId: string, memberId: string) {
  const response = await fetchWithAuth(
    `${API_ROUTES.badmintonGames}/${gameId}/payments/${memberId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reset: true }),
    },
  );

  return readApiJson<{ ok: true }>(response, 'Không thể reset thanh toán.');
}
