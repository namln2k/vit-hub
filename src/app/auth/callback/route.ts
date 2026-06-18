import { createClient } from '@/lib/supabase/server';
import { APP_ROUTES, withRouteQuery } from '@/constants/routes';
import {
  getDefaultAuthenticatedRoute,
  getSafeAuthNextPath,
} from '@/features/auth/lib/authRedirects';
import { getCurrentUserProfile } from '@/server/services/users/profile';
import type { UserSummaryDto } from '@/features/users/types';
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

    if (!error) {
      const user = data.user;
      let profile: UserSummaryDto | null = null;

      try {
        profile = user
          ? await getCurrentUserProfile({
              actor: { userId: user.id },
              email: user.email ?? '',
              metadata: user.user_metadata,
            })
          : null;
      } catch (profileError) {
        console.error('Failed to provision the OAuth application profile.', profileError);
        return redirectToLogin(
          origin,
          'Đăng nhập thành công nhưng không thể tải hồ sơ. Vui lòng thử lại.',
        );
      }

      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(
        `${origin}${getDefaultAuthenticatedRoute(profile?.role ?? null)}`,
      );
    }
  }

  return redirectToLogin(origin, 'Không thể hoàn tất đăng nhập Google.');
}

function redirectToLogin(origin: string, message: string) {
  return NextResponse.redirect(`${origin}${withRouteQuery(APP_ROUTES.login, { message })}`);
}
