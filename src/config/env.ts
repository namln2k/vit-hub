function readRequired(name: string, value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return normalized;
}

export function readHttpUrl(name: string, value: string | undefined) {
  const normalized = readRequired(name, value).replace(/\/$/, '');
  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTP or HTTPS.`);
  }

  return url.toString().replace(/\/$/, '');
}

export function readPositiveInteger(name: string, value: string | undefined, fallback: number) {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

export function getPublicSupabaseConfig() {
  return {
    supabaseUrl: readHttpUrl(
      'NEXT_PUBLIC_SUPABASE_URL',
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: readRequired(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function getGoogleOneTapConfig() {
  const enabled = process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED === 'true';
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

  if (enabled && !clientId) {
    throw new Error(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID is required when NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=true.',
    );
  }

  return { enabled, clientId };
}
