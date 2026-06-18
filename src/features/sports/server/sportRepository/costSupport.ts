import type {
  SportCostItem,
  SportManagementPermissions,
  SportPayment,
  SportParticipant,
} from '@/features/sports/types';
import {
  SportCostItemRow,
  SportGameRow,
  SportMemberRow,
  SportPaymentRow,
  UpdatePaymentInput,
  UserNameRow,
} from '@/features/sports/server/sportRepository/types';
import {
  cleanString,
  getUserDisplayName,
  isSportGameExpired,
} from '@/features/sports/server/sportRepository/utils';
import {
  fetchGameById,
  fetchMembersByGameIds,
} from '@/features/sports/server/sportRepository/data';

export function mapCostItem(row: SportCostItemRow, usersById: Map<string, UserNameRow>) {
  return {
    id: row.id,
    label: row.label,
    amount: toNumber(row.amount),
    createdBy: row.created_by ?? '',
    createdByName: getUserDisplayName(row.created_by ? usersById.get(row.created_by) : null),
    updatedBy: row.updated_by ?? '',
    updatedByName: getUserDisplayName(row.updated_by ? usersById.get(row.updated_by) : null),
    updatedAt: row.updated_at,
  } satisfies SportCostItem;
}

export function mapPayment(
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
    updatedByName: payment
      ? getUserDisplayName(payment.updated_by ? usersById.get(payment.updated_by) : null)
      : '',
    updatedAt: payment?.updated_at ?? '',
  } satisfies SportPayment;
}

export function getActiveAccountMemberOrThrow(members: SportMemberRow[], userId: string) {
  const actor = members.find((member) => member.user_id === userId);

  if (!actor || actor.status !== 'active') {
    throw new Error('Bạn không có quyền thực hiện thao tác này.');
  }

  return actor;
}

export function isOrganizer(member: SportMemberRow | null | undefined) {
  return member?.status === 'active' && (member.role === 'host' || member.role === 'co_host');
}

export function isActiveAccountParticipant(member: SportMemberRow | null | undefined) {
  return Boolean(member?.user_id) && member?.status === 'active';
}

export function assertCanManageCosts(game: SportGameRow, actor: SportMemberRow | null) {
  if (game.deleted_at) {
    throw new Error('Kèo đã bị xóa.');
  }

  if (!isActiveAccountParticipant(actor)) {
    throw new Error('Bạn không có quyền xem hoặc sửa chi phí của kèo này.');
  }
}

export function assertNotExpiredOrDeleted(game: SportGameRow) {
  if (game.deleted_at) {
    throw new Error('Kèo đã bị xóa.');
  }

  if (isSportGameExpired(game)) {
    throw new Error('Kèo đã kết thúc, không thể chỉnh sửa thông tin hoặc thành viên.');
  }
}

export async function requireGameAndMembers(gameId: string) {
  const game = await fetchGameById(gameId);

  if (!game) {
    throw new Error('Kèo không tồn tại.');
  }

  const members = await fetchMembersByGameIds([gameId]);

  return { game, members };
}

export function getManagementPermissions(
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

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function assertValidCostAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Số tiền chi phí không hợp lệ.');
  }
}

export function assertValidPaymentInput(input: UpdatePaymentInput) {
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
