import { getBearerToken, jsonResponse, readJsonBody } from '@/server/api';
import { getSupabaseUid } from '@/server/supabase';
import { createSportGame, listSportGamesForUser } from '@/features/sports/server/sportRepository';
import { DEFAULT_SPORT_TYPE, isSportType } from '@/features/sports/sportTypes';

export const runtime = 'nodejs';

interface CreateGameBody {
  type?: unknown;
  name?: unknown;
  gameDate?: unknown;
  gameTime?: unknown;
  locationName?: unknown;
  locationUrl?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

async function requireUser(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return { error: jsonResponse({ error: 'Missing Supabase access token.' }, 401) };
  }

  const uid = await getSupabaseUid(accessToken);

  if (!uid) {
    return { error: jsonResponse({ error: 'Invalid Supabase access token.' }, 401) };
  }

  return { uid };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isValidTime(value: string) {
  return !value || /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);

    if (auth.error) {
      return auth.error;
    }

    const games = await listSportGamesForUser(auth.uid);
    return jsonResponse({ games });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tải danh sách kèo.' },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);

    if (auth.error) {
      return auth.error;
    }

    const body = await readJsonBody<CreateGameBody>(request, 20_000);
    const type = body.type === undefined ? DEFAULT_SPORT_TYPE : body.type;
    const gameDate = readString(body.gameDate);
    const gameTime = readString(body.gameTime);

    if (!isSportType(type)) {
      return jsonResponse({ error: 'Loại kèo không hợp lệ.' }, 400);
    }

    if (gameDate && !isValidDate(gameDate)) {
      return jsonResponse({ error: 'Ngày chơi không hợp lệ.' }, 400);
    }

    if (!isValidTime(gameTime)) {
      return jsonResponse({ error: 'Giờ chơi không hợp lệ.' }, 400);
    }

    const result = await createSportGame({
      hostUserId: auth.uid,
      type,
      name: readString(body.name),
      gameDate,
      gameTime,
      locationName: readString(body.locationName),
      locationUrl: readString(body.locationUrl),
    });

    return jsonResponse(result, 201);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Không thể tạo kèo.' },
      500,
    );
  }
}
