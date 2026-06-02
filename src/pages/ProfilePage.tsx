import Header from '@/components/layout/Header';
import PasswordChangeModal from '@/components/profile/PasswordChangeModal';
import AvatarEditor from '@/components/avatar/AvatarEditor';
import Avatar from '@/components/layout/Avatar';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import { useAuth } from '@/contexts/useAuth';
import { validateAvatarFile } from '@/api/avatarUpload';
import { Camera, Check, KeyRound, Pencil, X } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

function getFullName(lastName: string, middleName: string, firstName: string) {
  return [lastName, middleName, firstName].map((part) => part.trim()).filter(Boolean).join(' ');
}

export default function ProfilePage() {
  const { appUser, updateUserAvatar, updateUserName, updateUserNickname } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFileToEdit, setAvatarFileToEdit] = useState<File | null>(null);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameForm, setNameForm] = useState({
    lastName: '',
    middleName: '',
    firstName: '',
  });
  const [isNicknameEditing, setIsNicknameEditing] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSuccess, setNicknameSuccess] = useState('');
  const [nicknameForm, setNicknameForm] = useState('');

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

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
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

    setAvatarFileToEdit(file);
  }

  async function saveEditedAvatar(avatarFile: File) {
    try {
      setAvatarUploading(true);
      await updateUserAvatar(avatarFile);
      setAvatarFileToEdit(null);
      setAvatarSuccess('Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setAvatarUploading(false);
    }
  }

  function startNameEditing() {
    if (!appUser) {
      return;
    }

    setNameError('');
    setNameSuccess('');
    setNameForm({
      lastName: appUser.lastName,
      middleName: appUser.middleName,
      firstName: appUser.firstName,
    });
    setIsNameEditing(true);
  }

  function cancelNameEditing() {
    if (nameSaving) {
      return;
    }

    setNameError('');
    setIsNameEditing(false);
  }

  function handleNameInputChange(field: keyof typeof nameForm, value: string) {
    setNameForm((currentNameForm) => ({
      ...currentNameForm,
      [field]: value,
    }));
  }

  async function saveUserName() {
    const nextName = {
      lastName: nameForm.lastName.trim(),
      middleName: nameForm.middleName.trim(),
      firstName: nameForm.firstName.trim(),
    };

    if (!nextName.lastName || !nextName.firstName) {
      setNameError('Họ và Tên không được để trống.');
      return;
    }

    try {
      setNameError('');
      setNameSuccess('');
      setNameSaving(true);
      await updateUserName(nextName);
      setIsNameEditing(false);
      setNameSuccess('Họ và tên đã được cập nhật.');
    } catch (error) {
      setNameError(error instanceof Error ? error.message : 'Không thể cập nhật họ và tên.');
    } finally {
      setNameSaving(false);
    }
  }

  function startNicknameEditing() {
    if (!appUser) {
      return;
    }

    setNicknameError('');
    setNicknameSuccess('');
    setNicknameForm(appUser.nickname);
    setIsNicknameEditing(true);
  }

  function cancelNicknameEditing() {
    if (nicknameSaving) {
      return;
    }

    setNicknameError('');
    setIsNicknameEditing(false);
  }

  async function saveUserNickname() {
    try {
      setNicknameError('');
      setNicknameSuccess('');
      setNicknameSaving(true);
      await updateUserNickname({ nickname: nicknameForm.trim() });
      setIsNicknameEditing(false);
      setNicknameSuccess('Nickname đã được cập nhật.');
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : 'Không thể cập nhật Nickname.');
    } finally {
      setNicknameSaving(false);
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

          {nameError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {nameError}
            </div>
          )}

          {nameSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {nameSuccess}
            </div>
          )}

          {nicknameError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {nicknameError}
            </div>
          )}

          {nicknameSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {nicknameSuccess}
            </div>
          )}

          {appUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex items-center gap-4">
                <label className="relative block w-20 h-20 rounded-full cursor-pointer group">
                  <Avatar
                    src={appUser.avatarUrl}
                    size="lg"
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
                    id="profile-avatar"
                    name="avatar"
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
                    {appUser.avatarUrl ? 'Nhấn vào ảnh để thay đổi' : 'Nhấn vào ảnh để tải lên'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG hoặc WebP, tối đa 1 MB.</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Họ và tên</p>
                {isNameEditing ? (
                  <div className="mt-1 flex flex-col gap-2 xl:flex-row xl:items-start">
                    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[10rem_12rem_10rem]">
                      <input
                        id="profile-last-name"
                        name="lastName"
                        type="text"
                        value={nameForm.lastName}
                        onChange={(event) => handleNameInputChange('lastName', event.target.value)}
                        disabled={nameSaving}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Họ"
                      />
                      <input
                        id="profile-middle-name"
                        name="middleName"
                        type="text"
                        value={nameForm.middleName}
                        onChange={(event) =>
                          handleNameInputChange('middleName', event.target.value)
                        }
                        disabled={nameSaving}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Tên đệm"
                      />
                      <input
                        id="profile-first-name"
                        name="firstName"
                        type="text"
                        value={nameForm.firstName}
                        onChange={(event) =>
                          handleNameInputChange('firstName', event.target.value)
                        }
                        disabled={nameSaving}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Tên"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveUserName}
                        disabled={nameSaving}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Xác nhận"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelNameEditing}
                        disabled={nameSaving}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Hủy"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {getFullName(appUser.lastName, appUser.middleName, appUser.firstName)}
                    </p>
                    <button
                      type="button"
                      onClick={startNameEditing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600"
                      title="Thay đổi họ và tên"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Nickname</p>
                {isNicknameEditing ? (
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start">
                    <input
                      id="profile-nickname"
                      name="nickname"
                      type="text"
                      value={nicknameForm}
                      onChange={(event) => setNicknameForm(event.target.value)}
                      disabled={nicknameSaving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-60"
                      placeholder="Nickname"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveUserNickname}
                        disabled={nicknameSaving}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Xác nhận"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelNicknameEditing}
                        disabled={nicknameSaving}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Hủy"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-medium text-gray-900">{appUser.nickname || 'Chưa đặt'}</p>
                    <button
                      type="button"
                      onClick={startNicknameEditing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600"
                      title="Thay đổi Nickname"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Username</p>
                <p className="font-medium text-gray-900">@{appUser.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{appUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vai trò</p>
                <p className="font-medium text-gray-900">{USER_ROLE_LABELS[appUser.role]}</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={closePasswordModal} onSuccess={handlePasswordChangeSuccess} />
      )}

      {avatarFileToEdit && (
        <AvatarEditor
          file={avatarFileToEdit}
          onCancel={() => setAvatarFileToEdit(null)}
          onSave={saveEditedAvatar}
          saving={avatarUploading}
        />
      )}
    </div>
  );
}
