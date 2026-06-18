import type { AppUser, UpdateUserNicknameData } from '@/contexts/auth';
import { useState } from 'react';
import { ConfirmCancelActions, EditButton } from '../common/ProfileEditActions';
import { toast } from 'sonner';

interface EditableNicknameFieldProps {
  appUser: AppUser;
  onUpdate: (data: UpdateUserNicknameData) => Promise<void>;
}

export default function EditableNicknameField({ appUser, onUpdate }: EditableNicknameFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState('');

  function startEditing() {
    setNickname(appUser.nickname);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    setIsEditing(false);
  }

  async function saveUserNickname() {
    try {
      setSaving(true);
      await onUpdate({ nickname: nickname.trim() });
      setIsEditing(false);
      toast.success('Nickname đã được cập nhật.', { id: 'profile-nickname-success' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật Nickname.', {
        id: 'profile-nickname-error',
      });
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
