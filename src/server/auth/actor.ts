import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { AuthenticationRequiredError } from '@/server/services/shared/errors';
import type { Actor } from '@/server/services/shared/actor';
import type { AuthIdentity } from '@/server/services/auth/identity';

export async function getWebActor(): Promise<Actor | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { userId: user.id };
}

export async function requireWebActor(): Promise<Actor> {
  const actor = await getWebActor();

  if (!actor) {
    throw new AuthenticationRequiredError();
  }

  return actor;
}

export async function getWebAuthIdentity(): Promise<AuthIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    actor: { userId: user.id },
    email: user.email ?? '',
    metadata: user.user_metadata,
  };
}

export async function requireWebAuthIdentity(): Promise<AuthIdentity> {
  const identity = await getWebAuthIdentity();

  if (!identity) {
    throw new AuthenticationRequiredError();
  }

  return identity;
}
