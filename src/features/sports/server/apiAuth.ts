import { getBearerToken, jsonResponse } from '@/server/api';
import { getSupabaseUid } from '@/server/supabase';

export async function requireSportApiUser(request: Request) {
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
