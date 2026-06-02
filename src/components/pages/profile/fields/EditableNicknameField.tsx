import type { AppUser, UpdateUserNicknameData } from '@/contexts/auth';
import { useState } from 'react';
import { ConfirmCancelActions, EditButton } from '../common/ProfileEditActions';

interface EditableNicknameFieldProps {
  appUser: AppUser;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onUpdate: (data: UpdateUserNicknameData) => Promise<void>;
}

export default function EditableNicknameField({
  appUser,
  onError,
  onSuccess,
  onUpdate,
}: EditableNicknameFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState('');

  function startEditing() {
    onError('');
    onSuccess('');
    setNickname(appUser.nickname);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    onError('');
    setIsEditing(false);
  }

  async function saveUserNickname() {
    try {
      onError('');
      onSuccess('');
      setSaving(true);
      await onUpdate({ nickname: nickname.trim() });
      setIsEditing(false);
      onSuccess('Nickname đã được cập nhật.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể cập nhật Nickname.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-500">Nickname</p>
      {isEditing ? (
        <div className="mt-1 grid max-w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <input
            id="profile-nickname"
            name="nickname"
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Nickname"
          />
          <ConfirmCancelActions
            saving={saving}
            onSave={saveUserNickname}
            onCancel={cancelEditing}
          />
        </div>
      ) : (
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate font-medium text-gray-900">
            {appUser.nickname || 'Chưa đặt'}
          </p>
          <EditButton label="Thay đổi Nickname" onClick={startEditing} />
        </div>
      )}
    </div>
  );
}
