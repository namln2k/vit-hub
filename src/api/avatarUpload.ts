import type { User } from 'firebase/auth';

const MAX_AVATAR_BYTES = 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface UploadedAvatar {
  avatarUrl: string;
  avatarKey: string;
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return 'Ảnh đại diện phải là JPG, PNG hoặc WebP.';
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return 'Ảnh đại diện tối đa 1 MB để giữ trong giới hạn miễn phí.';
  }

  return null;
}

export async function uploadAvatar(file: File, user: User): Promise<UploadedAvatar> {
  const validationError = validateAvatarFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const idToken = await user.getIdToken();
  const presignResponse = await fetch('/api/avatars/presign', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contentType: file.type,
      size: file.size,
    }),
  });
  const presignData = await presignResponse.json();

  if (!presignResponse.ok) {
    throw new Error(presignData.error ?? 'Không thể chuẩn bị upload ảnh đại diện.');
  }

  const uploadResponse = await fetch(presignData.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Không thể upload ảnh đại diện lên Cloudflare R2.');
  }

  return {
    avatarUrl: presignData.avatarUrl,
    avatarKey: presignData.avatarKey,
  };
}

export async function deleteAvatar(avatarKey: string, user: User): Promise<void> {
  if (!avatarKey) {
    return;
  }

  const idToken = await user.getIdToken();
  const response = await fetch('/api/avatars/presign', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatarKey }),
  });

  if (!response.ok) {
    throw new Error('Không thể xoá ảnh đại diện cũ khỏi Cloudflare R2.');
  }
}
