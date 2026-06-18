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

export interface PostRow {
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

export interface HomeFeaturedPostRow {
  post_id: string;
  display_order: number;
}
