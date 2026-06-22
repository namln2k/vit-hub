import { describe, expect, it } from 'vitest';
import { isolatedProcessEnv, validateProfile } from './env-contract.mjs';

const required = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

describe('environment profiles', () => {
  it('accepts hosted production credentials', () => {
    expect(
      validateProfile('production', {
        ...required,
        NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toMatchObject({
      profile: 'production',
      supabaseOrigin: 'https://project.supabase.co',
    });
  });

  it('accepts local Supabase host and Docker URLs', () => {
    expect(
      validateProfile('local', {
        ...required,
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        SUPABASE_INTERNAL_URL: 'http://host.docker.internal:54321',
      }),
    ).toMatchObject({
      profile: 'local',
      supabaseOrigin: 'http://127.0.0.1:54321',
    });
  });

  it('rejects a PostgreSQL connection string as the public URL', () => {
    expect(() =>
      validateProfile('local', {
        ...required,
        NEXT_PUBLIC_SUPABASE_URL: 'postgresql://127.0.0.1:54322/postgres',
        SUPABASE_INTERNAL_URL: 'http://host.docker.internal:54321',
      }),
    ).toThrow('must use HTTP or HTTPS');
  });

  it('sets missing app variables to empty so Next.js cannot mix profiles', () => {
    const env = isolatedProcessEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      VIT_HUB_ENV_PROFILE: 'production',
    });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://project.supabase.co');
    expect(env.SUPABASE_INTERNAL_URL).toBe('');
    expect(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID).toBe('');
  });
});
