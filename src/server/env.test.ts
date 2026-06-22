import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabasePublicServerConfig } from './env';

describe('getSupabasePublicServerConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the host-reachable URL outside Docker', () => {
    vi.stubEnv('DOCKER_CONTAINER', '');
    vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('SUPABASE_INTERNAL_URL', 'http://host.docker.internal:54321');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(getSupabasePublicServerConfig().supabaseUrl).toBe('http://127.0.0.1:54321');
  });

  it('uses the container-reachable URL inside Docker', () => {
    vi.stubEnv('DOCKER_CONTAINER', 'true');
    vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('SUPABASE_INTERNAL_URL', 'http://host.docker.internal:54321');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(getSupabasePublicServerConfig().supabaseUrl).toBe(
      'http://host.docker.internal:54321',
    );
  });
});
