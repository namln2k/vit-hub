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

export interface PostDto {
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

export type PublicPostDto = Omit<PostDto, 'createdBy' | 'status'>;

export interface PostWriteInput {
  title: string;
  slug: string;
  thumbnailUrl: string;
  thumbnailImageKey?: string;
  status: PostStatus;
  content: PostContentBlock[];
}

export interface PostImageReference {
  postImageKey?: string;
  url?: string;
}

export interface PostAdministrationDataDto {
  posts: PostDto[];
  publishedPosts: PostDto[];
  featuredPostIds: string[];
}
