import Header from '@/components/layout/Header';
import PasswordChangeModal from '@/components/dashboard/PasswordChangeModal';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import { useAuth } from '@/contexts/useAuth';
import { validateAvatarFile } from '@/api/avatarUpload';
import defaultAvatar from '@/assets/default-avatar.png';
import { Camera, KeyRound } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

export default function DashboardPage() {
  const { userProfile, updateUserAvatar } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  function openPasswordModal() {
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  }

  function closePasswordModal() {
    setIsPasswordModalOpen(false);
  }

  function handlePasswordChangeSuccess() {
    setIsPasswordModalOpen(false);
    setPasswordSuccess('Mật khẩu đã được cập nhật thành công.');
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setAvatarError('');
    setAvatarSuccess('');

    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);

    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    try {
      setAvatarUploading(true);
      await updateUserAvatar(file);
      setAvatarSuccess('Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : 'Không thể cập nhật ảnh đại diện.',
      );
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Hồ sơ cá nhân</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Thông tin tài khoản</h2>
            <button
              type="button"
              onClick={openPasswordModal}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Đổi mật khẩu
            </button>
          </div>

          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {passwordSuccess}
            </div>
          )}

          {avatarError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {avatarError}
            </div>
          )}

          {avatarSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {avatarSuccess}
            </div>
          )}

          {userProfile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-center gap-4">
                <label className="relative block w-20 h-20 rounded-full cursor-pointer group">
                  <img
                    src={userProfile.avatarUrl || defaultAvatar}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border border-gray-200"
                  />
                  <span className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </span>
                  {avatarUploading && (
                    <span className="absolute inset-0 rounded-full bg-white/80 text-xs font-medium text-gray-700 flex items-center justify-center">
                      Đang tải
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    disabled={avatarUploading}
                    className="sr-only"
                  />
                </label>
                <div>
                  <p className="text-sm text-gray-500">Ảnh đại diện</p>
                  <p className="font-medium text-gray-900">
                    {userProfile.avatarUrl ? 'Nhấn vào ảnh để thay đổi' : 'Nhấn vào ảnh để tải lên'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG hoặc WebP, tối đa 1 MB.</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Họ và tên</p>
                <p className="font-medium text-gray-900">
                  {`${userProfile.lastName} ${userProfile.middleName} ${userProfile.firstName}`.trim()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-gray-900">@{userProfile.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{userProfile.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vai trò</p>
                <p className="font-medium text-gray-900">{USER_ROLE_LABELS[userProfile.role]}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={closePasswordModal} onSuccess={handlePasswordChangeSuccess} />
      )}
    </div>
  );
}
