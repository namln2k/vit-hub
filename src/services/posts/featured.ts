import { supabase } from '@/services/supabase';
import { HomeFeaturedPostRow, Post, PostRow } from '@/services/posts/types';
import {
  HOME_FEATURED_POSTS_SELECT,
  POST_SELECT,
  listLatestPublishedPosts,
} from '@/services/posts/queries';
import { mapPostRow } from '@/services/posts/content';

export async function listHomeFeaturedPosts(limit = 10): Promise<Post[]> {
  let configuredPostIds: string[];

  try {
    configuredPostIds = await getConfiguredHomeFeaturedPostIds();
  } catch (error) {
    if (isMissingHomeFeaturedPostsTableError(error)) {
      return listLatestPublishedPosts(limit);
    }

    throw error;
  }

  if (configuredPostIds.length === 0) {
    return listLatestPublishedPosts(limit);
  }

  const posts = await listPublishedPostsByIds(configuredPostIds);
  const postById = new Map(posts.map((post) => [post.id, post]));

  return configuredPostIds
    .map((postId) => postById.get(postId))
    .filter((post): post is Post => Boolean(post))
    .slice(0, limit);
}

export async function getHomeFeaturedPostIds(): Promise<string[]> {
  try {
    return await getConfiguredHomeFeaturedPostIds();
  } catch (error) {
    if (isMissingHomeFeaturedPostsTableError(error)) {
      throw new Error(
        'Đã xảy ra lỗi hệ thống khi tải cấu hình bài viết nổi bật. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
      );
    }

    throw error;
  }
}

export async function saveHomeFeaturedPostIds(postIds: string[]): Promise<void> {
  const uniquePostIds = Array.from(new Set(postIds));
  const { error: deleteError } = await supabase
    .from('home_featured_posts')
    .delete()
    .gte('display_order', 0);

  if (deleteError) {
    throw createHomeFeaturedPostsWriteError(deleteError);
  }

  if (uniquePostIds.length === 0) {
    return;
  }

  const rows = uniquePostIds.map((postId, index) => ({
    post_id: postId,
    display_order: index,
  }));
  const { error } = await supabase.from('home_featured_posts').insert(rows);

  if (error) {
    throw createHomeFeaturedPostsWriteError(error);
  }
}

export async function getConfiguredHomeFeaturedPostIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('home_featured_posts')
    .select(HOME_FEATURED_POSTS_SELECT)
    .order('display_order', { ascending: true })
    .returns<HomeFeaturedPostRow[]>();

  if (error) {
    throw error;
  }

  return data.map((row) => row.post_id);
}

export async function listPublishedPostsByIds(postIds: string[]): Promise<Post[]> {
  if (postIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .in('id', postIds)
    .returns<PostRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapPostRow);
}

export function createHomeFeaturedPostsWriteError(error: unknown) {
  if (isMissingHomeFeaturedPostsTableError(error)) {
    return new Error(
      'Đã xảy ra lỗi hệ thống khi lưu cấu hình bài viết nổi bật. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
    );
  }

  return error;
}

export function isMissingHomeFeaturedPostsTableError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  const message = typeof maybeError.message === 'string' ? maybeError.message : '';

  return maybeError.code === '42P01' || message.includes('home_featured_posts');
}
