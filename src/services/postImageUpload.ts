import { createPostImageUploadIntentAction, deletePostImageObjectsAction } from '@/actions/media';

const MAX_SELECTED_POST_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_POST_IMAGE_DIMENSION = 1600;
const COMPRESSED_POST_IMAGE_TYPE = 'image/webp';
const COMPRESSED_POST_IMAGE_QUALITY = 0.82;
const ALLOWED_POST_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface UploadedPostImage {
  postImageUrl: string;
  postImageKey: string;
}

export interface PostImageReference {
  url?: string;
  postImageKey?: string;
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

export function validatePostImageFile(file: File): string | null {
  if (!ALLOWED_POST_IMAGE_TYPES.has(file.type)) {
    return 'Ảnh bài viết phải là JPG, PNG hoặc WebP.';
  }

  if (file.size > MAX_SELECTED_POST_IMAGE_BYTES) {
    return 'Ảnh bài viết tối đa 10 MB trước khi nén.';
  }

  return null;
}

function getCompressedPostImageName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'post-image';
  return `${baseName}.webp`;
}

async function compressPostImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_POST_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Trình duyệt không hỗ trợ nén ảnh bài viết.');
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, COMPRESSED_POST_IMAGE_TYPE, COMPRESSED_POST_IMAGE_QUALITY);
    });

    if (!blob) {
      throw new Error('Không thể nén ảnh bài viết.');
    }

    return new File([blob], getCompressedPostImageName(file.name), {
      type: COMPRESSED_POST_IMAGE_TYPE,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export async function uploadPostImage(file: File): Promise<UploadedPostImage> {
  const validationError = validatePostImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const uploadFile = await compressPostImage(file);

  if (uploadFile.size > MAX_POST_IMAGE_BYTES) {
    throw new Error('Ảnh bài viết sau khi nén vẫn vượt quá 5 MB. Hãy chọn ảnh nhỏ hơn.');
  }

  const result = await createPostImageUploadIntentAction({
    contentType: uploadFile.type,
    size: uploadFile.size,
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  if (!isHttpUrl(result.data.uploadUrl) || !isHttpUrl(result.data.postImageUrl)) {
    throw new Error('Máy chủ trả về URL ảnh bài viết không hợp lệ.');
  }

  if (!result.data.postImageKey) {
    throw new Error('Máy chủ trả về khoá ảnh bài viết không hợp lệ.');
  }

  const uploadResponse = await fetch(result.data.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': uploadFile.type,
    },
    body: uploadFile,
  });

  if (!uploadResponse.ok) {
    throw new Error('Không thể upload ảnh bài viết lên Cloudflare R2.');
  }

  return {
    postImageUrl: result.data.postImageUrl,
    postImageKey: result.data.postImageKey,
  };
}

export async function deletePostImages(images: PostImageReference[]): Promise<void> {
  if (images.length === 0) {
    return;
  }

  const result = await deletePostImageObjectsAction({ images });

  if (!result.ok) {
    throw new Error(result.error.message);
  }
}
