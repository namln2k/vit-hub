import { demoteBadmintonMember } from '@/features/badminton/server/badmintonRepository';
import { jsonResponse } from '@/server/api';
import { requireBadmintonApiUser } from '@/features/badminton/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ gameId: string; memberId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireBadmintonApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId, memberId } = await context.params;
    await demoteBadmintonMember(gameId, auth.uid, memberId);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể demote co-host.' },
      400,
    );
  }
}
