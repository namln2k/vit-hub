import { ImagePlus, X } from 'lucide-react';
import AvatarEditor from '@/shared/avatar/AvatarEditor';
import type { ChangeEvent } from 'react';

interface RegisterAvatarFieldProps {
  avatarFile?: File;
  avatarFileToEdit: File | null;
  avatarPreviewUrl: string;
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAvatarEditCancel: () => void;
  onAvatarRemove: () => void;
  onAvatarSave: (file: File) => void;
}

export default function RegisterAvatarField({
  avatarFile,
  avatarFileToEdit,
  avatarPreviewUrl,
  onAvatarChange,
  onAvatarEditCancel,
  onAvatarRemove,
  onAvatarSave,
}: RegisterAvatarFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Ảnh đại diện <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
      </label>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
          {avatarPreviewUrl ? (
            <img
              src={avatarPreviewUrl}
              alt="Ảnh đại diện đã chọn"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImagePlus className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              Chọn ảnh
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onAvatarChange}
                className="sr-only"
              />
            </label>
            {avatarFile && (
              <button
                type="button"
                onClick={onAvatarRemove}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-200 cursor-pointer"
                title="Xoá ảnh đã chọn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG hoặc WebP, tối đa 1 MB.</p>
        </div>
      </div>

      {avatarFileToEdit && (
        <AvatarEditor file={avatarFileToEdit} onCancel={onAvatarEditCancel} onSave={onAvatarSave} />
      )}
    </div>
  );
}
