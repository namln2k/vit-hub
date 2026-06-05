import { NextResponse } from 'next/server';

export function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  const bodyText = await request.text();

  if (bodyText.length > maxBytes) {
    throw new Error('Request body is too large.');
  }

  if (!bodyText) {
    return {} as T;
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

export function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
}
