import { supabase } from '@/api/supabase';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const hasExchangedCode = useRef(false);

  useEffect(() => {
    async function exchangeCode() {
      if (hasExchangedCode.current) {
        return;
      }

      hasExchangedCode.current = true;
      const next = searchParams.get('next') || '/dashboard';
      const code = searchParams.get('code');

      if (!code) {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setError('Không tìm thấy mã xác thực Google.');
          return;
        }

        navigate(next, { replace: true });
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(`Không thể hoàn tất đăng nhập Google: ${exchangeError.message}`);
        return;
      }

      navigate(next, { replace: true });
    }

    void exchangeCode();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600">
          {error || 'Đang hoàn tất đăng nhập...'}
        </p>
      </div>
    </div>
  );
}
