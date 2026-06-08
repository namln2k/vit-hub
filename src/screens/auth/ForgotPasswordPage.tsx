'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { APP_ROUTES } from '@/constants/routes';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    try {
      setLoading(true);
      await resetPassword(data.email);
      toast.success('Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.', {
        id: 'forgot-password-success',
      });
    } catch {
      toast.error('Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.', {
        id: 'forgot-password-error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-indigo-100 p-3 rounded-full mb-3">
            <KeyRound className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
          <p className="text-gray-500 text-sm mt-1">Nhập email để đặt lại mật khẩu</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : 'Gửi email đặt lại mật khẩu'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã nhớ mật khẩu?{' '}
          <Link href={APP_ROUTES.login} className="text-indigo-600 font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
