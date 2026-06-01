import type { User } from 'firebase/auth';

const MAX_AVATAR_BYTES = 1024 * 1024;
const MAX_AVATAR_DIMENSION = 512;
const STORED_AVATAR_TYPE = 'image/webp';
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface UploadedAvatar {
  avatarUrl: string;
  avatarKey: string;
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);

  try {
    return {
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
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

async function validateStoredAvatar(file: File): Promise<void> {
  if (file.type !== STORED_AVATAR_TYPE) {
    throw new Error('Ảnh đại diện phải được nén thành WebP trước khi lưu.');
  }

  const { width, height } = await getImageDimensions(file);

  if (width > MAX_AVATAR_DIMENSION || height > MAX_AVATAR_DIMENSION) {
    throw new Error('Ảnh đại diện sau khi nén phải có kích thước tối đa 512x512px.');
  }
}

export async function uploadAvatar(file: File, user: User): Promise<UploadedAvatar> {
  const validationError = validateAvatarFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  await validateStoredAvatar(file);

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

  if (!isHttpUrl(presignData.uploadUrl) || !isHttpUrl(presignData.avatarUrl)) {
    throw new Error('Máy chủ trả về URL ảnh đại diện không hợp lệ.');
  }

  if (typeof presignData.avatarKey !== 'string' || !presignData.avatarKey) {
    throw new Error('Máy chủ trả về khoá ảnh đại diện không hợp lệ.');
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
