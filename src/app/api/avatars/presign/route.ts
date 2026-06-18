import { randomUUID } from 'node:crypto';
import { getRequiredR2Config } from '@/server/env';
import { getBearerToken, jsonResponse, readJsonBody } from '@/server/api';
import {
  createPresignedPutUrl,
  createSignedR2Request,
  getExtension,
  getPublicBaseUrl,
} from '@/server/r2';
import { getSupabaseUid } from '@/server/supabase';

export const runtime = 'nodejs';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024;

interface AvatarPresignBody {
  contentType?: unknown;
  size?: unknown;
  avatarKey?: unknown;
}

async function getAuthenticatedUid(request: Request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return { error: jsonResponse({ error: 'Missing Supabase access token.' }, 401) };
  }

  const uid = await getSupabaseUid(accessToken);

  if (!uid) {
    return { error: jsonResponse({ error: 'Invalid Supabase access token.' }, 401) };
  }

  return { uid };
}

export async function DELETE(request: Request) {
  try {
    getRequiredR2Config();
    const auth = await getAuthenticatedUid(request);

    if (auth.error || !auth.uid) {
      return auth.error;
    }

    const body = await readJsonBody<AvatarPresignBody>(request, 10_000);
    const avatarKey = typeof body.avatarKey === 'string' ? body.avatarKey : '';

    if (!avatarKey.startsWith(`avatars/${auth.uid}/`)) {
      return jsonResponse({ error: 'Avatar key is not valid for this user.' }, 400);
    }

    const r2 = getRequiredR2Config();
    const signedRequest = createSignedR2Request({
      method: 'DELETE',
      bucketName: r2.bucketName,
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      key: avatarKey,
    });
    const deleteResponse = await fetch(signedRequest.url, {
      method: 'DELETE',
      headers: signedRequest.headers,
    });

    if (!deleteResponse.ok) {
      return jsonResponse({ error: 'Could not delete the previous avatar from R2.' }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Could not delete avatar.' },
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    getRequiredR2Config();
    const auth = await getAuthenticatedUid(request);

    if (auth.error || !auth.uid) {
      return auth.error;
    }

    const body = await readJsonBody<AvatarPresignBody>(request, 10_000);
    const contentType = typeof body.contentType === 'string' ? body.contentType : '';
    const size = Number(body.size);
    const maxUploadBytes =
      Number(process.env.R2_FREE_TIER_MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return jsonResponse({ error: 'Avatar must be a JPG, PNG, or WebP image.' }, 400);
    }

    if (!Number.isSafeInteger(size) || size <= 0 || size > maxUploadBytes) {
      return jsonResponse({ error: `Avatar must be ${maxUploadBytes} bytes or smaller.` }, 400);
    }

    const r2 = getRequiredR2Config();
    const avatarKey = `avatars/${auth.uid}/${randomUUID()}.${getExtension(contentType)}`;
    const uploadUrl = createPresignedPutUrl({
      bucketName: r2.bucketName,
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      key: avatarKey,
    });

    return jsonResponse({
      uploadUrl,
      avatarKey,
      avatarUrl: `${getPublicBaseUrl()}/${avatarKey}`,
      maxUploadBytes,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Could not prepare avatar upload.',
      },
      500,
    );
  }
}
