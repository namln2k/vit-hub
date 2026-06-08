import { getBadmintonCostManagement } from '@/features/badminton/server/badmintonRepository';
import { jsonResponse } from '@/server/api';
import { requireBadmintonApiUser } from '@/features/badminton/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireBadmintonApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    const costs = await getBadmintonCostManagement(gameId, auth.uid);

    return jsonResponse({ costs });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải chia chi phí.' },
      403,
    );
  }
}
