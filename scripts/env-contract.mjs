import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export const PROFILE_FILES = {
  local: '.env.local',
  production: '.env',
};

export const APP_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'SUPABASE_INTERNAL_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_BASE_URL',
  'R2_FREE_TIER_MAX_UPLOAD_BYTES',
  'R2_POST_IMAGE_MAX_UPLOAD_BYTES',
];

function required(env, name) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function httpUrl(env, name) {
  const value = required(env, name);
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS.`);
  }

  return url;
}

export function loadProfile(profile) {
  const file = PROFILE_FILES[profile];

  if (!file) {
    throw new Error(`Unknown environment profile "${profile}". Use local or production.`);
  }

  return { file, env: parseEnv(readFileSync(file, 'utf8')) };
}

export function validateProfile(profile, env) {
  const publicUrl = httpUrl(env, 'NEXT_PUBLIC_SUPABASE_URL');
  required(env, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  required(env, 'SUPABASE_SERVICE_ROLE_KEY');

  if (profile === 'local') {
    if (
      publicUrl.port !== '54321' ||
      !['127.0.0.1', 'localhost'].includes(publicUrl.hostname)
    ) {
      throw new Error(
        'The local profile must expose Supabase at http://127.0.0.1:54321 or localhost:54321.',
      );
    }

    const internalUrl = httpUrl(env, 'SUPABASE_INTERNAL_URL');

    if (internalUrl.hostname !== 'host.docker.internal' || internalUrl.port !== '54321') {
      throw new Error(
        'The local profile must set SUPABASE_INTERNAL_URL=http://host.docker.internal:54321.',
      );
    }
  }

  if (profile === 'production') {
    if (publicUrl.protocol !== 'https:') {
      throw new Error('The production profile must use an HTTPS Supabase URL.');
    }

    if (env.SUPABASE_INTERNAL_URL?.trim()) {
      throw new Error('The production profile must not set SUPABASE_INTERNAL_URL.');
    }
  }

  if (
    env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED === 'true' &&
    !env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  ) {
    throw new Error(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID is required when Google One Tap is enabled.',
    );
  }

  return {
    profile,
    supabaseOrigin: publicUrl.origin,
    googleOneTapEnabled: env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED === 'true',
  };
}

export function isolatedProcessEnv(selectedEnv) {
  const env = { ...process.env, VIT_HUB_ENV_PROFILE: selectedEnv.VIT_HUB_ENV_PROFILE };

  for (const key of APP_ENV_KEYS) {
    env[key] = selectedEnv[key] ?? '';
  }

  return env;
}
