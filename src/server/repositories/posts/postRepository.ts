import 'server-only';

import { supabaseFetch } from '@/server/supabase';
import { InfrastructureError } from '@/server/services/shared/errors';
import type { PostStatus } from '@/features/posts/types';

const POST_SELECT =
  'id,title,slug,thumbnail_url,thumbnail_image_key,status,content,created_by,created_at,updated_at,published_at';

export interface PostRecord {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  thumbnailImageKey: string | null;
  status: PostStatus;
  content: unknown;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PersistPostInput {
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  thumbnailImageKey: string | null;
  status: PostStatus;
  content: unknown;
  publishedAt: string | null;
  updatedAt: string;
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

interface FeaturedPostRow {
  post_id: string;
  display_order: number;
}

export class PostRecordConflictError extends Error {
  constructor() {
    super('The post conflicts with an existing record.');
    this.name = 'PostRecordConflictError';
  }
}

export interface PostRepository {
  list(input?: { status?: PostStatus; ids?: string[]; limit?: number }): Promise<PostRecord[]>;
  findById(postId: string): Promise<PostRecord | null>;
  findBySlug(slug: string, status?: PostStatus): Promise<PostRecord | null>;
  create(input: PersistPostInput & { createdBy: string }): Promise<PostRecord>;
  update(postId: string, input: PersistPostInput): Promise<PostRecord>;
  delete(postId: string): Promise<PostRecord | null>;
  listFeaturedPostIds(): Promise<string[]>;
  replaceFeaturedPostIds(postIds: string[]): Promise<void>;
}

export const postRepository: PostRepository = {
  async list(input = {}) {
    if (input.ids?.length === 0 || input.limit === 0) {
      return [];
    }

    const query = new URLSearchParams({ select: POST_SELECT });

    if (input.status) {
      query.set('status', `eq.${input.status}`);
    }

    if (input.ids?.length) {
      query.set('id', `in.(${input.ids.join(',')})`);
    }

    if (input.status === 'published') {
      query.set('order', 'published_at.desc.nullslast,created_at.desc');
    } else {
      query.append('order', 'updated_at.desc');
    }

    if (input.limit !== undefined) {
      query.set('limit', String(input.limit));
    }

    const { response, data } = await supabaseFetch<PostRow[]>(`/rest/v1/posts?${query.toString()}`);

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải danh sách bài viết.');
    }

    return (Array.isArray(data) ? data : []).map(mapPostRow);
  },

  async findById(postId) {
    return findPost({ id: postId });
  },

  async findBySlug(slug, status) {
    return findPost({ slug, status });
  },

  async create(input) {
    const { response, data } = await supabaseFetch<PostRow[]>(
      `/rest/v1/posts?select=${encodeURIComponent(POST_SELECT)}`,
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: {
          ...mapPersistPostInput(input),
          created_by: input.createdBy,
        },
      },
    );

    return readMutationRecord(response, data, 'tạo');
  },

  async update(postId, input) {
    const query = new URLSearchParams({
      select: POST_SELECT,
      id: `eq.${postId}`,
    });
    const { response, data } = await supabaseFetch<PostRow[]>(
      `/rest/v1/posts?${query.toString()}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: mapPersistPostInput(input),
      },
    );

    return readMutationRecord(response, data, 'cập nhật');
  },

  async delete(postId) {
    const query = new URLSearchParams({
      select: POST_SELECT,
      id: `eq.${postId}`,
    });
    const { response, data } = await supabaseFetch<PostRow[]>(
      `/rest/v1/posts?${query.toString()}`,
      {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      },
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể xoá bài viết.');
    }

    const row = Array.isArray(data) ? data[0] : null;
    return row ? mapPostRow(row) : null;
  },

  async listFeaturedPostIds() {
    const query = new URLSearchParams({
      select: 'post_id,display_order',
      order: 'display_order.asc',
    });
    const { response, data } = await supabaseFetch<FeaturedPostRow[]>(
      `/rest/v1/home_featured_posts?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải cấu hình bài viết nổi bật.');
    }

    return (Array.isArray(data) ? data : []).map((row) => row.post_id);
  },

  async replaceFeaturedPostIds(postIds) {
    const { response } = await supabaseFetch('/rest/v1/rpc/replace_home_featured_posts', {
      method: 'POST',
      body: { post_ids: postIds },
    });

    if (!response.ok) {
      throw new InfrastructureError('Không thể lưu cấu hình bài viết nổi bật.');
    }
  },
};

async function findPost(input: { id?: string; slug?: string; status?: PostStatus }) {
  const query = new URLSearchParams({
    select: POST_SELECT,
    limit: '1',
  });

  if (input.id) {
    query.set('id', `eq.${input.id}`);
  }

  if (input.slug) {
    query.set('slug', `eq.${input.slug}`);
  }

  if (input.status) {
    query.set('status', `eq.${input.status}`);
  }

  const { response, data } = await supabaseFetch<PostRow[]>(`/rest/v1/posts?${query.toString()}`);

  if (!response.ok) {
    throw new InfrastructureError('Không thể tải bài viết.');
  }

  const row = Array.isArray(data) ? data[0] : null;
  return row ? mapPostRow(row) : null;
}

function readMutationRecord(response: Response, data: PostRow[] | null, operation: string) {
  if (!response.ok) {
    if (response.status === 409) {
      throw new PostRecordConflictError();
    }

    throw new InfrastructureError(`Không thể ${operation} bài viết.`);
  }

  const row = Array.isArray(data) ? data[0] : null;

  if (!row) {
    throw new InfrastructureError(`Không thể xác nhận bài viết sau khi ${operation}.`);
  }

  return mapPostRow(row);
}

function mapPersistPostInput(input: PersistPostInput) {
  return {
    title: input.title,
    slug: input.slug,
    thumbnail_url: input.thumbnailUrl,
    thumbnail_image_key: input.thumbnailImageKey,
    status: input.status,
    content: input.content,
    updated_at: input.updatedAt,
    published_at: input.publishedAt,
  };
}

function mapPostRow(row: PostRow): PostRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnailUrl: row.thumbnail_url,
    thumbnailImageKey: row.thumbnail_image_key,
    status: row.status,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}
