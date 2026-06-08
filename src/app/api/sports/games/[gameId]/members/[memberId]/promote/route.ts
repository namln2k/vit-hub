import { jsonResponse } from '@/server/api';
import { promoteSportMember } from '@/features/sports/server/sportRepository';
import { requireSportApiUser } from '@/features/sports/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string; memberId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireSportApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId, memberId } = await context.params;
    await promoteSportMember(gameId, auth.uid, memberId);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể promote co-host.' },
      400,
    );
  }
}
