import { createSportCostItem } from '@/features/sports/server/sportRepository';
import { jsonResponse, readJsonBody } from '@/server/api';
import { requireSportApiUser } from '@/features/sports/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

interface CostItemBody {
  label?: unknown;
  amount?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireSportApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    const body = await readJsonBody<CostItemBody>(request, 10_000);
    await createSportCostItem({
      actorUserId: auth.uid,
      gameId,
      label: readString(body.label),
      amount: readAmount(body.amount),
    });

    return jsonResponse({ ok: true }, 201);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể thêm chi phí.' },
      400,
    );
  }
}
