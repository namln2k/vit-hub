import { jsonResponse } from '@/server/api';
import { leaveBadmintonGame } from '@/features/badminton/server/badmintonRepository';
import { requireBadmintonApiUser } from '@/features/badminton/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireBadmintonApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    await leaveBadmintonGame(gameId, auth.uid);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể rời kèo.' },
      400,
    );
  }
}
