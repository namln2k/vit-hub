import { describe, expect, it, vi } from 'vitest';
import { createAvatarMediaService } from './avatarMedia';
import { DomainValidationError, ForbiddenError } from '@/server/services/shared/errors';

function createDependencies() {
  const createUploadIntent = vi.fn(async () => ({
    uploadUrl: 'https://r2.example.com/upload',
    avatarKey: 'avatars/user-1/avatar.webp',
    avatarUrl: 'https://cdn.example.com/avatars/user-1/avatar.webp',
  }));
  const deleteAvatar = vi.fn(async () => undefined);

  return {
    service: createAvatarMediaService({
      avatars: { createUploadIntent, delete: deleteAvatar },
      maxUploadBytes: 1024,
    }),
    createUploadIntent,
    deleteAvatar,
  };
}

describe('avatar media service', () => {
  it('creates an actor-namespaced upload intent after server validation', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service.createAvatarUploadIntent(
        { userId: 'user-1' },
        { contentType: 'image/webp', size: 512 },
      ),
    ).resolves.toEqual({
      uploadUrl: 'https://r2.example.com/upload',
      avatarKey: 'avatars/user-1/avatar.webp',
      avatarUrl: 'https://cdn.example.com/avatars/user-1/avatar.webp',
      maxUploadBytes: 1024,
    });
    expect(dependencies.createUploadIntent).toHaveBeenCalledWith('user-1', 'image/webp');
  });

  it('rejects invalid MIME types and oversized uploads before presigning', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service.createAvatarUploadIntent(
        { userId: 'user-1' },
        { contentType: 'image/svg+xml', size: 512 },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    await expect(
      dependencies.service.createAvatarUploadIntent(
        { userId: 'user-1' },
        { contentType: 'image/webp', size: 1025 },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(dependencies.createUploadIntent).not.toHaveBeenCalled();
  });

  it('deletes only objects in the actor avatar namespace', async () => {
    const dependencies = createDependencies();

    await dependencies.service.deleteAvatarObject({ userId: 'user-1' }, 'avatars/user-1/old.webp');
    expect(dependencies.deleteAvatar).toHaveBeenCalledWith('avatars/user-1/old.webp');

    await expect(
      dependencies.service.deleteAvatarObject({ userId: 'user-1' }, 'avatars/user-2/old.webp'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
