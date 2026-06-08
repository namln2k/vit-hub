import { getSportCostManagement } from '@/features/sports/server/sportRepository';
import { jsonResponse } from '@/server/api';
import { requireSportApiUser } from '@/features/sports/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireSportApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    const costs = await getSportCostManagement(gameId, auth.uid);

    return jsonResponse({ costs });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải chia chi phí.' },
      403,
    );
  }
}
