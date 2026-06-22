import 'server-only';

import { headers } from 'next/headers';

const LOCAL_HOST_ALIASES = new Map([
  ['0.0.0.0', 'localhost'],
  ['::', 'localhost'],
]);

export async function getRequestOrigin() {
  return getRequestOriginFromHeaders(await headers());
}

export function getRequestOriginFromHeaders(requestHeaders: Headers) {
  const originHeader = requestHeaders.get('origin');
  const origin = normalizeOrigin(originHeader);

  if (origin) {
    return origin;
  }

  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost ?? requestHeaders.get('host');

  if (!host) {
    throw new Error('Could not determine the request origin.');
  }

  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol =
    forwardedProtocol ||
    (host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0') ||
    host.startsWith('::')
      ? 'http'
      : 'https');

  const normalizedHost = normalizeHost(host);

  return new URL(`${protocol}://${normalizedHost}`).origin;
}

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeHost(host: string) {
  const [hostname, ...portParts] = host.split(':');
  const normalizedHostname = LOCAL_HOST_ALIASES.get(hostname) ?? hostname;
  const port = portParts.length > 0 ? `:${portParts.join(':')}` : '';

  return `${normalizedHostname}${port}`;
}
