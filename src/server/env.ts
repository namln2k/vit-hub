import 'server-only';

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function isLocalSupabaseUrl(value: string) {
  const url = new URL(value);

  return (
    url.port === '54321' &&
    ['127.0.0.1', 'localhost', 'host.docker.internal'].includes(url.hostname)
  );
}

function getContainerReachableSupabaseUrl(value: string) {
  const url = new URL(value);
  const isLocalSupabase = isLocalSupabaseUrl(value);

  if (process.env.DOCKER_CONTAINER === 'true' && isLocalSupabase) {
    url.hostname = 'host.docker.internal';
  }

  return stripTrailingSlash(url.toString());
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for server API routes.`);
  }

  return value;
}

export function getSupabasePublicServerConfig() {
  const publicSupabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseUrl =
    publicSupabaseUrl && isLocalSupabaseUrl(publicSupabaseUrl)
      ? (process.env.SUPABASE_INTERNAL_URL ?? publicSupabaseUrl)
      : publicSupabaseUrl;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for server API routes. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are also supported for public config.',
    );
  }

  return {
    supabaseUrl: getContainerReachableSupabaseUrl(supabaseUrl),
    publishableKey,
  };
}

export function getSupabaseAdminServerConfig() {
  return {
    ...getSupabasePublicServerConfig(),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

export function getRequiredR2Config() {
  const requiredEnv = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_BASE_URL',
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);

  if (missingEnv.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missingEnv.join(', ')}`);
  }

  return {
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: requireEnv('R2_BUCKET_NAME'),
  };
}
