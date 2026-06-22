import { describe, expect, it, vi } from 'vitest';
import { createPostService } from './posts';
import type {
  PersistPostInput,
  PostRecord,
  PostRepository,
} from '@/server/repositories/posts/postRepository';
import type { UserAccountRecord } from '@/server/repositories/users/userRepository';
import type { PostWriteInput } from '@/features/posts/types';
import {
  ConflictError,
  DomainValidationError,
  ForbiddenError,
} from '@/server/services/shared/errors';

const record: PostRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Post title',
  slug: 'post-title',
  thumbnailUrl: 'https://cdn.example.com/posts/admin-1/old.webp',
  thumbnailImageKey: 'posts/admin-1/old.webp',
  status: 'draft',
  content: [
    {
      id: 'block-1',
      type: 'paragraph',
      text: 'Existing content',
    },
  ],
  createdBy: 'admin-1',
  createdAt: '2026-06-18T09:00:00.000Z',
  updatedAt: '2026-06-18T09:00:00.000Z',
  publishedAt: null,
};

const writeInput: PostWriteInput = {
  title: ' Post title ',
  slug: 'post-title',
  thumbnailUrl: 'https://cdn.example.com/posts/admin-1/new.webp',
  thumbnailImageKey: 'posts/admin-1/new.webp',
  status: 'published',
  content: [
    {
      id: 'block-2',
      type: 'paragraph',
      text: ' New content ',
    },
  ],
};

function createDependencies() {
  const findAccountById = vi.fn(
    async (): Promise<UserAccountRecord | null> => ({
      id: 'admin-1',
      role: 'super_admin',
      status: 'active',
    }),
  );
  const list = vi.fn(async () => [] as PostRecord[]);
  const findById = vi.fn(async () => record);
  const findBySlug = vi.fn(async () => null as PostRecord | null);
  const create = vi.fn(async (input: PersistPostInput & { createdBy: string }) => ({
    ...record,
    ...input,
    id: record.id,
    createdBy: input.createdBy,
  }));
  const update = vi.fn(async (_postId: string, input: PersistPostInput) => ({
    ...record,
    ...input,
  }));
  const deletePost = vi.fn(async () => record as PostRecord | null);
  const listFeaturedPostIds = vi.fn(async () => [] as string[]);
  const replaceFeaturedPostIds = vi.fn(async () => undefined);
  const deleteReferences = vi.fn(async (references: unknown[]) => references.length);
  const posts: PostRepository = {
    list,
    findById,
    findBySlug,
    create,
    update,
    delete: deletePost,
    listFeaturedPostIds,
    replaceFeaturedPostIds,
  };

  return {
    service: createPostService({
      posts,
      users: { findAccountById },
      images: { deleteReferences },
      now: () => new Date('2026-06-18T12:00:00.000Z'),
    }),
    findAccountById,
    list,
    findById,
    findBySlug,
    create,
    update,
    deletePost,
    listFeaturedPostIds,
    replaceFeaturedPostIds,
    deleteReferences,
  };
}

describe('post service', () => {
  it('returns configured published posts in configured order without author internals', async () => {
    const dependencies = createDependencies();
    const secondRecord = {
      ...record,
      id: '33333333-3333-4333-8333-333333333333',
      slug: 'second-post',
      status: 'published' as const,
    };
    dependencies.listFeaturedPostIds.mockResolvedValue([secondRecord.id, record.id]);
    dependencies.list.mockResolvedValue([{ ...record, status: 'published' }, secondRecord]);

    const posts = await dependencies.service.listHomeFeaturedPosts();

    expect(posts.map((post) => post.id)).toEqual([secondRecord.id, record.id]);
    expect(posts[0]).not.toHaveProperty('createdBy');
    expect(posts[0]).not.toHaveProperty('status');
  });

  it('requires an active super-admin for administration', async () => {
    const dependencies = createDependencies();
    dependencies.findAccountById.mockResolvedValue({
      id: 'member-1',
      role: 'member',
      status: 'active',
    });

    await expect(
      dependencies.service.getPostAdministrationData({
        userId: 'member-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(dependencies.list).not.toHaveBeenCalled();
  });

  it('creates published posts with actor attribution and cleans uploads on slug conflict', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service.createPost({ userId: 'admin-1' }, writeInput),
    ).resolves.toMatchObject({
      title: 'Post title',
      status: 'published',
      createdBy: 'admin-1',
      publishedAt: '2026-06-18T12:00:00.000Z',
    });
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'admin-1',
        publishedAt: '2026-06-18T12:00:00.000Z',
      }),
    );

    dependencies.findBySlug.mockResolvedValue(record);
    await expect(
      dependencies.service.createPost({ userId: 'admin-1' }, writeInput),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(dependencies.deleteReferences).toHaveBeenCalledWith([
      {
        url: writeInput.thumbnailUrl,
        postImageKey: writeInput.thumbnailImageKey,
      },
    ]);
  });

  it('publishes an existing draft and cleans removed image references', async () => {
    const dependencies = createDependencies();

    await dependencies.service.updatePost({ userId: 'admin-1' }, record.id, writeInput);

    expect(dependencies.update).toHaveBeenCalledWith(
      record.id,
      expect.objectContaining({
        status: 'published',
        publishedAt: '2026-06-18T12:00:00.000Z',
      }),
    );
    expect(dependencies.deleteReferences).toHaveBeenCalledWith([
      {
        url: record.thumbnailUrl,
        postImageKey: record.thumbnailImageKey,
      },
    ]);
  });

  it('deletes the database record before best-effort image cleanup', async () => {
    const dependencies = createDependencies();

    await dependencies.service.deletePost({ userId: 'admin-1' }, record.id);

    expect(dependencies.deletePost).toHaveBeenCalledWith(record.id);
    expect(dependencies.deleteReferences).toHaveBeenCalled();
    expect(dependencies.deletePost.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.deleteReferences.mock.invocationCallOrder[0],
    );
  });

  it('enforces featured uniqueness, maximum count, and published state', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service.setHomeFeaturedPosts({ userId: 'admin-1' }, [record.id, record.id]),
    ).rejects.toBeInstanceOf(DomainValidationError);
    await expect(
      dependencies.service.setHomeFeaturedPosts(
        { userId: 'admin-1' },
        Array.from(
          { length: 11 },
          (_, index) => `${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`,
        ),
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);

    dependencies.list.mockResolvedValue([]);
    await expect(
      dependencies.service.setHomeFeaturedPosts({ userId: 'admin-1' }, [record.id]),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(dependencies.replaceFeaturedPostIds).not.toHaveBeenCalled();
  });
});
