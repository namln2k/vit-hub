import 'server-only';

import {
  authRepository,
  AuthSignUpPersistenceError,
  type AuthRepository,
  type AuthSessionRecord,
} from '@/server/repositories/auth/authRepository';
import {
  avatarObjectRepository,
  type AvatarObjectRecord,
  type AvatarObjectRepository,
} from '@/server/repositories/media/avatarObjectRepository';
import {
  userRepository,
  UserRecordConflictError,
  type UserRepository,
} from '@/server/repositories/users/userRepository';
import {
  ConflictError,
  DomainValidationError,
  InfrastructureError,
} from '@/server/services/shared/errors';
import { getUploadLimits } from '@/server/env';

const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface RegistrationAvatarInput {
  contentType: string;
  declaredSize: number;
  bytes: Uint8Array;
}

export interface RegisterAppUserInput {
  email: string;
  emailRedirectTo: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  avatar: RegistrationAvatarInput | null;
}

export interface RegisterAppUserResult {
  needsEmailConfirmation: boolean;
  session: AuthSessionRecord | null;
}

interface RegistrationDependencies {
  auth: Pick<AuthRepository, 'deleteUser' | 'signUpWithPassword' | 'updateUserMetadata'>;
  avatars: Pick<AvatarObjectRepository, 'delete' | 'upload'>;
  users: Pick<UserRepository, 'create' | 'usernameExists'>;
  maxAvatarBytes: number;
}

const defaultDependencies: RegistrationDependencies = {
  auth: authRepository,
  avatars: avatarObjectRepository,
  users: userRepository,
  maxAvatarBytes: getUploadLimits().avatarBytes,
};

export function createRegistrationService(
  dependencies: RegistrationDependencies = defaultDependencies,
) {
  return async function registerAppUser(
    input: RegisterAppUserInput,
  ): Promise<RegisterAppUserResult> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim();
    const normalizedInput = { ...input, email, username };
    validateAvatar(input.avatar, dependencies.maxAvatarBytes);

    if (await dependencies.users.usernameExists(username)) {
      throw new ConflictError('Username đã tồn tại. Vui lòng chọn username khác.');
    }

    let authUserId = '';
    let avatar: AvatarObjectRecord | null = null;

    try {
      const authResult = await dependencies.auth.signUpWithPassword({
        email,
        password: input.password,
        emailRedirectTo: input.emailRedirectTo,
        metadata: getUserMetadata(normalizedInput, null),
      });
      authUserId = authResult.userId;

      if (input.avatar) {
        avatar = await dependencies.avatars.upload(
          authUserId,
          input.avatar.contentType,
          input.avatar.bytes,
        );
        await dependencies.auth.updateUserMetadata(
          authUserId,
          getUserMetadata(normalizedInput, avatar),
        );
      }

      await dependencies.users.create({
        id: authUserId,
        email,
        firstName: normalizedInput.firstName,
        lastName: normalizedInput.lastName,
        middleName: normalizedInput.middleName,
        nickname: normalizedInput.nickname,
        username,
        avatarUrl: avatar?.avatarUrl ?? '',
        avatarKey: avatar?.avatarKey ?? '',
      });

      return {
        needsEmailConfirmation: !authResult.session,
        session: authResult.session,
      };
    } catch (error) {
      await compensateFailedRegistration(dependencies, authUserId, avatar?.avatarKey ?? '');

      if (error instanceof AuthSignUpPersistenceError) {
        if (error.reason === 'duplicate_email') {
          throw new ConflictError(
            'Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
          );
        }

        if (error.reason === 'email_delivery') {
          throw new InfrastructureError(
            'Không thể gửi email xác nhận. Vui lòng kiểm tra cấu hình SMTP trong Supabase Auth.',
            { cause: error },
          );
        }
      }

      if (error instanceof UserRecordConflictError) {
        throw new ConflictError('Email hoặc username đã tồn tại. Vui lòng dùng thông tin khác.');
      }

      if (
        error instanceof ConflictError ||
        error instanceof DomainValidationError ||
        error instanceof InfrastructureError
      ) {
        throw error;
      }

      throw new InfrastructureError('Không thể đăng ký tài khoản.', {
        cause: error,
      });
    }
  };
}

export const registerAppUser = createRegistrationService();

function validateAvatar(avatar: RegistrationAvatarInput | null, maxAvatarBytes: number) {
  if (!avatar) {
    return;
  }

  if (!ALLOWED_AVATAR_TYPES.has(avatar.contentType)) {
    throw new DomainValidationError('Ảnh đại diện không hợp lệ.', {
      avatar: ['Ảnh đại diện phải là JPG, PNG hoặc WebP.'],
    });
  }

  if (
    !Number.isSafeInteger(avatar.declaredSize) ||
    avatar.declaredSize <= 0 ||
    avatar.declaredSize > maxAvatarBytes ||
    avatar.bytes.byteLength !== avatar.declaredSize
  ) {
    throw new DomainValidationError('Dung lượng ảnh đại diện không hợp lệ.', {
      avatar: [`Ảnh đại diện tối đa ${maxAvatarBytes} bytes.`],
    });
  }
}

function getUserMetadata(input: RegisterAppUserInput, avatar: AvatarObjectRecord | null) {
  return {
    avatar_key: avatar?.avatarKey ?? '',
    avatar_url: avatar?.avatarUrl ?? '',
    first_name: input.firstName,
    full_name: `${input.lastName} ${input.middleName} ${input.firstName}`.trim(),
    last_name: input.lastName,
    middle_name: input.middleName,
    nickname: input.nickname,
    username: input.username,
  };
}

async function compensateFailedRegistration(
  dependencies: RegistrationDependencies,
  authUserId: string,
  avatarKey: string,
) {
  const cleanupTasks: Promise<void>[] = [];

  if (avatarKey) {
    cleanupTasks.push(dependencies.avatars.delete(avatarKey));
  }

  if (authUserId) {
    cleanupTasks.push(dependencies.auth.deleteUser(authUserId));
  }

  if (cleanupTasks.length === 0) {
    return;
  }

  const results = await Promise.allSettled(cleanupTasks);
  const cleanupFailures = results.filter((result) => result.status === 'rejected');

  if (cleanupFailures.length > 0) {
    console.error('Failed to fully compensate an unsuccessful registration.', cleanupFailures);
  }
}
