import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicServerConfig } from '@/server/env';
import { SUPABASE_AUTH_COOKIE_NAME } from './config';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, publishableKey } = getSupabasePublicServerConfig();

  return createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_COOKIE_NAME,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy refresh handles this path.
        }
      },
    },
  });
}
