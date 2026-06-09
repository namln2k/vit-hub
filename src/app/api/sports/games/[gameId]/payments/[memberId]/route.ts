import { resetSportPayment, updateSportPayment } from '@/features/sports/server/sportRepository';
import { jsonResponse, readJsonBody } from '@/server/api';
import { requireSportApiUser } from '@/features/sports/server/apiAuth';
import type { SportPaymentStatus } from '@/features/sports/types';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string; memberId: string }>;
}

interface PaymentBody {
  amountOverride?: unknown;
  paymentStatus?: unknown;
  paymentNote?: unknown;
  reset?: unknown;
}

function readNullableAmount(value: unknown) {
  if (value === null || value === '') {
    return null;
  }

  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readPaymentStatus(value: unknown): SportPaymentStatus {
  if (value === 'unpaid' || value === 'paid') {
    return value;
  }

  throw new Error('Trạng thái thanh toán không hợp lệ.');
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireSportApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId, memberId } = await context.params;
    const body = await readJsonBody<PaymentBody>(request, 10_000);

    if (body.reset) {
      await resetSportPayment(gameId, auth.uid, memberId);
      return jsonResponse({ ok: true });
    }

    await updateSportPayment({
      actorUserId: auth.uid,
      gameId,
      memberId,
      amountOverride: readNullableAmount(body.amountOverride),
      paymentStatus: readPaymentStatus(body.paymentStatus),
      paymentNote: readString(body.paymentNote),
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật thanh toán.' },
      400,
    );
  }
}
