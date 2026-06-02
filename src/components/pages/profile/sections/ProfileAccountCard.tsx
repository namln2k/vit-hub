import { USER_ROLE_LABELS } from '@/constants/userRoles';
import { useAuth } from '@/contexts/useAuth';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import ProfileAlert from '../common/ProfileAlert';
import ProfileField from '../common/ProfileField';
import EditableNameField from '../fields/EditableNameField';
import EditableNicknameField from '../fields/EditableNicknameField';
import PasswordChangeModal from '../modals/PasswordChangeModal';
import PersonnelInfoSection from './PersonnelInfoSection';
import ProfileAvatarSection from './ProfileAvatarSection';

export default function ProfileAccountCard() {
  const { appUser, updateUserAvatar, updateUserName, updateUserNickname, updateUserPersonnel } =
    useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSuccess, setNicknameSuccess] = useState('');
  const [personnelError, setPersonnelError] = useState('');
  const [personnelSuccess, setPersonnelSuccess] = useState('');

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

        <ProfileAlert tone="success" message={passwordSuccess} />
        <ProfileAlert tone="error" message={avatarError} />
        <ProfileAlert tone="success" message={avatarSuccess} />
        <ProfileAlert tone="error" message={nameError} />
        <ProfileAlert tone="success" message={nameSuccess} />
        <ProfileAlert tone="error" message={nicknameError} />
        <ProfileAlert tone="success" message={nicknameSuccess} />
        <ProfileAlert tone="error" message={personnelError} />
        <ProfileAlert tone="success" message={personnelSuccess} />

        {appUser && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileAvatarSection
              appUser={appUser}
              onAvatarUpdate={updateUserAvatar}
              onError={setAvatarError}
              onSuccess={setAvatarSuccess}
            />
            <EditableNameField
              appUser={appUser}
              onUpdate={updateUserName}
              onError={setNameError}
              onSuccess={setNameSuccess}
            />
            <EditableNicknameField
              appUser={appUser}
              onUpdate={updateUserNickname}
              onError={setNicknameError}
              onSuccess={setNicknameSuccess}
            />
            <ProfileField label="Username" value={`@${appUser.username}`} />
            <ProfileField label="Email" value={appUser.email} />
            <PersonnelInfoSection
              appUser={appUser}
              onUpdate={updateUserPersonnel}
              onError={setPersonnelError}
              onSuccess={setPersonnelSuccess}
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
