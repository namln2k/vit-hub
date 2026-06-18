import 'server-only';

import {
  postImageObjectRepository,
  type PostImageObjectRepository,
} from '@/server/repositories/media/postImageObjectRepository';
import {
  postRepository,
  PostRecordConflictError,
  type PersistPostInput,
  type PostRecord,
  type PostRepository,
} from '@/server/repositories/posts/postRepository';
import { userRepository, type UserRepository } from '@/server/repositories/users/userRepository';
import {
  getAddedPostImageReferences,
  getPostWriteImageReferences,
  getRemovedPostImageReferences,
  parsePostContent,
  sanitizePostWrite,
} from '@/features/posts/lib/content';
import type {
  PostAdministrationDataDto,
  PostDto,
  PostWriteInput,
  PublicPostDto,
} from '@/features/posts/types';
import type { Actor } from '@/server/services/shared/actor';
import {
  ConflictError,
  DomainValidationError,
  ForbiddenError,
  InfrastructureError,
  NotFoundError,
} from '@/server/services/shared/errors';

const MAX_FEATURED_POSTS = 10;

interface PostServiceDependencies {
  images: Pick<PostImageObjectRepository, 'deleteReferences'>;
  posts: PostRepository;
  users: Pick<UserRepository, 'findAccountById'>;
  now(): Date;
}

const defaultDependencies: PostServiceDependencies = {
  images: postImageObjectRepository,
  posts: postRepository,
  users: userRepository,
  now: () => new Date(),
};

export function createPostService(dependencies: PostServiceDependencies = defaultDependencies) {
  async function requirePostManager(actor: Actor) {
    const account = await dependencies.users.findAccountById(actor.userId);

    if (!account || account.status !== 'active' || account.role !== 'super_admin') {
      throw new ForbiddenError('Bạn không có quyền quản lý bài viết.');
    }
  }

  async function listHomeFeaturedPosts(limit = MAX_FEATURED_POSTS): Promise<PublicPostDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), MAX_FEATURED_POSTS);
    const configuredPostIds = await dependencies.posts.listFeaturedPostIds();

    if (configuredPostIds.length === 0) {
      return (
        await dependencies.posts.list({
          status: 'published',
          limit: safeLimit,
        })
      ).map(mapPublicPost);
    }

    const posts = await dependencies.posts.list({
      status: 'published',
      ids: configuredPostIds,
    });
    const postById = new Map(posts.map((post) => [post.id, post]));

    return configuredPostIds
      .map((postId) => postById.get(postId))
      .filter((post): post is PostRecord => Boolean(post))
      .slice(0, safeLimit)
      .map(mapPublicPost);
  }

  async function getPublishedPostBySlug(slug: string): Promise<PublicPostDto | null> {
    const post = await dependencies.posts.findBySlug(slug, 'published');
    return post ? mapPublicPost(post) : null;
  }

  async function getPostAdministrationData(actor: Actor): Promise<PostAdministrationDataDto> {
    await requirePostManager(actor);
    const [posts, publishedPosts, featuredPostIds] = await Promise.all([
      dependencies.posts.list(),
      dependencies.posts.list({ status: 'published' }),
      dependencies.posts.listFeaturedPostIds(),
    ]);

    return {
      posts: posts.map(mapPost),
      publishedPosts: publishedPosts.map(mapPost),
      featuredPostIds,
    };
  }

  async function createPost(actor: Actor, rawInput: PostWriteInput) {
    await requirePostManager(actor);
    let input = rawInput;

    try {
      input = validatePostWrite(rawInput);
      await requireUniqueSlug(input.slug);
      const now = dependencies.now().toISOString();
      const created = await dependencies.posts.create({
        ...toPersistPostInput(input, now, null),
        createdBy: actor.userId,
      });
      return mapPost(created);
    } catch (error) {
      await cleanupImages(getPostWriteImageReferences(input));
      throw mapPostMutationError(error);
    }
  }

  async function updatePost(actor: Actor, postId: string, rawInput: PostWriteInput) {
    await requirePostManager(actor);
    const existing = await dependencies.posts.findById(postId);

    if (!existing) {
      throw new NotFoundError('bài viết', postId);
    }

    const previousInput = mapRecordToWrite(existing);
    let input = rawInput;
    let newlyAddedImages = getAddedPostImageReferences(previousInput, rawInput);

    try {
      input = validatePostWrite(rawInput);
      newlyAddedImages = getAddedPostImageReferences(previousInput, input);
      const slugOwner = await dependencies.posts.findBySlug(input.slug);

      if (slugOwner && slugOwner.id !== postId) {
        throw new ConflictError('URL này đã được dùng cho một bài viết khác.');
      }

      const publishedAt =
        input.status === 'published'
          ? existing.status === 'published' && existing.publishedAt
            ? existing.publishedAt
            : dependencies.now().toISOString()
          : null;
      const updated = await dependencies.posts.update(
        postId,
        toPersistPostInput(input, dependencies.now().toISOString(), publishedAt),
      );
      await cleanupImages(getRemovedPostImageReferences(previousInput, input));
      return mapPost(updated);
    } catch (error) {
      await cleanupImages(newlyAddedImages);
      throw mapPostMutationError(error);
    }
  }

  async function deletePost(actor: Actor, postId: string) {
    await requirePostManager(actor);
    const deleted = await dependencies.posts.delete(postId);

    if (!deleted) {
      throw new NotFoundError('bài viết', postId);
    }

    await cleanupImages(getPostWriteImageReferences(mapRecordToWrite(deleted)));
  }

  async function setHomeFeaturedPosts(actor: Actor, postIds: string[]) {
    await requirePostManager(actor);
    const uniquePostIds = [...new Set(postIds)];

    if (uniquePostIds.length !== postIds.length) {
      throw new DomainValidationError('Danh sách bài viết nổi bật chứa mục trùng.', {
        postIds: ['Mỗi bài viết chỉ được chọn một lần.'],
      });
    }

    if (uniquePostIds.length > MAX_FEATURED_POSTS) {
      throw new DomainValidationError(
        `Chỉ được chọn tối đa ${MAX_FEATURED_POSTS} bài viết nổi bật.`,
        {
          postIds: [`Chỉ được chọn tối đa ${MAX_FEATURED_POSTS} bài viết.`],
        },
      );
    }

    if (uniquePostIds.length > 0) {
      const publishedPosts = await dependencies.posts.list({
        ids: uniquePostIds,
        status: 'published',
      });

      if (publishedPosts.length !== uniquePostIds.length) {
        throw new DomainValidationError(
          'Chỉ bài viết đã publish mới có thể xuất hiện trên trang chủ.',
          { postIds: ['Danh sách có bài viết không tồn tại hoặc chưa publish.'] },
        );
      }
    }

    await dependencies.posts.replaceFeaturedPostIds(uniquePostIds);
  }

  async function requireUniqueSlug(slug: string) {
    if (await dependencies.posts.findBySlug(slug)) {
      throw new ConflictError('URL này đã được dùng cho một bài viết khác.');
    }
  }

  async function cleanupImages(
    references: Parameters<PostImageObjectRepository['deleteReferences']>[0],
  ) {
    if (references.length === 0) {
      return;
    }

    try {
      await dependencies.images.deleteReferences(references);
    } catch (error) {
      console.error('Failed to clean up post image objects.', error);
    }
  }

  return {
    createPost,
    deletePost,
    getPostAdministrationData,
    getPublishedPostBySlug,
    listHomeFeaturedPosts,
    setHomeFeaturedPosts,
    updatePost,
  };
}

