import PasswordInput from '@/components/shared/form/PasswordInput';
import { useAuth } from '@/contexts/useAuth';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

interface PasswordChangeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordChangeModal({ onClose, onSuccess }: PasswordChangeModalProps) {
  const { updateUserPassword } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  });

  async function onSubmit(data: UpdatePasswordFormData) {
    try {
      setError('');
      setLoading(true);
      await updateUserPassword(data.currentPassword, data.newPassword);
      reset();
      onSuccess();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể cập nhật mật khẩu. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) {
      return;
    }

    reset();
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-full">
              <KeyRound className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Đổi mật khẩu</h2>
              <p className="text-gray-500 text-sm mt-1">Cập nhật mật khẩu tài khoản</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu hiện tại
            </label>
            <PasswordInput
              {...register('currentPassword')}
              className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Nhập mật khẩu hiện tại"
            />
            {errors.currentPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
            <PasswordInput
              {...register('newPassword')}
              className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Ít nhất 8 ký tự"
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu mới
            </label>
            <PasswordInput
              {...register('confirmPassword')}
              className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Nhập lại mật khẩu mới"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
