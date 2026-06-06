import { useEffect, useState, type ChangeEvent } from 'react';
import { validateAvatarFile } from '@/services/avatarUpload';
import { toast } from 'sonner';

export function useRegisterAvatar() {
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [avatarFileToEdit, setAvatarFileToEdit] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');

  useEffect(() => {
    if (!avatarFile) {
      return;
    }

    let isActive = true;
    const reader = new FileReader();

    reader.onload = () => {
      if (isActive && typeof reader.result === 'string') {
        setAvatarPreviewUrl(reader.result);
      }
    };
    reader.onerror = () => {
      if (isActive) {
        toast.error('Không thể đọc ảnh đã chọn.', { id: 'register-avatar-error' });
      }
    };
    reader.readAsDataURL(avatarFile);

    return () => {
      isActive = false;
      reader.abort();
    };
  }, [avatarFile]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const validationError = validateAvatarFile(file);

    if (validationError) {
      toast.error(validationError, { id: 'register-avatar-error' });
      return;
    }

    setAvatarFileToEdit(file);
  }

  function removeAvatar() {
    setAvatarFile(undefined);
    setAvatarFileToEdit(null);
    setAvatarPreviewUrl('');
  }

  function saveEditedAvatar(editedAvatar: File) {
    setAvatarFile(editedAvatar);
    setAvatarFileToEdit(null);
    setAvatarPreviewUrl('');
  }

  return {
    avatarFile,
    avatarFileToEdit,
    avatarPreviewUrl,
    cancelAvatarEdit: () => setAvatarFileToEdit(null),
    handleAvatarChange,
    removeAvatar,
    saveEditedAvatar,
  };
}
