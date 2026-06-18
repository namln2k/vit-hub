import type {
  PostContentBlock,
  PostImageBlock,
  PostImageReference,
  PostWriteInput,
} from '@/features/posts/types';

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

export function sanitizePostWrite(input: PostWriteInput): PostWriteInput {
  return {
    title: input.title.trim(),
    slug: createPostSlug(input.slug),
    thumbnailUrl: input.thumbnailUrl.trim(),
    thumbnailImageKey: input.thumbnailImageKey?.trim() || undefined,
    status: input.status,
    content: sanitizePostContent(input.content),
  };
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
        postImageKey: block.postImageKey?.trim() || undefined,
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

export function getPostWriteImageReferences(input: PostWriteInput): PostImageReference[] {
  return [
    ...getPostImageReferences(input.content),
    {
      url: input.thumbnailUrl || undefined,
      postImageKey: input.thumbnailImageKey,
    },
  ].filter((reference) => reference.url || reference.postImageKey);
}

export function getRemovedPostImageReferences(previous: PostWriteInput, next: PostWriteInput) {
  const nextKeys = new Set(
    getPostWriteImageReferences(next).map(getReferenceIdentity).filter(Boolean),
  );

  return getPostWriteImageReferences(previous).filter(
    (reference) => !nextKeys.has(getReferenceIdentity(reference)),
  );
}

export function getAddedPostImageReferences(previous: PostWriteInput, next: PostWriteInput) {
  const previousKeys = new Set(
    getPostWriteImageReferences(previous).map(getReferenceIdentity).filter(Boolean),
  );

  return getPostWriteImageReferences(next).filter(
    (reference) => !previousKeys.has(getReferenceIdentity(reference)),
  );
}

function getReferenceIdentity(reference: PostImageReference) {
  return reference.postImageKey?.trim() || reference.url?.trim() || '';
}
