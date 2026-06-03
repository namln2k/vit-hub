import { randomUUID } from 'node:crypto';
import { createPresignedPutUrl, getExtension, getPublicBaseUrl } from '../avatars/presign.js';
import { getSupabaseAdminServerConfig, getSupabasePublicServerConfig } from '../supabase-env.js';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function json(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 10_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    request.on('error', reject);
  });
}

function getRequiredR2Config() {
  const requiredEnv = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_BASE_URL',
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);

  if (missingEnv.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missingEnv.join(', ')}`);
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
  };
}

async function supabaseFetch(path, { key, method = 'GET', body, headers = {} }) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminServerConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: key ?? serviceRoleKey,
      Authorization: `Bearer ${key ?? serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return { response, data };
}

async function getSupabaseUid(accessToken) {
  const { supabaseUrl, publishableKey } = getSupabasePublicServerConfig();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.id ?? null;
}

async function getUserRole(uid) {
  const query = new URLSearchParams({
    select: 'role',
    id: `eq.${uid}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch(`/rest/v1/user?${query.toString()}`, {});

  if (!response.ok) {
    throw new Error(data?.message ?? 'Could not check post image upload permissions.');
  }

  return Array.isArray(data) ? data[0]?.role : null;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    json(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const authHeader = request.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

  if (!accessToken) {
    json(response, 401, { error: 'Missing Supabase access token.' });
    return;
  }

  try {
    const uid = await getSupabaseUid(accessToken);

    if (!uid) {
      json(response, 401, { error: 'Invalid Supabase access token.' });
      return;
    }

    const role = await getUserRole(uid);

    if (role !== 'super_admin') {
      json(response, 403, { error: 'Only super admins can upload post images.' });
      return;
    }

    const body = await parseBody(request);
    const { contentType, size } = body;
    const maxUploadBytes =
      Number(process.env.R2_POST_IMAGE_MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      json(response, 400, { error: 'Post image must be a JPG, PNG, or WebP image.' });
      return;
    }

    if (!Number.isSafeInteger(size) || size <= 0 || size > maxUploadBytes) {
      json(response, 400, { error: `Post image must be ${maxUploadBytes} bytes or smaller.` });
      return;
    }

    const r2 = getRequiredR2Config();
    const postImageKey = `posts/${uid}/${randomUUID()}.${getExtension(contentType)}`;
    const uploadUrl = createPresignedPutUrl({
      bucketName: r2.bucketName,
      accountId: r2.accountId,
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
      key: postImageKey,
    });
    const publicBaseUrl = getPublicBaseUrl();

    json(response, 200, {
      uploadUrl,
      postImageKey,
      postImageUrl: `${publicBaseUrl}/${postImageKey}`,
      maxUploadBytes,
    });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : 'Could not prepare post image upload.',
    });
  }
}
