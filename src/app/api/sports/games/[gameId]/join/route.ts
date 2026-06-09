import { getBearerToken, jsonResponse } from '@/server/api';
import { joinSportGameAsAccount } from '@/features/sports/server/sportRepository';
import { getSupabaseUid } from '@/server/supabase';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    gameId: string;
  }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return jsonResponse({ error: 'Missing Supabase access token.' }, 401);
    }

    const uid = await getSupabaseUid(accessToken);

    if (!uid) {
      return jsonResponse({ error: 'Invalid Supabase access token.' }, 401);
    }

    const { gameId } = await context.params;
    const result = await joinSportGameAsAccount(gameId, uid);

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tham gia kèo.' },
      400,
    );
  }
}
