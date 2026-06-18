import 'server-only';

import { getSupabaseAdminServerConfig, getSupabasePublicServerConfig } from '@/server/env';
import { supabaseFetch } from '@/server/supabase';

export type AuthSignUpFailureReason = 'duplicate_email' | 'email_delivery' | 'unknown';

export class AuthSignUpPersistenceError extends Error {
  constructor(
    public readonly reason: AuthSignUpFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'AuthSignUpPersistenceError';
  }
}

export interface AuthSessionRecord {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSignUpRecord {
  userId: string;
  session: AuthSessionRecord | null;
}

export interface SignUpWithPasswordInput {
  email: string;
  password: string;
  emailRedirectTo: string;
  metadata: Record<string, unknown>;
}

export interface AuthRepository {
  signUpWithPassword(input: SignUpWithPasswordInput): Promise<AuthSignUpRecord>;
  updateUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  deleteUsers(userIds: string[]): Promise<void>;
}

async function deleteAuthUser(userId: string) {
  getSupabaseAdminServerConfig();
  const { response } = await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error('Could not remove the Supabase Auth user.');
  }
}

interface SignUpResponse {
  id?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  user?: {
    id?: unknown;
    identities?: unknown;
  } | null;
  session?: {
    access_token?: unknown;
    refresh_token?: unknown;
  } | null;
  error?: unknown;
  error_description?: unknown;
  msg?: unknown;
}

export const authRepository: AuthRepository = {
  async signUpWithPassword(input) {
    const { supabaseUrl, publishableKey } = getSupabasePublicServerConfig();
    const signupUrl = new URL(`${supabaseUrl}/auth/v1/signup`);

    if (input.emailRedirectTo) {
      signupUrl.searchParams.set('redirect_to', input.emailRedirectTo);
    }

    const response = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        data: input.metadata,
      }),
    });
    const data = (await response.json()) as SignUpResponse;

    if (!response.ok) {
      const message = readAuthErrorMessage(data);
      throw new AuthSignUpPersistenceError(classifyAuthFailure(message), message);
    }

    if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
      throw new AuthSignUpPersistenceError('duplicate_email', 'User already registered');
    }

    const userId =
      typeof data.user?.id === 'string' ? data.user.id : typeof data.id === 'string' ? data.id : '';

    if (!userId) {
      throw new AuthSignUpPersistenceError(
        'unknown',
        'Supabase Auth did not return a user identifier.',
      );
    }

    const accessToken =
      typeof data.session?.access_token === 'string'
        ? data.session.access_token
        : typeof data.access_token === 'string'
          ? data.access_token
          : '';
    const refreshToken =
      typeof data.session?.refresh_token === 'string'
        ? data.session.refresh_token
        : typeof data.refresh_token === 'string'
          ? data.refresh_token
          : '';

    return {
      userId,
      session: accessToken && refreshToken ? { accessToken, refreshToken } : null,
    };
  },

  async updateUserMetadata(userId, metadata) {
    const { response } = await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: { user_metadata: metadata },
    });

    if (!response.ok) {
      throw new Error('Could not update Supabase Auth user metadata.');
    }
  },

  async deleteUser(userId) {
    await deleteAuthUser(userId);
  },

  async deleteUsers(userIds) {
    const results = await Promise.allSettled(userIds.map(deleteAuthUser));
    const failures = results.filter((result) => result.status === 'rejected');

    if (failures.length > 0) {
      throw new AggregateError(
        failures.map((failure) => failure.reason),
        'Could not remove all Supabase Auth users.',
      );
    }
  },
};

function readAuthErrorMessage(data: SignUpResponse) {
  for (const value of [data.error_description, data.msg, data.error]) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return 'Supabase Auth sign-up failed.';
}

function classifyAuthFailure(message: string): AuthSignUpFailureReason {
  if (/user already registered|already registered/i.test(message)) {
    return 'duplicate_email';
  }

  if (/error sending confirmation email/i.test(message)) {
    return 'email_delivery';
  }

  return 'unknown';
}
