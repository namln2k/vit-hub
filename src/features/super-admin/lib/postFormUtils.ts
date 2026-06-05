import {
  createPostSlug,
  type Post,
  type PostContentBlock,
  type PostImageBlock,
  type PostRichTextBlock,
  type PostStatus,
  type PostWrite,
} from '@/services/posts';

export type DraftBlock = PostRichTextBlock | PostImageBlock;
export type DraftBlockType = DraftBlock['type'];
export type DropPosition = 'before' | 'after';

export interface PostFormState {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  thumbnailImageKey?: string;
  status: PostStatus;
  content: DraftBlock[];
}

export function createEmptyPostForm(): PostFormState {
  return {
    id: '',
    title: '',
    slug: '',
    thumbnailUrl: '',
    thumbnailImageKey: undefined,
    status: 'published',
    content: [createRichTextBlock()],
  };
}

export function createPostFormFromPost(post: Post): PostFormState {
  const editableContent = post.content.filter(isEditableBlock);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    thumbnailUrl: post.thumbnailUrl,
    thumbnailImageKey: post.thumbnailImageKey,
    status: post.status,
    content: editableContent.length > 0 ? editableContent : [createRichTextBlock()],
  };
}

export function buildPostWrite(form: PostFormState): PostWrite {
  const fallbackThumbnail = getFirstImageThumbnail(form.content);

  return {
    title: form.title.trim(),
    slug: createPostSlug(form.slug),
    thumbnailUrl: form.thumbnailUrl.trim() || fallbackThumbnail.thumbnailUrl,
    thumbnailImageKey: form.thumbnailUrl.trim()
      ? form.thumbnailImageKey
      : fallbackThumbnail.thumbnailImageKey,
    status: form.status,
    content: form.content,
  };
}

export function createPostBlock(type: DraftBlockType): DraftBlock {
  if (type === 'richText') {
    return createRichTextBlock();
  }

  if (type === 'image') {
    return createImageBlock();
  }

  return createImageBlock();
}

export function createRichTextBlock(): DraftBlock {
  return {
    id: createBlockId(),
    type: 'richText',
    editorState: '',
    text: '',
  };
}

export function getBlockTypeLabel(block: DraftBlock) {
  if (block.type === 'richText') {
    return 'Đoạn text';
  }

  if (block.type === 'image') {
    return 'Ảnh';
  }

  return 'Đoạn text';
}

export function reorderBlocks(
  blocks: DraftBlock[],
  sourceBlockId: string,
  targetBlockId: string,
  position: DropPosition,
) {
  const sourceIndex = blocks.findIndex((block) => block.id === sourceBlockId);
  const targetIndex = blocks.findIndex((block) => block.id === targetBlockId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  const [sourceBlock] = nextBlocks.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = nextBlocks.findIndex((block) => block.id === targetBlockId);
  const insertionIndex =
    position === 'after' ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;

  nextBlocks.splice(insertionIndex, 0, sourceBlock);
  return nextBlocks;
}

export function upsertPostByUpdatedAt(posts: Post[], savedPost: Post) {
  return [savedPost, ...posts.filter((post) => post.id !== savedPost.id)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

function createBlockId() {
  return crypto.randomUUID();
}

function createImageBlock(): DraftBlock {
  return {
    id: createBlockId(),
    type: 'image',
    url: '',
    linkUrl: '',
    alt: '',
    caption: '',
  };
}

function isEditableBlock(block: PostContentBlock): block is DraftBlock {
  return block.type === 'richText' || block.type === 'image';
}

function getFirstImageThumbnail(blocks: DraftBlock[]) {
  const imageBlock = blocks.find(
    (block): block is PostImageBlock => block.type === 'image' && Boolean(block.url.trim()),
  );

  return {
    thumbnailUrl: imageBlock?.url.trim() ?? '',
    thumbnailImageKey: imageBlock?.postImageKey?.trim() || undefined,
  };
}
