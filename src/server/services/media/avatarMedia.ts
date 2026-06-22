import 'server-only';

import {
  avatarObjectRepository,
  type AvatarObjectRepository,
} from '@/server/repositories/media/avatarObjectRepository';
import type { Actor } from '@/server/services/shared/actor';
import { getUploadLimits } from '@/server/env';
import { DomainValidationError, ForbiddenError } from '@/server/services/shared/errors';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface AvatarMediaDependencies {
  avatars: Pick<AvatarObjectRepository, 'createUploadIntent' | 'delete'>;
  maxUploadBytes: number;
}

const defaultDependencies: AvatarMediaDependencies = {
  avatars: avatarObjectRepository,
  maxUploadBytes: getUploadLimits().avatarBytes,
};

export function createAvatarMediaService(
  dependencies: AvatarMediaDependencies = defaultDependencies,
) {
  return {
    async createAvatarUploadIntent(actor: Actor, input: { contentType: string; size: number }) {
      if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
        throw new DomainValidationError('Ảnh đại diện không hợp lệ.', {
          contentType: ['Ảnh đại diện phải là JPG, PNG hoặc WebP.'],
        });
      }

      if (
        !Number.isSafeInteger(input.size) ||
        input.size <= 0 ||
        input.size > dependencies.maxUploadBytes
      ) {
        throw new DomainValidationError('Dung lượng ảnh đại diện không hợp lệ.', {
          size: [`Ảnh đại diện tối đa ${dependencies.maxUploadBytes} bytes.`],
        });
      }

      const intent = await dependencies.avatars.createUploadIntent(actor.userId, input.contentType);

      return {
        ...intent,
        maxUploadBytes: dependencies.maxUploadBytes,
      };
    },

    async deleteAvatarObject(actor: Actor, avatarKey: string) {
      if (!avatarKey.startsWith(`avatars/${actor.userId}/`)) {
        throw new ForbiddenError('Avatar key không thuộc người dùng hiện tại.');
      }

      await dependencies.avatars.delete(avatarKey);
    },
  };
}

export const { createAvatarUploadIntent, deleteAvatarObject } = createAvatarMediaService();
