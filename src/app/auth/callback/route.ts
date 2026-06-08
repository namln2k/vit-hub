import { createClient } from '@/lib/supabase/server';
import { APP_ROUTES, withRouteQuery } from '@/constants/routes';
import {
  getDefaultAuthenticatedRoute,
  getSafeAuthNextPath,
} from '@/features/auth/lib/authRedirects';
import { getUserRole } from '@/server/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeAuthNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const uid = data.session?.user.id;
      let role: string | null = null;

      if (uid) {
        try {
          role = (await getUserRole(uid, 'Không thể kiểm tra vai trò người dùng.')) ?? null;
        } catch {
          role = null;
        }
      }

      return NextResponse.redirect(`${origin}${getDefaultAuthenticatedRoute(role)}`);
    }
  }

  return NextResponse.redirect(
    `${origin}${withRouteQuery(APP_ROUTES.login, {
      message: 'Không thể hoàn tất đăng nhập Google.',
    })}`,
  );
}
