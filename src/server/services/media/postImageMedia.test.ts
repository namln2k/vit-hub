import { describe, expect, it, vi } from 'vitest';
import { createPostImageMediaService } from './postImageMedia';
import type { UserAccountRecord } from '@/server/repositories/users/userRepository';
import { DomainValidationError, ForbiddenError } from '@/server/services/shared/errors';

function createDependencies() {
  const findAccountById = vi.fn(
    async (): Promise<UserAccountRecord | null> => ({
      id: 'admin-1',
      role: 'super_admin',
      status: 'active',
    }),
  );
  const createUploadIntent = vi.fn(async () => ({
    uploadUrl: 'https://r2.example.com/upload',
    postImageKey: 'posts/admin-1/image.webp',
    postImageUrl: 'https://cdn.example.com/posts/admin-1/image.webp',
  }));
  const deleteReferences = vi.fn(async (references: unknown[]) => references.length);

  return {
    service: createPostImageMediaService({
      users: { findAccountById },
      images: { createUploadIntent, deleteReferences },
      maxUploadBytes: 2048,
    }),
    findAccountById,
    createUploadIntent,
    deleteReferences,
  };
}

describe('post image media service', () => {
  it('requires an active super-admin before managing post images', async () => {
    const dependencies = createDependencies();
    dependencies.findAccountById.mockResolvedValue({
      id: 'member-1',
      role: 'member',
      status: 'active',
    });

    await expect(
      dependencies.service.createPostImageUploadIntent(
        { userId: 'member-1' },
        { contentType: 'image/webp', size: 512 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(dependencies.createUploadIntent).not.toHaveBeenCalled();
  });

  it('validates upload limits and creates an actor-namespaced intent', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service.createPostImageUploadIntent(
        { userId: 'admin-1' },
        { contentType: 'image/webp', size: 1024 },
      ),
    ).resolves.toEqual({
      uploadUrl: 'https://r2.example.com/upload',
      postImageKey: 'posts/admin-1/image.webp',
      postImageUrl: 'https://cdn.example.com/posts/admin-1/image.webp',
      maxUploadBytes: 2048,
    });
    expect(dependencies.createUploadIntent).toHaveBeenCalledWith('admin-1', 'image/webp');

    await expect(
      dependencies.service.createPostImageUploadIntent(
        { userId: 'admin-1' },
        { contentType: 'image/svg+xml', size: 1024 },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it('authorizes before deleting post-image references', async () => {
    const dependencies = createDependencies();
    const references = [{ postImageKey: 'posts/admin-1/image.webp' }];

    await expect(
      dependencies.service.deletePostImageObjects({ userId: 'admin-1' }, references),
    ).resolves.toBe(1);
    expect(dependencies.deleteReferences).toHaveBeenCalledWith(references);
  });
});
