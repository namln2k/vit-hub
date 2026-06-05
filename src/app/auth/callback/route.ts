import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/profile';

  if (!next.startsWith('/')) {
    next = '/profile';
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Không thể hoàn tất đăng nhập Google.')}`,
  );
}
