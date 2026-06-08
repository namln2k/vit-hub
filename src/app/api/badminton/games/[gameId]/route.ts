import {
  getBadmintonManagementGame,
  softDeleteBadmintonGame,
  updateBadmintonGame,
} from '@/features/badminton/server/badmintonRepository';
import { jsonResponse, readJsonBody } from '@/server/api';
import { requireBadmintonApiUser } from '@/features/badminton/server/apiAuth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    gameId: string;
  }>;
}

interface UpdateGameBody {
  name?: unknown;
  gameDate?: unknown;
  gameTime?: unknown;
  locationName?: unknown;
  locationUrl?: unknown;
  costSharingEnabled?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidTime(value: string) {
  return !value || /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireBadmintonApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    const game = await getBadmintonManagementGame(gameId, auth.uid);

    return jsonResponse({ game });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải kèo cầu lông.' },
      403,
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireBadmintonApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    const body = await readJsonBody<UpdateGameBody>(request, 20_000);
    const gameDate = readString(body.gameDate);
    const gameTime = readString(body.gameTime);

    if (!isValidDate(gameDate)) {
      return jsonResponse({ error: 'Ngày chơi không hợp lệ.' }, 400);
    }

    if (!isValidTime(gameTime)) {
      return jsonResponse({ error: 'Giờ chơi không hợp lệ.' }, 400);
    }

    await updateBadmintonGame({
      actorUserId: auth.uid,
      gameId,
      name: readString(body.name),
      gameDate,
      gameTime,
      locationName: readString(body.locationName),
      locationUrl: readString(body.locationUrl),
      costSharingEnabled: Boolean(body.costSharingEnabled),
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể cập nhật kèo cầu lông.' },
      400,
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireBadmintonApiUser(request);

    if (auth.error) {
      return auth.error;
    }

    const { gameId } = await context.params;
    await softDeleteBadmintonGame(gameId, auth.uid);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể xóa kèo cầu lông.' },
      400,
    );
  }
}
