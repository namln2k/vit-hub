import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGoogleOneTapConfig, getPublicSupabaseConfig, readPositiveInteger } from './env';

describe('runtime environment configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns one canonical public Supabase config', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co/');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(getPublicSupabaseConfig()).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      publishableKey: 'publishable-key',
    });
  });

  it('rejects non-HTTP Supabase URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'postgresql://localhost:54322/postgres');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(() => getPublicSupabaseConfig()).toThrow('must use HTTP or HTTPS');
  });

  it('requires a Google client ID only when One Tap is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');

    expect(() => getGoogleOneTapConfig()).toThrow('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
  });

  it('validates configured upload limits', () => {
    expect(readPositiveInteger('UPLOAD_LIMIT', '2048', 1024)).toBe(2048);
    expect(() => readPositiveInteger('UPLOAD_LIMIT', '-1', 1024)).toThrow(
      'must be a positive integer',
    );
  });
});
