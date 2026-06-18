import 'server-only';

import { randomUUID } from 'node:crypto';
import { getRequiredR2Config } from '@/server/env';
import {
  createPresignedPutUrl,
  createSignedR2Request,
  getExtension,
  getPublicBaseUrl,
} from '@/server/r2';
import { InfrastructureError } from '@/server/services/shared/errors';

export interface AvatarObjectRecord {
  avatarKey: string;
  avatarUrl: string;
}

export interface AvatarUploadIntentRecord extends AvatarObjectRecord {
  uploadUrl: string;
}

export interface AvatarObjectRepository {
  createUploadIntent(userId: string, contentType: string): Promise<AvatarUploadIntentRecord>;
  upload(userId: string, contentType: string, bytes: Uint8Array): Promise<AvatarObjectRecord>;
  delete(avatarKey: string): Promise<void>;
}

async function createAvatarUploadIntentRecord(
  userId: string,
  contentType: string,
): Promise<AvatarUploadIntentRecord> {
  try {
    const r2 = getRequiredR2Config();
    const avatarKey = createAvatarKey(userId, contentType);

    return {
      uploadUrl: createPresignedPutUrl({
        bucketName: r2.bucketName,
        accountId: r2.accountId,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        key: avatarKey,
      }),
      avatarKey,
      avatarUrl: `${getPublicBaseUrl()}/${avatarKey}`,
    };
  } catch (error) {
    throw new InfrastructureError('Không thể chuẩn bị upload ảnh đại diện.', {
      cause: error,
    });
  }
}

export const avatarObjectRepository: AvatarObjectRepository = {
  async createUploadIntent(userId, contentType) {
    return createAvatarUploadIntentRecord(userId, contentType);
  },

  async upload(userId, contentType, bytes) {
    try {
      const intent = await createAvatarUploadIntentRecord(userId, contentType);
      const response = await fetch(intent.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: new Uint8Array(bytes),
      });

      if (!response.ok) {
        throw new Error('R2 rejected the avatar upload.');
      }

      return {
        avatarKey: intent.avatarKey,
        avatarUrl: intent.avatarUrl,
      };
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError('Không thể upload ảnh đại diện.', {
        cause: error,
      });
    }
  },

  async delete(avatarKey) {
    try {
      const r2 = getRequiredR2Config();
      const request = createSignedR2Request({
        method: 'DELETE',
        bucketName: r2.bucketName,
        accountId: r2.accountId,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        key: avatarKey,
      });
      const response = await fetch(request.url, {
        method: 'DELETE',
        headers: request.headers,
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('R2 rejected the avatar deletion.');
      }
    } catch (error) {
      throw new InfrastructureError('Không thể xoá ảnh đại diện khỏi R2.', {
        cause: error,
      });
    }
  },
};

function createAvatarKey(userId: string, contentType: string) {
  return `avatars/${userId}/${randomUUID()}.${getExtension(contentType)}`;
}
