import { USER_ROLE_LABELS } from '@/constants/userRoles';
import { useAuth } from '@/contexts/useAuth';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import ProfileField from '../common/ProfileField';
import EditableNameField from '../fields/EditableNameField';
import EditableNicknameField from '../fields/EditableNicknameField';
import PasswordChangeModal from '../modals/PasswordChangeModal';
import PersonnelInfoSection from './PersonnelInfoSection';
import ProfileAvatarSection from './ProfileAvatarSection';
import { toast } from 'sonner';

export default function ProfileAccountCard() {
  const { appUser, updateUserAvatar, updateUserName, updateUserNickname, updateUserPersonnel } =
    useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  function openPasswordModal() {
    setIsPasswordModalOpen(true);
  }

  function closePasswordModal() {
    setIsPasswordModalOpen(false);
  }

  function handlePasswordChangeSuccess() {
    setIsPasswordModalOpen(false);
    toast.success('Mật khẩu đã được cập nhật thành công.', { id: 'profile-password-success' });
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Thông tin tài khoản</h2>
          <button
            type="button"
            onClick={openPasswordModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <KeyRound className="h-4 w-4" />
            Đổi mật khẩu
          </button>
        </div>

        {appUser && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileAvatarSection
              appUser={appUser}
              onAvatarUpdate={updateUserAvatar}
            />
            <EditableNameField
              appUser={appUser}
              onUpdate={updateUserName}
            />
            <EditableNicknameField
              appUser={appUser}
              onUpdate={updateUserNickname}
            />
            <ProfileField label="Username" value={`@${appUser.username}`} />
            <ProfileField label="Email" value={appUser.email} />
            <PersonnelInfoSection
              appUser={appUser}
              onUpdate={updateUserPersonnel}
            />
            <ProfileField label="Vai trò" value={USER_ROLE_LABELS[appUser.role]} />
          </div>
        )}
      </div>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={closePasswordModal} onSuccess={handlePasswordChangeSuccess} />
      )}
    </>
  );
}
