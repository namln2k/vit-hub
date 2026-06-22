import 'server-only';

import {
  getPublicSupabaseConfig,
  readHttpUrl,
  readPositiveInteger,
} from '@/config/env';

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for server API routes.`);
  }

  return value;
}

export function getSupabaseServerConfig() {
  const publicConfig = getPublicSupabaseConfig();
  const internalUrl = process.env.SUPABASE_INTERNAL_URL?.trim();
  const supabaseUrl =
    process.env.DOCKER_CONTAINER === 'true' && internalUrl
      ? readHttpUrl('SUPABASE_INTERNAL_URL', internalUrl)
      : publicConfig.supabaseUrl;

  return {
    ...publicConfig,
    supabaseUrl,
  };
}

export function getSupabaseAdminServerConfig() {
  return {
    ...getSupabaseServerConfig(),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

export function getRequiredR2Config() {
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
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: requireEnv('R2_BUCKET_NAME'),
    publicBaseUrl: readHttpUrl('R2_PUBLIC_BASE_URL', process.env.R2_PUBLIC_BASE_URL),
  };
}

export function getUploadLimits() {
  return {
    avatarBytes: readPositiveInteger(
      'R2_FREE_TIER_MAX_UPLOAD_BYTES',
      process.env.R2_FREE_TIER_MAX_UPLOAD_BYTES,
      1024 * 1024,
    ),
    postImageBytes: readPositiveInteger(
      'R2_POST_IMAGE_MAX_UPLOAD_BYTES',
      process.env.R2_POST_IMAGE_MAX_UPLOAD_BYTES,
      5 * 1024 * 1024,
    ),
  };
}
