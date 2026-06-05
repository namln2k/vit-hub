'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ImagePlus, UserPlus, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useAuth } from '@/contexts/useAuth';
import PasswordInput from '@/components/shared/form/PasswordInput';
import { validateAvatarFile } from '@/services/avatarUpload';
import GoogleSignIn from '@/components/pages/auth/GoogleSignIn';
import AvatarEditor from '@/components/shared/avatar/AvatarEditor';

const registerSchema = z.object({
  lastName: z.string().min(1, 'Họ không được để trống'),
  middleName: z.string().optional(),
  firstName: z.string().min(1, 'Tên không được để trống'),
  nickname: z.string().optional(),
  username: z
    .string()
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(20, 'Username tối đa 20 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  email: z.email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type RegisterFormData = z.input<typeof registerSchema>;

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-500">
      *
    </span>
  );
}

export default function RegisterPage() {
  const { signInWithGoogle, signUp } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarFileToEdit, setAvatarFileToEdit] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('');
      return;
    }

    let isActive = true;
    const reader = new FileReader();

    setAvatarPreviewUrl('');
    reader.onload = () => {
      if (isActive && typeof reader.result === 'string') {
        setAvatarPreviewUrl(reader.result);
      }
    };
    reader.onerror = () => {
      if (isActive) {
        setAvatarError('Không thể đọc ảnh đã chọn.');
      }
    };
    reader.readAsDataURL(avatarFile);

    return () => {
      isActive = false;
      reader.abort();
    };
  }, [avatarFile]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setAvatarError('');

    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);

    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    setAvatarFileToEdit(file);
  }

  function removeAvatar() {
    setAvatarFile(undefined);
    setAvatarFileToEdit(null);
    setAvatarError('');
  }

  function saveEditedAvatar(editedAvatar: File) {
    setAvatarFile(editedAvatar);
    setAvatarFileToEdit(null);
    setAvatarError('');
  }

  async function onSubmit(data: RegisterFormData) {
    try {
      setError('');
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
          `/login?message=${encodeURIComponent(
            'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
          )}`,
        );
        return;
      }

      router.replace('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi đăng ký.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng ký bằng Google.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <Link
          href="/"
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ảnh đại diện <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt="Ảnh đại diện đã chọn"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    Chọn ảnh
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      className="sr-only"
                    />
                  </label>
                  {avatarFile && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
                      title="Xoá ảnh đã chọn"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG hoặc WebP, tối đa 1 MB.</p>
              </div>
            </div>
            {avatarError && <p className="text-red-500 text-xs mt-1">{avatarError}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ
                <RequiredMark />
              </label>
              <input
                {...register('lastName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Nguyễn"
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đệm</label>
              <input
                {...register('middleName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Văn"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên
                <RequiredMark />
              </label>
              <input
                {...register('firstName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="An"
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
            <input
              {...register('nickname')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Nickname"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
              <RequiredMark />
            </label>
            <input
              {...register('username')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="nguyenvanan"
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
              <RequiredMark />
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
              <RequiredMark />
            </label>
            <PasswordInput
              {...register('password')}
              className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Ít nhất 8 ký tự"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

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
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>

      {avatarFileToEdit && (
        <AvatarEditor
          file={avatarFileToEdit}
          onCancel={() => setAvatarFileToEdit(null)}
          onSave={saveEditedAvatar}
        />
      )}
    </div>
  );
}
