import { jsonResponse } from '@/server/api';
import { requireSportApiUser } from '@/features/sports/server/apiAuth';
import { restoreSportGame } from '@/features/sports/server/sportRepository';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireSportApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    await restoreSportGame(gameId, auth.uid);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể khôi phục kèo.' },
      400,
    );
  }
}
