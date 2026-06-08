'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, UserPlus } from 'lucide-react';
import { APP_ROUTES, withRouteQuery } from '@/constants/routes';
import { useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import GoogleSignIn from '@/features/auth/components/GoogleSignIn';
import RegisterAvatarField from '@/features/auth/components/RegisterAvatarField';
import RegisterFields from '@/features/auth/components/RegisterFields';
import { useRegisterAvatar } from '@/features/auth/hooks/useRegisterAvatar';
import { registerSchema, type RegisterFormData } from '@/features/auth/lib/registerForm';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { signInWithGoogle, signUp } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    avatarFile,
    avatarFileToEdit,
    avatarPreviewUrl,
    cancelAvatarEdit,
    handleAvatarChange,
    removeAvatar,
    saveEditedAvatar,
  } = useRegisterAvatar();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    try {
      setLoading(true);
      const result = await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName ?? '',
        nickname: data.nickname ?? '',
        username: data.username,
        avatarFile,
      });

      if (result.needsEmailConfirmation) {
        router.replace(
          withRouteQuery(APP_ROUTES.login, {
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
          }),
        );
        return;
      }

      router.replace(APP_ROUTES.profile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi đăng ký.', {
        id: 'register-error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể đăng ký bằng Google.', {
        id: 'google-register-error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <Link
          href={APP_ROUTES.home}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors mb-6"
        >
          <Home className="w-4 h-4" />
          Trang chủ
        </Link>

        <div className="flex flex-col items-center mb-10">
          <div className="bg-indigo-100 p-3 rounded-full mb-3">
            <UserPlus className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <RegisterAvatarField
            avatarFile={avatarFile}
            avatarFileToEdit={avatarFileToEdit}
            avatarPreviewUrl={avatarPreviewUrl}
            onAvatarChange={handleAvatarChange}
            onAvatarEditCancel={cancelAvatarEdit}
            onAvatarRemove={removeAvatar}
            onAvatarSave={saveEditedAvatar}
          />
          <RegisterFields errors={errors} register={register} />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">hoặc</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="w-full text-center">
          <GoogleSignIn
            handleGoogleSignIn={handleGoogleSignIn}
            label="Đăng ký với Google"
            loading={loading}
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{' '}
          <Link href={APP_ROUTES.login} className="text-indigo-600 font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
