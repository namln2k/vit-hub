import 'server-only';

import { getSupabaseAdminServerConfig, getSupabaseServerConfig } from '@/server/env';

interface SupabaseFetchOptions {
  key?: string;
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
}

export async function supabaseFetch<T = unknown>(
  path: string,
  { key, method = 'GET', body, headers = {} }: SupabaseFetchOptions = {},
) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminServerConfig();
  const authKey = key ?? serviceRoleKey;
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: authKey,
      Authorization: `Bearer ${authKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : null;

  return { response, data };
}

export async function getSupabaseUid(accessToken: string) {
  const { supabaseUrl, publishableKey } = getSupabaseServerConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? null;
}

export async function getUserRole(uid: string, errorMessage: string) {
  const query = new URLSearchParams({
    select: 'role',
    id: `eq.${uid}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<Array<{ role?: string }>>(
    `/rest/v1/user?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return Array.isArray(data) ? data[0]?.role : null;
}
