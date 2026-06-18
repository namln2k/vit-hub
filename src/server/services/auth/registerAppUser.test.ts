import { describe, expect, it, vi } from 'vitest';
import { createRegistrationService, type RegisterAppUserInput } from './registerAppUser';
import { AuthSignUpPersistenceError } from '@/server/repositories/auth/authRepository';
import { ConflictError, DomainValidationError } from '@/server/services/shared/errors';

const input: RegisterAppUserInput = {
  email: ' Member@Example.com ',
  emailRedirectTo: 'https://app.example.com/login',
  password: 'password123',
  firstName: 'An',
  lastName: 'Nguyen',
  middleName: 'Van',
  nickname: '',
  username: ' member_one ',
  avatar: null,
};

function createDependencies() {
  const signUpWithPassword = vi.fn(async () => ({
    userId: 'auth-user-1',
    session: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    },
  }));
  const updateUserMetadata = vi.fn(async () => undefined);
  const deleteUser = vi.fn(async () => undefined);
  const upload = vi.fn(async () => ({
    avatarKey: 'avatars/auth-user-1/avatar.webp',
    avatarUrl: 'https://cdn.example.com/avatars/auth-user-1/avatar.webp',
  }));
  const deleteAvatar = vi.fn(async () => undefined);
  const usernameExists = vi.fn(async () => false);
  const create = vi.fn(async () => ({
    id: 'auth-user-1',
    email: 'member@example.com',
    firstName: 'An',
    lastName: 'Nguyen',
    middleName: 'Van',
    nickname: '',
    username: 'member_one',
    phoneNumber: '-',
    schoolName: '',
    enterYear: '',
    cohort: '',
    gender: null,
    avatarUrl: null,
    avatarKey: null,
    role: 'member' as const,
    status: 'active' as const,
  }));

  return {
    service: createRegistrationService({
      auth: { signUpWithPassword, updateUserMetadata, deleteUser },
      avatars: { upload, delete: deleteAvatar },
      users: { usernameExists, create },
      maxAvatarBytes: 1024,
    }),
    signUpWithPassword,
    updateUserMetadata,
    deleteUser,
    upload,
    deleteAvatar,
    usernameExists,
    create,
  };
}

describe('registerAppUser', () => {
  it('creates the application profile for the Auth identity returned by Supabase', async () => {
    const dependencies = createDependencies();

    await expect(dependencies.service(input)).resolves.toEqual({
      needsEmailConfirmation: false,
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    expect(dependencies.signUpWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'member@example.com',
        metadata: expect.not.objectContaining({ role: expect.anything() }),
      }),
    );
    expect(dependencies.create).toHaveBeenCalledWith({
      id: 'auth-user-1',
      email: 'member@example.com',
      firstName: 'An',
      lastName: 'Nguyen',
      middleName: 'Van',
      nickname: '',
      username: 'member_one',
      avatarUrl: '',
      avatarKey: '',
    });
  });

  it('rejects duplicate usernames before creating an Auth identity', async () => {
    const dependencies = createDependencies();
    dependencies.usernameExists.mockResolvedValue(true);

    await expect(dependencies.service(input)).rejects.toBeInstanceOf(ConflictError);
    expect(dependencies.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('maps duplicate Supabase Auth identities to an email conflict', async () => {
    const dependencies = createDependencies();
    dependencies.signUpWithPassword.mockRejectedValue(
      new AuthSignUpPersistenceError('duplicate_email', 'User already registered'),
    );

    await expect(dependencies.service(input)).rejects.toMatchObject({
      code: 'CONFLICT',
      message: 'Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
    });
    expect(dependencies.deleteUser).not.toHaveBeenCalled();
  });

  it('validates actual avatar bytes before creating an Auth identity', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service({
        ...input,
        avatar: {
          contentType: 'image/webp',
          declaredSize: 10,
          bytes: new Uint8Array([1, 2]),
        },
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(dependencies.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('uploads avatar metadata and persists the namespaced object key', async () => {
    const dependencies = createDependencies();
    const avatarBytes = new Uint8Array([1, 2, 3]);

    await dependencies.service({
      ...input,
      avatar: {
        contentType: 'image/webp',
        declaredSize: avatarBytes.byteLength,
        bytes: avatarBytes,
      },
    });

    expect(dependencies.upload).toHaveBeenCalledWith('auth-user-1', 'image/webp', avatarBytes);
    expect(dependencies.updateUserMetadata).toHaveBeenCalledWith(
      'auth-user-1',
      expect.objectContaining({
        avatar_key: 'avatars/auth-user-1/avatar.webp',
        avatar_url: 'https://cdn.example.com/avatars/auth-user-1/avatar.webp',
      }),
    );
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarKey: 'avatars/auth-user-1/avatar.webp',
      }),
    );
  });

  it('removes the uploaded object and Auth identity when profile persistence fails', async () => {
    const dependencies = createDependencies();
    const avatarBytes = new Uint8Array([1, 2, 3]);
    dependencies.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      dependencies.service({
        ...input,
        avatar: {
          contentType: 'image/webp',
          declaredSize: avatarBytes.byteLength,
          bytes: avatarBytes,
        },
      }),
    ).rejects.toMatchObject({ code: 'INFRASTRUCTURE' });
    expect(dependencies.deleteAvatar).toHaveBeenCalledWith('avatars/auth-user-1/avatar.webp');
    expect(dependencies.deleteUser).toHaveBeenCalledWith('auth-user-1');
  });
});
