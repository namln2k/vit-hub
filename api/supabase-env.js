function stripTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

export function getSupabasePublicServerConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required for server API routes. Legacy SUPABASE_ANON_KEY is also supported. For local development only, VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY can be used as fallbacks.',
    );
  }

  return {
    supabaseUrl: stripTrailingSlash(supabaseUrl),
    publishableKey,
  };
}

export function getSupabaseAdminServerConfig() {
  const config = getSupabasePublicServerConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server API routes.');
  }

  return {
    ...config,
    serviceRoleKey,
  };
}
