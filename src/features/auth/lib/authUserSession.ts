import type { AppUser, AuthUser } from '@/contexts/auth';
import { getUser, upsertUser, usernameExists } from '@/services/users';
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

function getUserNameParts(displayName: string | null, email: string) {
  const nameParts = displayName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (nameParts.length === 0) {
    return {
      firstName: email.split('@')[0] || 'User',
      middleName: '',
      lastName: '',
    };
  }

  if (nameParts.length === 1) {
    return {
      firstName: nameParts[0],
      middleName: '',
      lastName: '',
    };
  }

  return {
    firstName: nameParts[nameParts.length - 1],
    middleName: nameParts.slice(1, -1).join(' '),
    lastName: nameParts[0],
  };
}

async function createUniqueUsername(email: string): Promise<string> {
  const fallback = `user${Date.now().toString(36)}`;
  const baseUsername =
    email
      .split('@')[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20) || fallback;

  let username =
    baseUsername.length >= 3 ? baseUsername : `${baseUsername}${fallback}`.slice(0, 20);
  let suffix = 1;

  while (await usernameExists(username)) {
    const suffixText = suffix.toString();
    username = `${baseUsername.slice(0, 20 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return username;
}

async function createAppUserFromAuthUser(user: User): Promise<AppUser> {
  const email = user.email ?? '';
  const displayName =
    getStringMetadata(user, 'full_name') || getStringMetadata(user, 'name') || null;
  const userNameParts = getUserNameParts(displayName, email);
  const username = getStringMetadata(user, 'username') || (await createUniqueUsername(email));
  const appUser: AppUser = {
    uid: user.id,
    email,
    firstName: getStringMetadata(user, 'first_name') || userNameParts.firstName,
    lastName: getStringMetadata(user, 'last_name') || userNameParts.lastName,
    middleName: getStringMetadata(user, 'middle_name') || userNameParts.middleName,
    nickname: getStringMetadata(user, 'nickname'),
    username,
    phoneNumber: '-',
    schoolName: '',
    enterYear: '',
    cohort: '',
    gender: null,
    avatarUrl: getStringMetadata(user, 'avatar_url'),
    avatarKey: getStringMetadata(user, 'avatar_key'),
    role: 'member',
  };

  return upsertUser(appUser);
}

export async function loadOrCreateAppUser(user: User): Promise<AppUser> {
  return (await getUser(user.id)) ?? (await createAppUserFromAuthUser(user));
}
