import { createBrowserClient } from '@supabase/ssr';
import { getPublicSupabaseConfig } from '@/config/env';
import { SUPABASE_AUTH_COOKIE_NAME } from './config';

const { supabaseUrl, publishableKey } = getPublicSupabaseConfig();

export const supabase = createBrowserClient(supabaseUrl, publishableKey, {
  cookieOptions: {
    name: SUPABASE_AUTH_COOKIE_NAME,
  },
});

export function createClient() {
  return supabase;
}
