import { validateAvatarFile } from '@/api/avatarUpload';
import AvatarEditor from '@/components/shared/avatar/AvatarEditor';
import Avatar from '@/components/shared/layout/Avatar';
import type { AppUser } from '@/contexts/auth';
import { Camera } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';

interface ProfileAvatarSectionProps {
  appUser: AppUser;
  onAvatarUpdate: (avatarFile: File) => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function ProfileAvatarSection({
  appUser,
  onAvatarUpdate,
  onError,
  onSuccess,
}: ProfileAvatarSectionProps) {
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFileToEdit, setAvatarFileToEdit] = useState<File | null>(null);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    onError('');
    onSuccess('');

    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);

    if (validationError) {
      onError(validationError);
      return;
    }

    setAvatarFileToEdit(file);
  }

  async function saveEditedAvatar(avatarFile: File) {
    try {
      setAvatarUploading(true);
      await onAvatarUpdate(avatarFile);
      setAvatarFileToEdit(null);
      onSuccess('Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <>
      <div className="sm:col-span-2 flex items-center gap-4">
        <label className="relative block h-20 w-20 cursor-pointer rounded-full group">
          <Avatar
            src={appUser.avatarUrl}
            size="lg"
            alt=""
            className="h-20 w-20 rounded-full border border-gray-200 object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Camera className="h-5 w-5" />
          </span>
          {avatarUploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80 text-xs font-medium text-gray-700">
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
          <p className="mt-1 text-xs text-gray-500">JPG, PNG hoặc WebP, tối đa 1 MB.</p>
        </div>
      </div>

      {avatarFileToEdit && (
        <AvatarEditor
          file={avatarFileToEdit}
          onCancel={() => setAvatarFileToEdit(null)}
          onSave={saveEditedAvatar}
          saving={avatarUploading}
        />
      )}
    </>
  );
}