export const {
  createPost,
  deletePost,
  getPostAdministrationData,
  getPublishedPostBySlug,
  listHomeFeaturedPosts,
  setHomeFeaturedPosts,
  updatePost,
} = createPostService();

function validatePostWrite(input: PostWriteInput) {
  const sanitized = sanitizePostWrite(input);

  if (!sanitized.title) {
    throw new DomainValidationError('Tiêu đề bài viết không hợp lệ.', {
      title: ['Tiêu đề bài viết không được để trống.'],
    });
  }

  if (!sanitized.slug) {
    throw new DomainValidationError('URL bài viết không hợp lệ.', {
      slug: ['URL bài viết không được để trống.'],
    });
  }

  if (sanitized.content.length === 0) {
    throw new DomainValidationError('Nội dung bài viết không hợp lệ.', {
      content: ['Bài viết cần ít nhất một khối nội dung.'],
    });
  }

  return sanitized;
}

function toPersistPostInput(
  input: PostWriteInput,
  updatedAt: string,
  publishedAt: string | null,
): PersistPostInput {
  return {
    title: input.title,
    slug: input.slug,
    thumbnailUrl: input.thumbnailUrl || null,
    thumbnailImageKey: input.thumbnailImageKey ?? null,
    status: input.status,
    content: input.content,
    updatedAt,
    publishedAt: input.status === 'published' ? (publishedAt ?? updatedAt) : null,
  };
}

function mapRecordToWrite(record: PostRecord): PostWriteInput {
  return {
    title: record.title,
    slug: record.slug,
    thumbnailUrl: record.thumbnailUrl ?? '',
    thumbnailImageKey: record.thumbnailImageKey ?? undefined,
    status: record.status,
    content: parsePostContent(record.content),
  };
}

function mapPost(record: PostRecord): PostDto {
  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    thumbnailUrl: record.thumbnailUrl ?? '',
    thumbnailImageKey: record.thumbnailImageKey ?? undefined,
    status: record.status,
    content: parsePostContent(record.content),
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
  };
}

function mapPublicPost(record: PostRecord): PublicPostDto {
  const { createdBy: _createdBy, status: _status, ...post } = mapPost(record);
  void _createdBy;
  void _status;
  return post;
}

function mapPostMutationError(error: unknown) {
  if (error instanceof PostRecordConflictError) {
    return new ConflictError('URL này đã được dùng cho một bài viết khác.');
  }

  if (
    error instanceof ConflictError ||
    error instanceof DomainValidationError ||
    error instanceof ForbiddenError ||
    error instanceof InfrastructureError ||
    error instanceof NotFoundError
  ) {
    return error;
  }

  return new InfrastructureError('Không thể lưu bài viết.', {
    cause: error,
  });
}
