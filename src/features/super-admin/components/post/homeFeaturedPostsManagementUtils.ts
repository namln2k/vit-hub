import type { PostDto } from '@/features/posts/types';

export const DEFAULT_FEATURED_POST_COUNT = 10;

export function getDefaultFeaturedPostIds(posts: PostDto[]) {
  return posts.slice(0, DEFAULT_FEATURED_POST_COUNT).map((post) => post.id);
}

export function filterPostsBySearch(posts: PostDto[], search: string) {
  const query = normalizePostSearchValue(search);

  if (!query) {
    return posts;
  }

  return posts.filter((post) =>
    [post.title, post.slug].some((value) => normalizePostSearchValue(value).includes(query)),
  );
}

export function getSelectedPosts(selectedPostIds: string[], postById: Map<string, PostDto>) {
  return selectedPostIds
    .map((postId) => postById.get(postId))
    .filter((post): post is PostDto => Boolean(post));
}

export function reorderPostIds(postIds: string[], sourcePostId: string, targetPostId: string) {
  const sourceIndex = postIds.indexOf(sourcePostId);
  const targetIndex = postIds.indexOf(targetPostId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return postIds;
  }

  const nextPostIds = [...postIds];
  const [sourcePost] = nextPostIds.splice(sourceIndex, 1);
  nextPostIds.splice(targetIndex, 0, sourcePost);

  return nextPostIds;
}

export function arePostIdsEqual(firstPostIds: string[], secondPostIds: string[]) {
  return (
    firstPostIds.length === secondPostIds.length &&
    firstPostIds.every((postId, index) => postId === secondPostIds[index])
  );
}

export function getLoadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  return message
    ? `Không thể tải cấu hình bài viết nổi bật: ${message}`
    : 'Không thể tải cấu hình bài viết nổi bật.';
}

export function getSaveErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function getInitialSelectedPostIds(posts: PostDto[], configuredPostIds: string[]) {
  if (configuredPostIds.length === 0) {
    return getDefaultFeaturedPostIds(posts);
  }

  const publishedPostIdSet = new Set(posts.map((post) => post.id));

  return configuredPostIds.filter((postId) => publishedPostIdSet.has(postId));
}

function normalizePostSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
