import { createClient } from '@/lib/supabase/server';
import { APP_ROUTES, withRouteQuery } from '@/constants/routes';
import {
  getDefaultAuthenticatedRoute,
  getSafeAuthNextPath,
} from '@/features/auth/lib/authRedirects';
import { getUserRole } from '@/server/supabase';
import { NextResponse } from 'next/server';

function getAppOrigin() {
  return (process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeAuthNextPath(searchParams.get('next'));
  const origin = getAppOrigin();

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log({ data, error });

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
