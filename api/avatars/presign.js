import { createHmac, createHash, randomUUID } from 'node:crypto';
import { getSupabasePublicServerConfig } from '../supabase-env.js';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024;
const PRESIGNED_URL_TTL_SECONDS = 60;
const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

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

function hmac(key, value, encoding) {
  return createHmac('sha256', key).update(value).digest(encoding);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function encodePathSegment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);
  return hmac(dateRegionServiceKey, 'aws4_request');
}

export function createPresignedPutUrl({ bucketName, accountId, accessKeyId, secretAccessKey, key }) {
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;
  const encodedKey = key.split('/').map(encodePathSegment).join('/');
  const canonicalUri = `/${bucketName}/${encodedKey}`;
  const queryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(PRESIGNED_URL_TTL_SECONDS),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQueryString = Object.entries(queryParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join('&');
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const signature = hmac(
    getSigningKey(secretAccessKey, dateStamp, region, service),
    stringToSign,
    'hex',
  );

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export function createSignedR2Request({
  method,
  bucketName,
  accountId,
  accessKeyId,
  secretAccessKey,
  key,
}) {
  const region = 'auto';
  const service = 's3';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const encodedKey = key.split('/').map(encodePathSegment).join('/');
  const canonicalUri = `/${bucketName}/${encodedKey}`;
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${EMPTY_PAYLOAD_HASH}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    EMPTY_PAYLOAD_HASH,
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const signature = hmac(
    getSigningKey(secretAccessKey, dateStamp, region, service),
    stringToSign,
    'hex',
  );

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-content-sha256': EMPTY_PAYLOAD_HASH,
      'x-amz-date': amzDate,
    },
  };
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

export function getExtension(contentType) {
  if (contentType === 'image/jpeg') {
    return 'jpg';
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  return 'webp';
}

export function getPublicBaseUrl() {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, '');
  const url = new URL(publicBaseUrl);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('R2_PUBLIC_BASE_URL must be an absolute HTTP(S) URL.');
  }

  if (url.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error(
      'R2_PUBLIC_BASE_URL must be a public R2 custom domain or r2.dev URL, not the private r2.cloudflarestorage.com API endpoint.',
    );
  }

  if (url.pathname !== '/') {
    throw new Error('R2_PUBLIC_BASE_URL must be an origin without an object path.');
  }

  return url.origin;
}

export default async function handler(request, response) {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    json(response, 405, { error: 'Method not allowed.' });
    return;
  }

  const requiredEnv = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_BASE_URL',
  ];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);

  if (missingEnv.length > 0) {
    json(response, 500, { error: `Missing R2 environment variables: ${missingEnv.join(', ')}` });
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

    const body = await parseBody(request);

    if (request.method === 'DELETE') {
      const avatarKey = typeof body.avatarKey === 'string' ? body.avatarKey : '';

      if (!avatarKey.startsWith(`avatars/${uid}/`)) {
        json(response, 400, { error: 'Avatar key is not valid for this user.' });
        return;
      }

      const signedRequest = createSignedR2Request({
        method: 'DELETE',
        bucketName: process.env.R2_BUCKET_NAME,
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        key: avatarKey,
      });
      const deleteResponse = await fetch(signedRequest.url, {
        method: 'DELETE',
        headers: signedRequest.headers,
      });

      if (!deleteResponse.ok) {
        json(response, 502, { error: 'Could not delete the previous avatar from R2.' });
        return;
      }

      json(response, 200, { ok: true });
      return;
    }

    const { contentType, size } = body;
    const maxUploadBytes = Number(process.env.R2_FREE_TIER_MAX_UPLOAD_BYTES) || DEFAULT_MAX_UPLOAD_BYTES;

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      json(response, 400, { error: 'Avatar must be a JPG, PNG, or WebP image.' });
      return;
    }

    if (!Number.isSafeInteger(size) || size <= 0 || size > maxUploadBytes) {
      json(response, 400, { error: `Avatar must be ${maxUploadBytes} bytes or smaller.` });
      return;
    }

    const avatarKey = `avatars/${uid}/${randomUUID()}.${getExtension(contentType)}`;
    const uploadUrl = createPresignedPutUrl({
      bucketName: process.env.R2_BUCKET_NAME,
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      key: avatarKey,
    });
    const publicBaseUrl = getPublicBaseUrl();

    json(response, 200, {
      uploadUrl,
      avatarKey,
      avatarUrl: `${publicBaseUrl}/${avatarKey}`,
      maxUploadBytes,
    });
  } catch (error) {
    json(response, 500, {
      error: error instanceof Error ? error.message : 'Could not prepare avatar upload.',
    });
  }
}
