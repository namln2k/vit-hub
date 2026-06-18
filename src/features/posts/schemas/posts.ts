import { z } from 'zod';

const blockId = z.string().trim().min(1).max(200);

const richTextBlockSchema = z.object({
  id: blockId,
  type: z.literal('richText'),
  editorState: z.string().max(2_000_000),
  text: z.string().max(200_000),
});

const headingBlockSchema = z.object({
  id: blockId,
  type: z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().max(500),
});

const paragraphBlockSchema = z.object({
  id: blockId,
  type: z.literal('paragraph'),
  text: z.string().max(20_000),
});

const listBlockSchema = z.object({
  id: blockId,
  type: z.literal('list'),
  items: z.array(z.string().max(5_000)).max(500),
});

const imageBlockSchema = z.object({
  id: blockId,
  type: z.literal('image'),
  url: z.url('URL ảnh bài viết không hợp lệ.'),
  postImageKey: z.string().trim().max(500).optional(),
  linkUrl: z.union([z.url('URL liên kết ảnh không hợp lệ.'), z.literal('')]).optional(),
  alt: z.string().max(500),
  caption: z.string().max(2_000),
});

const postContentBlockSchema = z.discriminatedUnion('type', [
  richTextBlockSchema,
  headingBlockSchema,
  paragraphBlockSchema,
  listBlockSchema,
  imageBlockSchema,
]);

export const postWriteSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề bài viết không được để trống.').max(500),
  slug: z
    .string()
    .trim()
    .min(1, 'URL bài viết không được để trống.')
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'URL bài viết chỉ được chứa chữ thường, số và dấu gạch ngang.',
    ),
  thumbnailUrl: z.union([z.url('URL thumbnail không hợp lệ.'), z.literal('')]),
  thumbnailImageKey: z.string().trim().max(500).optional(),
  status: z.enum(['draft', 'published']),
  content: z
    .array(postContentBlockSchema)
    .min(1, 'Bài viết cần ít nhất một khối nội dung.')
    .max(500),
});

export const updatePostSchema = z.object({
  postId: z.uuid('Mã bài viết không hợp lệ.'),
  post: postWriteSchema,
});

export const deletePostSchema = z.object({
  postId: z.uuid('Mã bài viết không hợp lệ.'),
});

export const setHomeFeaturedPostsSchema = z.object({
  postIds: z.array(z.uuid('Mã bài viết không hợp lệ.')).max(10),
});
