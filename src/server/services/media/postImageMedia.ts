import 'server-only';

import {
  postImageObjectRepository,
  type PostImageObjectRepository,
  type PostImageReferenceRecord,
} from '@/server/repositories/media/postImageObjectRepository';
import { userRepository, type UserRepository } from '@/server/repositories/users/userRepository';
import type { Actor } from '@/server/services/shared/actor';
import { getUploadLimits } from '@/server/env';
import { DomainValidationError, ForbiddenError } from '@/server/services/shared/errors';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface PostImageMediaDependencies {
  images: PostImageObjectRepository;
  users: Pick<UserRepository, 'findAccountById'>;
  maxUploadBytes: number;
}

const defaultDependencies: PostImageMediaDependencies = {
  images: postImageObjectRepository,
  users: userRepository,
  maxUploadBytes: getUploadLimits().postImageBytes,
};

export function createPostImageMediaService(
  dependencies: PostImageMediaDependencies = defaultDependencies,
) {
  async function requirePostImageManager(actor: Actor) {
    const account = await dependencies.users.findAccountById(actor.userId);

    if (!account || account.status !== 'active' || account.role !== 'super_admin') {
      throw new ForbiddenError('Chỉ super admin mới có thể quản lý ảnh bài viết.');
    }
  }

  return {
    async createPostImageUploadIntent(actor: Actor, input: { contentType: string; size: number }) {
      await requirePostImageManager(actor);

      if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
        throw new DomainValidationError('Ảnh bài viết không hợp lệ.', {
          contentType: ['Ảnh bài viết phải là JPG, PNG hoặc WebP.'],
        });
      }

      if (
        !Number.isSafeInteger(input.size) ||
        input.size <= 0 ||
        input.size > dependencies.maxUploadBytes
      ) {
        throw new DomainValidationError('Dung lượng ảnh bài viết không hợp lệ.', {
          size: [`Ảnh bài viết tối đa ${dependencies.maxUploadBytes} bytes.`],
        });
      }

      const intent = await dependencies.images.createUploadIntent(actor.userId, input.contentType);

      return {
        ...intent,
        maxUploadBytes: dependencies.maxUploadBytes,
      };
    },

    async deletePostImageObjects(actor: Actor, references: PostImageReferenceRecord[]) {
      await requirePostImageManager(actor);
      return dependencies.images.deleteReferences(references);
    },
  };
}

export const { createPostImageUploadIntent, deletePostImageObjects } =
  createPostImageMediaService();
