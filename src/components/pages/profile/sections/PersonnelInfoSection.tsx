import type { AppUser, UpdateUserPersonnelData } from '@/contexts/auth';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { EditButton } from '../common/ProfileEditActions';
import ProfileField from '../common/ProfileField';
import { getGenderLabel } from '../common/profileUtils';

interface PersonnelInfoSectionProps {
  appUser: AppUser;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onUpdate: (data: UpdateUserPersonnelData) => Promise<void>;
}

export default function PersonnelInfoSection({
  appUser,
  onError,
  onSuccess,
  onUpdate,
}: PersonnelInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: '',
    schoolName: '',
    cohort: '',
    enterYear: '',
    gender: '',
  });

  function startEditing() {
    onError('');
    onSuccess('');
    setForm({
      phoneNumber: appUser.phoneNumber === '-' ? '' : appUser.phoneNumber,
      schoolName: appUser.schoolName,
      cohort: appUser.cohort,
      enterYear: appUser.enterYear,
      gender: appUser.gender === null ? '' : String(appUser.gender),
    });
    setIsEditing(true);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    onError('');
    setIsEditing(false);
  }

  function handleInputChange(field: keyof typeof form, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveUserPersonnel() {
    try {
      onError('');
      onSuccess('');
      setSaving(true);
      await onUpdate({
        phoneNumber: form.phoneNumber.trim() || '-',
        schoolName: form.schoolName.trim(),
        cohort: form.cohort.trim(),
        enterYear: form.enterYear.trim(),
        gender: form.gender === '0' ? 0 : form.gender === '1' ? 1 : null,
      });
      setIsEditing(false);
      onSuccess('Thông tin nhân sự đã được cập nhật.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể cập nhật thông tin nhân sự.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sm:col-span-2 mt-2 flex items-center justify-between border-t border-gray-100 pt-4">
        <h3 className="text-base font-semibold text-gray-800">Thông tin nhân sự</h3>
        {!isEditing && <EditButton label="Thay đổi thông tin nhân sự" onClick={startEditing} />}
      </div>

      {isEditing ? (
        <div className="sm:col-span-2 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <ProfileTextInput
            id="profile-phone-number"
            label="SĐT"
            name="phoneNumber"
            placeholder="-"
            value={form.phoneNumber}
            disabled={saving}
            onChange={(value) => handleInputChange('phoneNumber', value)}
          />
          <ProfileTextInput
            id="profile-school-name"
            label="Trường"
            name="schoolName"
            placeholder="Tên trường"
            value={form.schoolName}
            disabled={saving}
            onChange={(value) => handleInputChange('schoolName', value)}
          />
          <ProfileTextInput
            id="profile-cohort"
            label="Khóa"
            name="cohort"
            placeholder="K64"
            value={form.cohort}
            disabled={saving}
            onChange={(value) => handleInputChange('cohort', value)}
          />
          <ProfileTextInput
            id="profile-enter-year"
            label="Năm vào Đội"
            name="enterYear"
            placeholder="2026A"
            value={form.enterYear}
            disabled={saving}
            onChange={(value) => handleInputChange('enterYear', value)}
          />
          <div>
            <label
              htmlFor="profile-gender"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Giới tính
            </label>
            <select
              id="profile-gender"
              name="gender"
              value={form.gender}
              onChange={(event) => handleInputChange('gender', event.target.value)}
              disabled={saving}
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
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Hủy
            </button>
          </div>
        </div>
      ) : (
        <>
          <ProfileField label="SĐT" value={appUser.phoneNumber} />
          <ProfileField label="Trường" value={appUser.schoolName} />
          <ProfileField label="Khóa" value={appUser.cohort} />
          <ProfileField label="Năm vào Đội" value={appUser.enterYear} />
          <ProfileField label="Giới tính" value={getGenderLabel(appUser.gender)} />
        </>
      )}
    </>
  );
}

interface ProfileTextInputProps {
  disabled: boolean;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

function ProfileTextInput({
  disabled,
  id,
  label,
  name,
  onChange,
  placeholder,
  value,
}: ProfileTextInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder={placeholder}
      />
    </div>
  );
}
