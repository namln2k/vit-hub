import type { PostImageReference } from '@/services/postImageUpload';
import { Post, PostContentBlock, PostImageBlock, PostRow, PostWrite } from '@/services/posts/types';

export function createPostSlug(value: string) {
  return createNormalizedPostSlug(value).replace(/^-+|-+$/g, '');
}

export function createDraftPostSlug(value: string) {
  return createNormalizedPostSlug(value).replace(/^-+/g, '');
}

export function createNormalizedPostSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 120);
}

export function mapPostRow(row: PostRow): Post {
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

export function mapPostWrite(input: PostWrite, createdBy?: string) {
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

export function parsePostContent(value: unknown): PostContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return sanitizePostContent(value as PostContentBlock[]);
}

export function sanitizePostContent(blocks: PostContentBlock[]): PostContentBlock[] {
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

export function getPostImageReferences(blocks: PostContentBlock[]): PostImageReference[] {
  return blocks
    .filter((block): block is PostImageBlock => block.type === 'image')
    .map((block) => ({
      url: block.url,
      postImageKey: block.postImageKey,
    }));
}
