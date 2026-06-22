import 'server-only';

import { createHash, createHmac } from 'node:crypto';
import { getRequiredR2Config } from '@/server/env';

const PRESIGNED_URL_TTL_SECONDS = 60;
const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function hmac(key: string | Buffer, value: string, encoding?: BufferEncoding) {
  const digest = createHmac('sha256', key).update(value).digest();
  return encoding ? digest.toString(encoding) : digest;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function getSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, region);
  const dateRegionServiceKey = hmac(dateRegionKey, service);
  return hmac(dateRegionServiceKey, 'aws4_request');
}

interface R2SigningConfig {
  bucketName: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  key: string;
}

export function createPresignedPutUrl({
  bucketName,
  accountId,
  accessKeyId,
  secretAccessKey,
  key,
}: R2SigningConfig) {
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
}: R2SigningConfig & { method: 'DELETE' }) {
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

export function getExtension(contentType: string) {
  if (contentType === 'image/jpeg') {
    return 'jpg';
  }

  if (contentType === 'image/png') {
    return 'png';
  }

  return 'webp';
}

export function getPublicBaseUrl() {
  const url = new URL(getRequiredR2Config().publicBaseUrl);

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
