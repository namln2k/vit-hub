import { supabase } from '@/services/supabase';

export async function apiFetch<T = { ok: boolean }>(
  input: RequestInfo | URL,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.');
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new ApiError(result.error ?? 'Không thể thực hiện thao tác.', response.status);
  }

  return result;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
