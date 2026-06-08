import { joinBadmintonGameAsGuest } from '@/features/badminton/server/badmintonRepository';
import { jsonResponse, readJsonBody } from '@/server/api';

export const runtime = 'nodejs';

interface GuestJoinBody {
  guestName?: unknown;
  guestContact?: unknown;
}

interface RouteContext {
  params: Promise<{
    gameId: string;
  }>;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const body = await readJsonBody<GuestJoinBody>(request, 10_000);
    const { gameId } = await context.params;
    const result = await joinBadmintonGameAsGuest({
      gameId,
      guestName: readString(body.guestName),
      guestContact: readString(body.guestContact),
    });

    return jsonResponse(result, 201);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể thêm khách tham gia.' },
      400,
    );
  }
}
