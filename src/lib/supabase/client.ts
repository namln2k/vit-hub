import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_AUTH_COOKIE_NAME } from './config';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        name: SUPABASE_AUTH_COOKIE_NAME,
      },
    },
  );
}
