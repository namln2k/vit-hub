import { getSportGameManagementPath, getPublicSportGamePath } from '@/constants/routes';
import { supabaseFetch } from '@/server/supabase';
import type {
  SportType,
  SportGameBucket,
  SportGameSummary,
  SportCostItem,
  SportCostManagement,
  SportManagementGame,
  SportManagementPermissions,
  SportMemberRole,
  SportMemberStatus,
  SportPayment,
  SportPaymentStatus,
  SportParticipant,
  PublicSportGame,
} from '@/features/sports/types';
import { getSportTypeLabel } from '@/features/sports/sportTypes';

const VIETNAM_OFFSET = '+07:00';
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

interface SportGameRow {
  id: string;
  type: SportType;
  name: string;
  host_user_id: string;
  game_date: string;
  game_time: string | null;
  location_name: string | null;
  location_url: string | null;
  deleted_at: string | null;
  created_at: string;
}

interface SportMemberRow {
  id: string;
  game_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_contact: string | null;
  role: SportMemberRole;
  status: SportMemberStatus;
}

interface SportCostItemRow {
  id: string;
  game_id: string;
  label: string;
  amount: string | number;
  created_by: string;
  updated_by: string;
  updated_at: string;
}

interface SportPaymentRow {
  id: string;
  game_id: string;
  member_id: string;
  amount_override: string | number | null;
  payment_status: SportPaymentStatus;
  payment_note: string | null;
  updated_by: string;
  updated_at: string;
}

interface UserNameRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  nickname: string | null;
  username: string | null;
  email: string | null;
}

interface CreateSportGameInput {
  hostUserId: string;
  type: SportType;
  name?: string;
  gameDate?: string;
  gameTime?: string;
  locationName?: string;
  locationUrl?: string;
}

interface JoinGuestInput {
  gameId: string;
  guestName: string;
  guestContact?: string;
}

interface UpdateGameInput {
  actorUserId: string;
  gameId: string;
  type: SportType;
  name: string;
  gameDate?: string;
  gameTime?: string;
  locationName?: string;
  locationUrl?: string;
}

interface UpsertCostItemInput {
  actorUserId: string;
  gameId: string;
  costItemId?: string;
  label: string;
  amount: number;
}

