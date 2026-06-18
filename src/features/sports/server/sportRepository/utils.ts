import type { SportGameBucket, SportGameSummary, SportParticipant } from '@/features/sports/types';
import {
  SportGameRow,
  SportMemberRow,
  UserNameRow,
} from '@/features/sports/server/sportRepository/types';

export const VIETNAM_OFFSET = '+07:00';
export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function toNullableString(value: unknown) {
  const cleanValue = cleanString(value);
  return cleanValue || null;
}

export function getTodayDateInVietnam() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
}

export function normalizeGameDate(value: string | undefined) {
  return value?.trim() || getTodayDateInVietnam();
}

export function encodeIn(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(',')})`;
}

export function getUserDisplayName(user: UserNameRow | null | undefined) {
  if (!user) {
    return 'Không rõ';
  }

  const fullName = [user.last_name, user.middle_name, user.first_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

  return user.nickname?.trim() || fullName || user.username?.trim() || user.email || 'Không rõ';
}

export function getSportGameExpiry(gameDate: string, gameTime: string | null) {
  const time = gameTime ? gameTime.slice(0, 8) : '23:59:59';
  return new Date(`${gameDate}T${time}${VIETNAM_OFFSET}`);
}

export function isSportGameExpired(game: Pick<SportGameRow, 'game_date' | 'game_time'>) {
  return Date.now() >= getSportGameExpiry(game.game_date, game.game_time).getTime();
}

export function getGameBucket(game: SportGameRow): SportGameBucket {
  if (game.deleted_at) {
    return 'deleted';
  }

  return isSportGameExpired(game) ? 'finished' : 'upcoming';
}

export function mapParticipant(row: SportMemberRow, usersById: Map<string, UserNameRow>) {
  const isGuest = !row.user_id;
  const user = row.user_id ? usersById.get(row.user_id) : null;

  return {
    id: row.id,
    role: row.role,
    status: row.status,
    name: isGuest ? (row.guest_name ?? 'Khách') : getUserDisplayName(user),
    isGuest,
    userId: row.user_id,
    guestContact: row.guest_contact ?? '',
  } satisfies SportParticipant;
}

export function mapSummary(
  game: SportGameRow,
  usersById: Map<string, UserNameRow>,
  membersByGameId: Map<string, SportMemberRow[]>,
) {
  const participants = membersByGameId.get(game.id) ?? [];

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
    bucket: getGameBucket(game),
    activeParticipantCount: participants.filter((member) => member.status === 'active').length,
  } satisfies SportGameSummary;
}
