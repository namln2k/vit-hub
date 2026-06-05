import { supabase } from '@/services/supabase';
import { deletePostImages, type PostImageReference } from '@/services/postImageUpload';

export type PostStatus = 'draft' | 'published';
export type PostBlockType = 'richText' | 'heading' | 'paragraph' | 'list' | 'image';

export interface PostRichTextBlock {
  id: string;
  type: 'richText';
  editorState: string;
  text: string;
}

export interface PostHeadingBlock {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3;
  text: string;
}

export interface PostParagraphBlock {
  id: string;
  type: 'paragraph';
  text: string;
}

export interface PostListBlock {
  id: string;
  type: 'list';
  items: string[];
}

export interface PostImageBlock {
  id: string;
  type: 'image';
  url: string;
  postImageKey?: string;
  linkUrl?: string;
  alt: string;
  caption: string;
}

export type PostContentBlock =
  | PostRichTextBlock
  | PostHeadingBlock
  | PostParagraphBlock
  | PostListBlock
  | PostImageBlock;

export interface Post {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  thumbnailImageKey?: string;
  status: PostStatus;
  content: PostContentBlock[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PostWrite {
  title: string;
  slug: string;
  thumbnailUrl: string;
  thumbnailImageKey?: string;
  status: PostStatus;
  content: PostContentBlock[];
}

interface PostRow {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  thumbnail_image_key: string | null;
  status: PostStatus;
  content: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const POST_SELECT =
  'id, title, slug, thumbnail_url, thumbnail_image_key, status, content, created_by, created_at, updated_at, published_at';

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

export function createPostSlug(value: string) {
  return createNormalizedPostSlug(value).replace(/^-+|-+$/g, '');
}

export function createDraftPostSlug(value: string) {
  return createNormalizedPostSlug(value).replace(/^-+/g, '');
}

function createNormalizedPostSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 120);
}

function mapPostRow(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnailUrl: row.thumbnail_url ?? '',
    thumbnailImageKey: row.thumbnail_image_key ?? undefined,
    status: row.status,
    content: parsePostContent(row.content),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function mapPostWrite(input: PostWrite, createdBy?: string) {
  const now = new Date().toISOString();
  const row = {
    title: input.title.trim(),
    slug: createPostSlug(input.slug),
    thumbnail_url: input.thumbnailUrl.trim() || null,
    thumbnail_image_key: input.thumbnailImageKey?.trim() || null,
    status: input.status,
    content: sanitizePostContent(input.content),
    updated_at: now,
    published_at: input.status === 'published' ? now : null,
  };

  return createdBy ? { ...row, created_by: createdBy } : row;
}

function parsePostContent(value: unknown): PostContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return sanitizePostContent(value as PostContentBlock[]);
}

function sanitizePostContent(blocks: PostContentBlock[]): PostContentBlock[] {
  return blocks
    .map((block) => {
      if (block.type === 'heading') {
        return {
          id: block.id,
          type: 'heading' as const,
          level: block.level,
          text: block.text.trim(),
        };
      }

      if (block.type === 'paragraph') {
        return {
          id: block.id,
          type: 'paragraph' as const,
          text: block.text.trim(),
        };
      }

      if (block.type === 'richText') {
        return {
          id: block.id,
          type: 'richText' as const,
          editorState: block.editorState,
          text: block.text.trim(),
        };
      }

      if (block.type === 'list') {
        return {
          id: block.id,
          type: 'list' as const,
          items: block.items.map((item) => item.trim()).filter(Boolean),
        };
      }

      return {
        id: block.id,
        type: 'image' as const,
        url: block.url.trim(),
        postImageKey: block.postImageKey?.trim(),
        linkUrl: block.linkUrl?.trim() || undefined,
        alt: block.alt.trim(),
        caption: block.caption.trim(),
      };
    })
    .filter((block) => {
      if (block.type === 'list') {
        return block.items.length > 0;
      }

      if (block.type === 'image') {
        return Boolean(block.url);
      }

      if (block.type === 'richText') {
        return Boolean(block.text);
      }

      return Boolean(block.text);
    });
}

function getPostImageReferences(blocks: PostContentBlock[]): PostImageReference[] {
  return blocks
    .filter((block): block is PostImageBlock => block.type === 'image')
    .map((block) => ({
      url: block.url,
      postImageKey: block.postImageKey,
    }));
}