interface UpdatePaymentInput {
  actorUserId: string;
  gameId: string;
  memberId: string;
  amountOverride: number | null;
  paymentStatus: SportPaymentStatus;
  paymentNote?: string;
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNullableString(value: unknown) {
  const cleanValue = cleanString(value);
  return cleanValue || null;
}

function getTodayDateInVietnam() {
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

function normalizeGameDate(value: string | undefined) {
  return value?.trim() || getTodayDateInVietnam();
}

function encodeIn(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(',')})`;
}

function getUserDisplayName(user: UserNameRow | null | undefined) {
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

function getGameBucket(game: SportGameRow): SportGameBucket {
  if (game.deleted_at) {
    return 'deleted';
  }

  return isSportGameExpired(game) ? 'finished' : 'upcoming';
}

function mapParticipant(row: SportMemberRow, usersById: Map<string, UserNameRow>) {
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

function mapSummary(
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

async function fetchUsersByIds(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

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

async function fetchGameById(gameId: string) {
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

async function updateGameHost(gameId: string, hostUserId: string) {
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

async function fetchMembersByGameIds(gameIds: string[]) {
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

async function fetchAccountMember(gameId: string, userId: string) {
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

async function fetchCostItems(gameId: string) {
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

async function fetchPayments(gameId: string) {
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

async function fetchPaymentByMemberId(memberId: string) {
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

function mapCostItem(row: SportCostItemRow, usersById: Map<string, UserNameRow>) {
  return {
    id: row.id,
    label: row.label,
    amount: toNumber(row.amount),
    createdBy: row.created_by,
    createdByName: getUserDisplayName(usersById.get(row.created_by)),
    updatedBy: row.updated_by,
    updatedByName: getUserDisplayName(usersById.get(row.updated_by)),
    updatedAt: row.updated_at,
  } satisfies SportCostItem;
}

function mapPayment(
  member: SportMemberRow,
  payment: SportPaymentRow | undefined,
  baseAmountDue: number,
  participant: SportParticipant,
  usersById: Map<string, UserNameRow>,
) {
  const amountOverride =
    payment?.amount_override === null || payment?.amount_override === undefined
      ? null
      : toNumber(payment.amount_override);

  return {
    memberId: member.id,
    participantName: participant.name,
    participantRole: member.role,
    isGuest: participant.isGuest,
    amountDue: baseAmountDue,
    amountOverride,
    effectiveAmountDue: amountOverride ?? baseAmountDue,
    paymentStatus: payment?.payment_status ?? 'unpaid',
    paymentNote: payment?.payment_note ?? '',
    updatedBy: payment?.updated_by ?? '',
    updatedByName: payment ? getUserDisplayName(usersById.get(payment.updated_by)) : '',
    updatedAt: payment?.updated_at ?? '',
  } satisfies SportPayment;
}

function getActiveAccountMemberOrThrow(members: SportMemberRow[], userId: string) {
  const actor = members.find((member) => member.user_id === userId);

  if (!actor || actor.status !== 'active') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }

  return actor;
}

function isOrganizer(member: SportMemberRow | null | undefined) {
  return member?.status === 'active' && (member.role === 'host' || member.role === 'co_host');
}

function isActiveAccountParticipant(member: SportMemberRow | null | undefined) {
  return Boolean(member?.user_id) && member?.status === 'active';
}

function assertCanManageCosts(game: SportGameRow, actor: SportMemberRow | null) {
  if (game.deleted_at) {
    throw new Error('Kèo đã bị xóa.');
  }

  if (!isActiveAccountParticipant(actor)) {
    throw new Error('Bạn không có quyền xem hoặc sửa chi phí của kèo này.');
  }
}

function assertNotExpiredOrDeleted(game: SportGameRow) {
  if (game.deleted_at) {
    throw new Error('Kèo đã bị xóa.');
  }

  if (isSportGameExpired(game)) {
    throw new Error('Kèo đã kết thúc, không thể chỉnh sửa thông tin hoặc thành viên.');
  }
}

async function requireGameAndMembers(gameId: string) {
  const game = await fetchGameById(gameId);

  if (!game) {
    throw new Error('Kèo không tồn tại.');
  }

  const members = await fetchMembersByGameIds([gameId]);

  return { game, members };
}

function getManagementPermissions(
  game: SportGameRow,
  actor: SportMemberRow | null,
): SportManagementPermissions {
  const isActiveActor = actor?.status === 'active';
  const actorIsOrganizer = isOrganizer(actor);
  const actorIsHost = isActiveActor && actor?.role === 'host';
  const isExpired = isSportGameExpired(game);
  const isDeleted = Boolean(game.deleted_at);

  return {
    canViewProtectedDetail: Boolean(actor),
    canManageGameDetails: actorIsOrganizer && !isExpired && !isDeleted,
    canManageMembership: actorIsOrganizer && !isExpired && !isDeleted,
    canPromote: actorIsHost && !isExpired && !isDeleted,
    canTransferOwnership: actorIsHost && !isExpired && !isDeleted,
    canRestore: actorIsOrganizer && isDeleted && !isExpired,
    canManageCosts: Boolean(isActiveActor) && !isDeleted,
  };
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function assertValidCostAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Số tiền chi phí không hợp lệ.');
  }
}

function assertValidPaymentInput(input: UpdatePaymentInput) {
  if (!['unpaid', 'paid'].includes(input.paymentStatus)) {
    throw new Error('Trạng thái thanh toán không hợp lệ.');
  }

  if (
    input.amountOverride !== null &&
    (!Number.isFinite(input.amountOverride) || input.amountOverride < 0)
  ) {
    throw new Error('Số tiền override không hợp lệ.');
  }

  if (input.amountOverride !== null && !cleanString(input.paymentNote)) {
    throw new Error('Ghi chú là bắt buộc khi có override số tiền.');
  }
}

async function fetchExistingGameNames(baseName: string) {
  const pattern = `${baseName}%`;
  const query = new URLSearchParams({
    select: 'name',
    deleted_at: 'is.null',
    name: `ilike.${pattern}`,
  });
  const { response, data } = await supabaseFetch<Array<{ name: string }>>(
    `/rest/v1/sport_games?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể kiểm tra tên kèo.');
  }

  return new Set(data.map((row) => row.name));
}

