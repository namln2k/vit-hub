import { randomUUID } from 'node:crypto';
import { getRequiredR2Config } from '@/server/env';
import { getBearerToken, jsonResponse, readJsonBody } from '@/server/api';
import {
  createPresignedPutUrl,
  createSignedR2Request,
  getExtension,
  getPublicBaseUrl,
} from '@/server/r2';
import { getSupabaseUid, getUserRole } from '@/server/supabase';

export const runtime = 'nodejs';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface PostPresignBody {
  contentType?: unknown;
  size?: unknown;
  images?: unknown;
}

interface PostImageReference {
  postImageKey?: unknown;
  url?: unknown;
}

function getPostImageKeyFromUrl(imageUrl: unknown) {
  if (typeof imageUrl !== 'string' || !imageUrl) {
    return '';
  }

  try {
    const publicBaseUrl = new URL(getPublicBaseUrl());
    const url = new URL(imageUrl);

    if (url.origin !== publicBaseUrl.origin) {
      return '';
    }

    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    return key.startsWith('posts/') ? key : '';
  } catch {
    return '';
  }
}

function getPostImageKeys(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      (value as PostImageReference[])
        .map((image) => {
          if (typeof image?.postImageKey === 'string' && image.postImageKey.startsWith('posts/')) {
            return image.postImageKey;
          }

          return getPostImageKeyFromUrl(image?.url);
        })
        .filter(Boolean),
    ),
  ];
}

async function requireSuperAdmin(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return { error: jsonResponse({ error: 'Missing Supabase access token.' }, 401) };
  }

  const uid = await getSupabaseUid(accessToken);

  if (!uid) {
    return { error: jsonResponse({ error: 'Invalid Supabase access token.' }, 401) };
  }

  const role = await getUserRole(uid, 'Could not check post image upload permissions.');

  if (role !== 'super_admin') {
    return { error: jsonResponse({ error: 'Only super admins can manage post images.' }, 403) };
  }

  return { uid };
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);

    if (auth.error) {
      return auth.error;
    }

    const body = await readJsonBody<PostPresignBody>(request, 10_000);
    const keys = getPostImageKeys(body.images);

    if (keys.length === 0) {
      return jsonResponse({ ok: true, deleted: 0 });
    }

    const r2 = getRequiredR2Config();
    const results = await Promise.all(
      keys.map(async (key) => {
        const signedRequest = createSignedR2Request({
          method: 'DELETE',
          bucketName: r2.bucketName,
          accountId: r2.accountId,
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
          key,
        });
        const deleteResponse = await fetch(signedRequest.url, {
          method: 'DELETE',
          headers: signedRequest.headers,
        });

        return { key, ok: deleteResponse.ok };
      }),
    );
    const failedKeys = results.filter((result) => !result.ok).map((result) => result.key);

    if (failedKeys.length > 0) {
      return jsonResponse(
        {
          error: 'Could not delete every post image from R2.',
          failedKeys,
        },
        502,
      );
    }

    return jsonResponse({ ok: true, deleted: results.length });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Could not delete post images.',
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);

    if (auth.error || !auth.uid) {
      return auth.error;
    }

    const body = await readJsonBody<PostPresignBody>(request, 10_000);
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    const size = Number(body.size);
    const maxUploadBytes =
      Number(process.env.R2_POST_IMAGE_MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return jsonResponse({ error: 'Post image must be a JPG, PNG, or WebP image.' }, 400);
    }

    if (!Number.isSafeInteger(size) || size <= 0 || size > maxUploadBytes) {
      return jsonResponse(
        { error: `Post image must be ${maxUploadBytes} bytes or smaller.` },
        400,
      );
    }

    const r2 = getRequiredR2Config();
    const postImageKey = `posts/${auth.uid}/${randomUUID()}.${getExtension(contentType)}`;
    const uploadUrl = createPresignedPutUrl({
      bucketName: r2.bucketName,
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      key: postImageKey,
    });

    return jsonResponse({
      uploadUrl,
      postImageKey,
      postImageUrl: `${getPublicBaseUrl()}/${postImageKey}`,
      maxUploadBytes,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Could not prepare post image upload.',
      },
      500,
    );
  }
}
