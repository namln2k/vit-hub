import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseServerConfig } from './env';

describe('getSupabaseServerConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the host-reachable URL outside Docker', () => {
    vi.stubEnv('DOCKER_CONTAINER', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('SUPABASE_INTERNAL_URL', 'http://host.docker.internal:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(getSupabaseServerConfig().supabaseUrl).toBe('http://127.0.0.1:54321');
  });

  it('uses the container-reachable URL inside Docker', () => {
    vi.stubEnv('DOCKER_CONTAINER', 'true');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('SUPABASE_INTERNAL_URL', 'http://host.docker.internal:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key');

    expect(getSupabaseServerConfig().supabaseUrl).toBe('http://host.docker.internal:54321');
  });
});
