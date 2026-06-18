import { supabaseFetch } from '@/server/supabase';
import type { SportCostManagement } from '@/features/sports/types';
import {
  UpdatePaymentInput,
  UpsertCostItemInput,
} from '@/features/sports/server/sportRepository/types';
import {
  cleanString,
  mapParticipant,
  toNullableString,
} from '@/features/sports/server/sportRepository/utils';
import {
  fetchCostItems,
  fetchPaymentByMemberId,
  fetchPayments,
  fetchUsersByIds,
} from '@/features/sports/server/sportRepository/data';
import {
  assertCanManageCosts,
  assertValidCostAmount,
  assertValidPaymentInput,
  mapCostItem,
  mapPayment,
  requireGameAndMembers,
  roundMoney,
  toNumber,
} from '@/features/sports/server/sportRepository/costSupport';

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
