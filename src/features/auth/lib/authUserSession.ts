import type { AuthUser } from '@/contexts/auth';
import type { User } from '@supabase/supabase-js';

function getStringMetadata(user: User, key: string) {
  const value = user.user_metadata[key];
  return typeof value === 'string' ? value : '';
}

export function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    uid: user.id,
    email: user.email ?? null,
    displayName: getStringMetadata(user, 'full_name') || getStringMetadata(user, 'name') || null,
    photoURL: getStringMetadata(user, 'avatar_url') || null,
  };
}
