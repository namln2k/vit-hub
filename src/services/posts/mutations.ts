import { supabase } from '@/services/supabase';
import { deletePostImages } from '@/services/postImageUpload';
import { Post, PostRow, PostWrite } from '@/services/posts/types';
import { POST_SELECT } from '@/services/posts/queries';
import {
  getPostImageReferences,
  mapPostRow,
  mapPostWrite,
  parsePostContent,
} from '@/services/posts/content';

export async function createPost(input: PostWrite): Promise<Post> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('Bạn cần đăng nhập để tạo bài viết.');
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(mapPostWrite(input, user.id))
    .select(POST_SELECT)
    .single<PostRow>();

  if (error) {
    throw error;
  }

  return mapPostRow(data);
}

export async function updatePost(postId: string, input: PostWrite): Promise<Post> {
  const { data: existingPost, error: fetchError } = await supabase
    .from('posts')
    .select('thumbnail_url, thumbnail_image_key')
    .eq('id', postId)
    .single<Pick<PostRow, 'thumbnail_url' | 'thumbnail_image_key'>>();

  if (fetchError) {
    throw fetchError;
  }

  const { data, error } = await supabase
    .from('posts')
    .update(mapPostWrite(input))
    .eq('id', postId)
    .select(POST_SELECT)
    .single<PostRow>();

  if (error) {
    throw error;
  }

  if (
    existingPost.thumbnail_image_key &&
    existingPost.thumbnail_image_key !== input.thumbnailImageKey
  ) {
    void deletePostImages([
      {
        url: existingPost.thumbnail_url ?? undefined,
        postImageKey: existingPost.thumbnail_image_key,
      },
    ]).catch(() => undefined);
  }

  return mapPostRow(data);
}

export async function deletePost(postId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('posts')
    .select('content, thumbnail_url, thumbnail_image_key')
    .eq('id', postId)
    .single<Pick<PostRow, 'content' | 'thumbnail_url' | 'thumbnail_image_key'>>();

  if (fetchError) {
    throw fetchError;
  }

  const content = parsePostContent(data.content);
  await deletePostImages([
    ...getPostImageReferences(content),
    {
      url: data.thumbnail_url ?? undefined,
      postImageKey: data.thumbnail_image_key ?? undefined,
    },
  ]);

  const { error } = await supabase.from('posts').delete().eq('id', postId);

  if (error) {
    throw error;
  }
}
