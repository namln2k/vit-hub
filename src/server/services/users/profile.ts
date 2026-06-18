import 'server-only';

import {
  userRepository,
  type UpdateUserProfileRecordInput,
  type UserRepository,
} from '@/server/repositories/users/userRepository';
import type { AuthIdentity } from '@/server/services/auth/identity';
import type { Actor } from '@/server/services/shared/actor';
import { ForbiddenError, NotFoundError } from '@/server/services/shared/errors';
import { mapUserSummary } from '@/server/services/users/searchUsers';
import type { UserSummaryDto } from '@/features/users/types';

interface UserProfileDependencies {
  users: Pick<UserRepository, 'create' | 'findById' | 'updateProfile' | 'usernameExists'>;
  now(): Date;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

const defaultDependencies: UserProfileDependencies = {
  users: userRepository,
  now: () => new Date(),
};

export function createUserProfileService(
  dependencies: UserProfileDependencies = defaultDependencies,
) {
  async function getCurrentUserProfile(identity: AuthIdentity): Promise<UserSummaryDto> {
    const existing = await dependencies.users.findById(identity.actor.userId);

    if (existing) {
      return mapUserSummary(existing);
    }

    const email = identity.email.trim().toLowerCase();

    if (!email) {
      throw new ForbiddenError('Tài khoản xác thực không có email hợp lệ.');
    }

    const name = getProvisionedName(identity.metadata, email);
    const metadataUsername = getMetadataString(identity.metadata, 'username');
    const username = USERNAME_PATTERN.test(metadataUsername)
      ? metadataUsername
      : await createUniqueUsername(email, dependencies.users);
    const metadataAvatarKey = getMetadataString(identity.metadata, 'avatar_key');
    const avatarKey = metadataAvatarKey.startsWith(`avatars/${identity.actor.userId}/`)
      ? metadataAvatarKey
      : '';
    const created = await dependencies.users.create({
      id: identity.actor.userId,
      email,
      firstName: getMetadataString(identity.metadata, 'first_name') || name.firstName,
      lastName: getMetadataString(identity.metadata, 'last_name') || name.lastName,
      middleName: getMetadataString(identity.metadata, 'middle_name') || name.middleName,
      nickname: getMetadataString(identity.metadata, 'nickname'),
      username,
      avatarUrl: getMetadataString(identity.metadata, 'avatar_url'),
      avatarKey,
    });

    return mapUserSummary(created);
  }

  async function updateCurrentUserProfile(
    actor: Actor,
    input: UpdateUserProfileRecordInput,
  ): Promise<UserSummaryDto> {
    const existing = await dependencies.users.findById(actor.userId);

    if (!existing) {
      throw new NotFoundError('hồ sơ người dùng', actor.userId);
    }

    const updated = await dependencies.users.updateProfile(
      actor.userId,
      input,
      dependencies.now().toISOString(),
    );
    return mapUserSummary(updated);
  }

  return {
    getCurrentUserProfile,
    updateCurrentUserName: (
      actor: Actor,
      input: { firstName: string; lastName: string; middleName: string },
    ) => updateCurrentUserProfile(actor, input),
    updateCurrentUserNickname: (actor: Actor, input: { nickname: string }) =>
      updateCurrentUserProfile(actor, input),
    updateCurrentUserPersonnelInfo: (
      actor: Actor,
      input: {
        phoneNumber: string;
        schoolName: string;
        cohort: string;
        enterYear: string;
        gender: 0 | 1 | null;
      },
    ) => updateCurrentUserProfile(actor, input),
    setCurrentUserAvatar: (actor: Actor, input: { avatarUrl: string; avatarKey: string }) => {
      if (!input.avatarKey.startsWith(`avatars/${actor.userId}/`)) {
        throw new ForbiddenError('Avatar key không thuộc người dùng hiện tại.');
      }

      return updateCurrentUserProfile(actor, input);
    },
    removeCurrentUserAvatar: (actor: Actor) =>
      updateCurrentUserProfile(actor, { avatarUrl: '', avatarKey: '' }),
  };
}

export const {
  getCurrentUserProfile,
  removeCurrentUserAvatar,
  setCurrentUserAvatar,
  updateCurrentUserName,
  updateCurrentUserNickname,
  updateCurrentUserPersonnelInfo,
} = createUserProfileService();

async function createUniqueUsername(email: string, users: Pick<UserRepository, 'usernameExists'>) {
  const fallback = `user${Date.now().toString(36)}`;
  const emailPrefix = email.split('@')[0] ?? '';
  const normalized = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  const base = normalized.length >= 3 ? normalized : fallback.slice(0, 20);

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const suffixText = suffix === 0 ? '' : String(suffix);
    const candidate = `${base.slice(0, 20 - suffixText.length)}${suffixText}`;

    if (!(await users.usernameExists(candidate))) {
      return candidate;
    }
  }

  throw new ForbiddenError('Không thể tạo username duy nhất cho tài khoản.');
}

function getProvisionedName(metadata: Record<string, unknown>, email: string) {
  const displayName =
    getMetadataString(metadata, 'full_name') || getMetadataString(metadata, 'name');
  const nameParts = displayName.trim().split(/\s+/).filter(Boolean);

  if (nameParts.length === 0) {
    return {
      firstName: email.split('@')[0] || 'User',
      middleName: '',
      lastName: '',
    };
  }

  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      middleName: '',
      lastName: '',
    };
  }

  return {
    firstName: nameParts[nameParts.length - 1],
    middleName: nameParts.slice(1, -1).join(' '),
    lastName: nameParts[0],
  };
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}
