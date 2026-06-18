import { supabase } from '@/services/supabase';
import { Post, PostRow } from '@/services/posts/types';
import { mapPostRow } from '@/services/posts/content';

export const POST_SELECT =
  'id, title, slug, thumbnail_url, thumbnail_image_key, status, content, created_by, created_at, updated_at, published_at';

export const HOME_FEATURED_POSTS_SELECT = 'post_id, display_order';

export async function listAdminPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .order('updated_at', { ascending: false })
    .returns<PostRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapPostRow);
}

export async function listLatestPublishedPosts(limit = 10): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<PostRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapPostRow);
}

export async function listPublishedPostsForFeaturedSelection(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .returns<PostRow[]>();

  if (error) {
    throw error;
  }

  return data.map(mapPostRow);
}

export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle<PostRow>();

  if (error) {
    throw error;
  }

  return data ? mapPostRow(data) : null;
}