async function generateGameName(input: CreateSportGameInput, hostName: string) {
  const explicitName = cleanString(input.name);

  if (explicitName) {
    return explicitName;
  }

  const parts = [
    getSportTypeLabel(input.type),
    input.locationName,
    input.gameDate,
    input.gameTime,
    hostName,
  ]
    .map(cleanString)
    .filter(Boolean);
  const baseName = parts.join(' | ');
  const existingNames = await fetchExistingGameNames(baseName);

  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  let candidate = `${baseName}_${index}`;

  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName}_${index}`;
  }

  return candidate;
}

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

export async function getSportCostManagement(gameId: string, actorUserId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = members.find((member) => member.user_id === actorUserId) ?? null;

  assertCanManageCosts(game, actor);

  const activeMembers = members.filter((member) => member.status === 'active');
  const costItems = await fetchCostItems(gameId);
  const payments = await fetchPayments(gameId);
  const userIds = [
    game.host_user_id,
    ...activeMembers.flatMap((member) => member.user_id ?? []),
    ...costItems.flatMap((item) => [item.created_by, item.updated_by]),
    ...payments.flatMap((payment) => payment.updated_by),
  ];
  const usersById = await fetchUsersByIds(userIds);
  const participantsByMemberId = new Map(
    activeMembers.map((member) => [member.id, mapParticipant(member, usersById)]),
  );
  const totalCost = roundMoney(costItems.reduce((total, item) => total + toNumber(item.amount), 0));
  const baseAmountDue = activeMembers.length > 0 ? roundMoney(totalCost / activeMembers.length) : 0;
  const paymentsByMemberId = new Map(payments.map((payment) => [payment.member_id, payment]));

  return {
    gameId,
    totalCost,
    splitParticipantCount: activeMembers.length,
    baseAmountDue,
    costItems: costItems.map((item) => mapCostItem(item, usersById)),
    payments: activeMembers.map((member) =>
      mapPayment(
        member,
        paymentsByMemberId.get(member.id),
        baseAmountDue,
        participantsByMemberId.get(member.id) ?? mapParticipant(member, usersById),
        usersById,
      ),
    ),
  } satisfies SportCostManagement;
}

export async function createSportCostItem(input: UpsertCostItemInput) {
  const { game, members } = await requireGameAndMembers(input.gameId);
  const actor = members.find((member) => member.user_id === input.actorUserId) ?? null;
  const label = cleanString(input.label);

  assertCanManageCosts(game, actor);
  assertValidCostAmount(input.amount);

  const { response } = await supabaseFetch('/rest/v1/sport_game_cost_items', {
    method: 'POST',
    body: {
      game_id: input.gameId,
      label,
      amount: input.amount,
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
    },
  });

  if (!response.ok) {
    throw new Error('Không thể thêm chi phí.');
  }
}

export async function updateSportCostItem(input: UpsertCostItemInput) {
  const { game, members } = await requireGameAndMembers(input.gameId);
  const actor = members.find((member) => member.user_id === input.actorUserId) ?? null;
  const label = cleanString(input.label);

  assertCanManageCosts(game, actor);
  assertValidCostAmount(input.amount);

  if (!input.costItemId) {
    throw new Error('Thiếu chi phí cần cập nhật.');
  }

  const { response } = await supabaseFetch(
    `/rest/v1/sport_game_cost_items?id=eq.${input.costItemId}&game_id=eq.${input.gameId}`,
    {
      method: 'PATCH',
      body: {
        label,
        amount: input.amount,
        updated_by: input.actorUserId,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Không thể cập nhật chi phí.');
  }
}

export async function deleteSportCostItem(gameId: string, actorUserId: string, costItemId: string) {
  const { game, members } = await requireGameAndMembers(gameId);
  const actor = members.find((member) => member.user_id === actorUserId) ?? null;

  assertCanManageCosts(game, actor);

  const { response } = await supabaseFetch(
    `/rest/v1/sport_game_cost_items?id=eq.${costItemId}&game_id=eq.${gameId}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error('Không thể xóa chi phí.');
  }
}

export async function updateSportPayment(input: UpdatePaymentInput) {
  const { game, members } = await requireGameAndMembers(input.gameId);
  const actor = members.find((member) => member.user_id === input.actorUserId) ?? null;
  const target = members.find(
    (member) => member.id === input.memberId && member.status === 'active',
  );

  assertCanManageCosts(game, actor);
  assertValidPaymentInput(input);

  if (!target) {
    throw new Error('Chỉ có thể cập nhật thanh toán cho participant đang active.');
  }

  const existingPayment = await fetchPaymentByMemberId(input.memberId);
  const body = {
    game_id: input.gameId,
    member_id: input.memberId,
    amount_override: input.amountOverride,
    payment_status: input.paymentStatus,
    payment_note: toNullableString(input.paymentNote),
    updated_by: input.actorUserId,
  };
  const { response } = existingPayment
    ? await supabaseFetch(`/rest/v1/sport_game_payments?id=eq.${existingPayment.id}`, {
        method: 'PATCH',
        body,
      })
    : await supabaseFetch('/rest/v1/sport_game_payments', {
        method: 'POST',
        body,
      });

  if (!response.ok) {
    throw new Error('Không thể cập nhật thanh toán.');
  }
}

export async function resetSportPayment(gameId: string, actorUserId: string, memberId: string) {
  await updateSportPayment({
    actorUserId,
    gameId,
    memberId,
    amountOverride: null,
    paymentStatus: 'unpaid',
    paymentNote: '',
  });
}
