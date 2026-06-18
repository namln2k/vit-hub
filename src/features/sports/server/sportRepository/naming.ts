import { supabaseFetch } from '@/server/supabase';
import { getSportTypeLabel } from '@/features/sports/sportTypes';
import { CreateSportGameInput } from '@/features/sports/server/sportRepository/types';
import { cleanString } from '@/features/sports/server/sportRepository/utils';

export async function fetchExistingGameNames(baseName: string) {
  const pattern = `${baseName}%`;
  const query = new URLSearchParams({
    select: 'name',
    deleted_at: 'is.null',
    name: `ilike.${pattern}`,
  });
  const { response, data } = await supabaseFetch<Array<{ name: string }>>(
    `/rest/v1/sport_games?${query.toString()}`,
  );

  if (!response.ok || !Array.isArray(data)) {
    throw new Error('Không thể kiểm tra tên kèo.');
  }

  return new Set(data.map((row) => row.name));
}

export async function generateGameName(input: CreateSportGameInput, hostName: string) {
  const explicitName = cleanString(input.name);

  if (explicitName) {
    return explicitName;
  }

  const parts = [
    getSportTypeLabel(input.type),
    input.locationName,
    input.gameDate,
    input.gameTime,
    hostName,
  ]
    .map(cleanString)
    .filter(Boolean);
  const baseName = parts.join(' | ');
  const existingNames = await fetchExistingGameNames(baseName);

  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let index = 2;
  let candidate = `${baseName}_${index}`;

  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName}_${index}`;
  }

  return candidate;
}
