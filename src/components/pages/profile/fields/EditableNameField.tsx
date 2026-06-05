import type { AppUser, UpdateUserNameData } from '@/contexts/auth';
import { useState } from 'react';
import { ConfirmCancelActions, EditButton } from '../common/ProfileEditActions';
import { getFullName } from '../common/profileUtils';
import { toast } from 'sonner';

interface EditableNameFieldProps {
  appUser: AppUser;
  onUpdate: (data: UpdateUserNameData) => Promise<void>;
}

export default function EditableNameField({
  appUser,
  onUpdate,
}: EditableNameFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    lastName: '',
    middleName: '',
    firstName: '',
  });

  function startEditing() {
    setForm({
      lastName: appUser.lastName,
      middleName: appUser.middleName,
      firstName: appUser.firstName,
    });
    setIsEditing(true);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    setIsEditing(false);
  }

  function handleInputChange(field: keyof typeof form, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveUserName() {
    const nextName = {
      lastName: form.lastName.trim(),
      middleName: form.middleName.trim(),
      firstName: form.firstName.trim(),
    };

    if (!nextName.lastName || !nextName.firstName) {
      toast.error('Họ và Tên không được để trống.', { id: 'profile-name-error' });
      return;
    }

    try {
      setSaving(true);
      await onUpdate(nextName);
      setIsEditing(false);
      toast.success('Họ và tên đã được cập nhật.', { id: 'profile-name-success' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật họ và tên.', {
        id: 'profile-name-error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-500">Họ và tên</p>
      {isEditing ? (
        <div className="mt-1 grid max-w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-3">
            <input
              id="profile-last-name"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={(event) => handleInputChange('lastName', event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Họ"
            />
            <input
              id="profile-middle-name"
              name="middleName"
              type="text"
              value={form.middleName}
              onChange={(event) => handleInputChange('middleName', event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Tên đệm"
            />
            <input
              id="profile-first-name"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={(event) => handleInputChange('firstName', event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Tên"
            />
          </div>
          <ConfirmCancelActions saving={saving} onSave={saveUserName} onCancel={cancelEditing} />
        </div>
      ) : (
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate font-medium text-gray-900">
            {getFullName(appUser.lastName, appUser.middleName, appUser.firstName)}
          </p>
          <EditButton label="Thay đổi họ và tên" onClick={startEditing} />
        </div>
      )}
    </div>
  );
}
