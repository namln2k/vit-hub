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

export interface PostImageReferenceRecord {
  postImageKey?: string;
  url?: string;
}

export interface PostImageUploadIntentRecord {
  uploadUrl: string;
  postImageKey: string;
  postImageUrl: string;
}

export interface PostImageObjectRepository {
  createUploadIntent(userId: string, contentType: string): Promise<PostImageUploadIntentRecord>;
  deleteReferences(references: PostImageReferenceRecord[]): Promise<number>;
}

export const postImageObjectRepository: PostImageObjectRepository = {
  async createUploadIntent(userId, contentType) {
    try {
      const r2 = getRequiredR2Config();
      const postImageKey = `posts/${userId}/${randomUUID()}.${getExtension(contentType)}`;

      return {
        uploadUrl: createPresignedPutUrl({
          bucketName: r2.bucketName,
          accountId: r2.accountId,
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
          key: postImageKey,
        }),
        postImageKey,
        postImageUrl: `${getPublicBaseUrl()}/${postImageKey}`,
      };
    } catch (error) {
      throw new InfrastructureError('Không thể chuẩn bị upload ảnh bài viết.', {
        cause: error,
      });
    }
  },

  async deleteReferences(references) {
    try {
      const keys = resolvePostImageKeys(references);

      if (keys.length === 0) {
        return 0;
      }

      const r2 = getRequiredR2Config();
      const results = await Promise.all(
        keys.map(async (key) => {
          const request = createSignedR2Request({
            method: 'DELETE',
            bucketName: r2.bucketName,
            accountId: r2.accountId,
            accessKeyId: r2.accessKeyId,
            secretAccessKey: r2.secretAccessKey,
            key,
          });
          const response = await fetch(request.url, {
            method: 'DELETE',
            headers: request.headers,
          });

          return response.ok || response.status === 404;
        }),
      );

      if (results.some((result) => !result)) {
        throw new Error('R2 rejected one or more post-image deletions.');
      }

      return keys.length;
    } catch (error) {
      throw new InfrastructureError('Không thể xoá ảnh bài viết khỏi R2.', {
        cause: error,
      });
    }
  },
};

function resolvePostImageKeys(references: PostImageReferenceRecord[]) {
  return [
    ...new Set(
      references
        .map((reference) => {
          const explicitKey = reference.postImageKey?.trim() ?? '';

          if (explicitKey.startsWith('posts/')) {
            return explicitKey;
          }

          return getPostImageKeyFromUrl(reference.url);
        })
        .filter(Boolean),
    ),
  ];
}

function getPostImageKeyFromUrl(imageUrl: string | undefined) {
  if (!imageUrl) {
    return '';
  }

  try {
    const publicBaseUrl = new URL(getPublicBaseUrl());
    const url = new URL(imageUrl);

    if (url.origin !== publicBaseUrl.origin) {
      return '';
    }

    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    return key.startsWith('posts/') ? key : '';
  } catch {
    return '';
  }
}
