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

function getGenderLabel(gender: 0 | 1 | null) {
  if (gender === 0) {
    return 'Nữ';
  }

  if (gender === 1) {
    return 'Nam';
  }

  return 'Khác';
}

export default function ProfilePage() {
  const { appUser, updateUserAvatar, updateUserName, updateUserNickname, updateUserPersonnel } =
    useAuth();
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
  const [isPersonnelEditing, setIsPersonnelEditing] = useState(false);
  const [personnelSaving, setPersonnelSaving] = useState(false);
  const [personnelError, setPersonnelError] = useState('');
  const [personnelSuccess, setPersonnelSuccess] = useState('');
  const [personnelForm, setPersonnelForm] = useState({
    phoneNumber: '',
    schoolName: '',
    cohort: '',
    enterYear: '',
    gender: '',
  });

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

  function startPersonnelEditing() {
    if (!appUser) {
      return;
    }

    setPersonnelError('');
    setPersonnelSuccess('');
    setPersonnelForm({
      phoneNumber: appUser.phoneNumber === '-' ? '' : appUser.phoneNumber,
      schoolName: appUser.schoolName,
      cohort: appUser.cohort,
      enterYear: appUser.enterYear,
      gender: appUser.gender === null ? '' : String(appUser.gender),
    });
    setIsPersonnelEditing(true);
  }

  function cancelPersonnelEditing() {
    if (personnelSaving) {
      return;
    }

    setPersonnelError('');
    setIsPersonnelEditing(false);
  }

  function handlePersonnelInputChange(field: keyof typeof personnelForm, value: string) {
    setPersonnelForm((currentPersonnelForm) => ({
      ...currentPersonnelForm,
      [field]: value,
    }));
  }

  async function saveUserPersonnel() {
    try {
      setPersonnelError('');
      setPersonnelSuccess('');
      setPersonnelSaving(true);
      await updateUserPersonnel({
        phoneNumber: personnelForm.phoneNumber.trim() || '-',
        schoolName: personnelForm.schoolName.trim(),
        cohort: personnelForm.cohort.trim(),
        enterYear: personnelForm.enterYear.trim(),
        gender: personnelForm.gender === '0' ? 0 : personnelForm.gender === '1' ? 1 : null,
      });
      setIsPersonnelEditing(false);
      setPersonnelSuccess('Thông tin nhân sự đã được cập nhật.');
    } catch (error) {
      setPersonnelError(
        error instanceof Error ? error.message : 'Không thể cập nhật thông tin nhân sự.',
      );
    } finally {
      setPersonnelSaving(false);
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

          {personnelError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {personnelError}
            </div>
          )}

          {personnelSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {personnelSuccess}
            </div>
          )}

          {appUser && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Họ và tên</p>
                {isNameEditing ? (
                  <div className="mt-1 grid max-w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-3">
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
                    <div className="flex shrink-0 gap-2">
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
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate font-medium text-gray-900">
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
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Nickname</p>
                {isNicknameEditing ? (
                  <div className="mt-1 grid max-w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <input
                      id="profile-nickname"
                      name="nickname"
                      type="text"
                      value={nicknameForm}
                      onChange={(event) => setNicknameForm(event.target.value)}
                      disabled={nicknameSaving}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Nickname"
                    />
                    <div className="flex shrink-0 gap-2">
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
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate font-medium text-gray-900">
                      {appUser.nickname || 'Chưa đặt'}
                    </p>
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
              <div className="sm:col-span-2 mt-2 flex items-center justify-between border-t border-gray-100 pt-4">
                <h3 className="text-base font-semibold text-gray-800">Thông tin nhân sự</h3>
                {!isPersonnelEditing && (
                  <button
                    type="button"
                    onClick={startPersonnelEditing}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600"
                    title="Thay đổi thông tin nhân sự"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isPersonnelEditing ? (
                <div className="sm:col-span-2 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-phone-number"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      SĐT
                    </label>
                    <input
                      id="profile-phone-number"
                      name="phoneNumber"
                      type="text"
                      value={personnelForm.phoneNumber}
                      onChange={(event) =>
                        handlePersonnelInputChange('phoneNumber', event.target.value)
                      }
                      disabled={personnelSaving}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="-"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-school-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Trường
                    </label>
                    <input
                      id="profile-school-name"
                      name="schoolName"
                      type="text"
                      value={personnelForm.schoolName}
                      onChange={(event) =>
                        handlePersonnelInputChange('schoolName', event.target.value)
                      }
                      disabled={personnelSaving}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Tên trường"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-cohort"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Khóa
                    </label>
                    <input
                      id="profile-cohort"
                      name="cohort"
                      type="text"
                      value={personnelForm.cohort}
                      onChange={(event) =>
                        handlePersonnelInputChange('cohort', event.target.value)
                      }
                      disabled={personnelSaving}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="K64"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-enter-year"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Năm vào Đội
                    </label>
                    <input
                      id="profile-enter-year"
                      name="enterYear"
                      type="text"
                      value={personnelForm.enterYear}
                      onChange={(event) =>
                        handlePersonnelInputChange('enterYear', event.target.value)
                      }
                      disabled={personnelSaving}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="2026A"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-gender"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Giới tính
                    </label>
                    <select
                      id="profile-gender"
                      name="gender"
                      value={personnelForm.gender}
                      onChange={(event) =>
                        handlePersonnelInputChange('gender', event.target.value)
                      }
                      disabled={personnelSaving}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Khác</option>
                      <option value="0">Nữ</option>
                      <option value="1">Nam</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={saveUserPersonnel}
                      disabled={personnelSaving}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {personnelSaving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelPersonnelEditing}
                      disabled={personnelSaving}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">SĐT</p>
                    <p className="font-medium text-gray-900">{appUser.phoneNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trường</p>
                    <p className="font-medium text-gray-900">{appUser.schoolName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Khóa</p>
                    <p className="font-medium text-gray-900">{appUser.cohort || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Năm vào Đội</p>
                    <p className="font-medium text-gray-900">{appUser.enterYear || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Giới tính</p>
                    <p className="font-medium text-gray-900">{getGenderLabel(appUser.gender)}</p>
                  </div>
                </>
              )}
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
