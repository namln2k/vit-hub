import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  authRepository,
  AuthSignUpPersistenceError,
  type AuthRepository,
} from '@/server/repositories/auth/authRepository';
import {
  userRepository,
  UserRecordConflictError,
  type ImportUserRecordInput,
  type UserRepository,
} from '@/server/repositories/users/userRepository';
import type { ImportUsersInput } from '@/features/users/schemas/importUsers';
import type { Actor } from '@/server/services/shared/actor';
import {
  ConflictError,
  DomainValidationError,
  ForbiddenError,
  InfrastructureError,
} from '@/server/services/shared/errors';

interface ImportUsersDependencies {
  auth: Pick<AuthRepository, 'deleteUsers' | 'signUpWithPassword'>;
  users: Pick<
    UserRepository,
    'createMany' | 'findAccountById' | 'findExistingEmails' | 'listUsernames'
  >;
  generateTemporaryPassword(): string;
}

const defaultDependencies: ImportUsersDependencies = {
  auth: authRepository,
  users: userRepository,
  generateTemporaryPassword: () => `${randomUUID()}A1!`,
};

export function createImportUsersService(
  dependencies: ImportUsersDependencies = defaultDependencies,
) {
  return async function importUsers(actor: Actor, input: ImportUsersInput): Promise<number> {
    const account = await dependencies.users.findAccountById(actor.userId);

    if (!account || account.status !== 'active' || account.role !== 'super_admin') {
      throw new ForbiddenError('Bạn không có quyền import nhân sự.');
    }

    const duplicateEmails = findDuplicateEmails(input.users.map((user) => user.email));

    if (duplicateEmails.length > 0) {
      throw new DomainValidationError(`File có email bị trùng: ${duplicateEmails.join(', ')}.`, {
        users: ['Danh sách import chứa email trùng.'],
      });
    }

    const existingEmails = await dependencies.users.findExistingEmails(
      input.users.map((user) => user.email),
    );

    if (existingEmails.length > 0) {
      throw new ConflictError(`Email đã tồn tại trong hệ thống: ${existingEmails.join(', ')}.`);
    }

    const usernames = assignGeneratedUsernames(
      input.users,
      await dependencies.users.listUsernames(),
    );
    const createdAuthUserIds: string[] = [];

    try {
      const records: ImportUserRecordInput[] = [];

      for (const [index, user] of input.users.entries()) {
        const authResult = await dependencies.auth.signUpWithPassword({
          email: user.email,
          password: dependencies.generateTemporaryPassword(),
          emailRedirectTo: '',
          metadata: getUserMetadata(user, usernames[index]),
        });
        createdAuthUserIds.push(authResult.userId);
        records.push({
          id: authResult.userId,
          ...user,
          username: usernames[index],
        });
      }

      return await dependencies.users.createMany(records);
    } catch (error) {
      await cleanupAuthUsers(dependencies.auth, createdAuthUserIds);

      if (error instanceof AuthSignUpPersistenceError && error.reason === 'duplicate_email') {
        throw new ConflictError('Một email trong danh sách đã tồn tại trong Supabase Auth.');
      }

      if (error instanceof UserRecordConflictError) {
        throw new ConflictError(
          'Email hoặc username đã tồn tại. Không có nhân sự nào được import.',
        );
      }

      if (
        error instanceof ConflictError ||
        error instanceof DomainValidationError ||
        error instanceof ForbiddenError ||
        error instanceof InfrastructureError
      ) {
        throw error;
      }

      throw new InfrastructureError('Không thể import nhân sự.', {
        cause: error,
      });
    }
  };
}

export const importUsers = createImportUsersService();

function findDuplicateEmails(emails: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const email of emails) {
    if (seen.has(email)) {
      duplicates.add(email);
    }

    seen.add(email);
  }

  return [...duplicates];
}

function assignGeneratedUsernames(users: ImportUsersInput['users'], existingUsernames: string[]) {
  const usedUsernames = new Set(existingUsernames.map((username) => username.toLowerCase()));

  return users.map((user, index) => {
    const baseUsername = getBaseUsername(user, index);
    let username = baseUsername;
    let suffix = 1;

    while (usedUsernames.has(username.toLowerCase())) {
      const suffixText = `_${suffix}`;
      username = `${baseUsername.slice(0, 20 - suffixText.length)}${suffixText}`;
      suffix += 1;
    }

    usedUsernames.add(username.toLowerCase());
    return username;
  });
}

function getBaseUsername(user: ImportUsersInput['users'][number], index: number) {
  const emailUsername = normalizeSlug(user.email.split('@')[0] ?? '');
  const nameSlug = normalizeSlug(`${user.lastName} ${user.middleName} ${user.firstName}`);
  const phoneDigits = user.phoneNumber.replace(/\D/g, '').slice(-4);
  const fallback = `user_${index + 1}`;
  const base = [emailUsername || nameSlug || fallback, phoneDigits]
    .filter(Boolean)
    .join('_')
    .slice(0, 20);

  return base.length >= 3 ? base : `${base}_${fallback}`.slice(0, 20);
}

function normalizeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

function getUserMetadata(user: ImportUsersInput['users'][number], username: string) {
  return {
    avatar_key: '',
    avatar_url: '',
    first_name: user.firstName,
    full_name: `${user.lastName} ${user.middleName} ${user.firstName}`.trim(),
    last_name: user.lastName,
    middle_name: user.middleName,
    nickname: '',
    username,
  };
}

async function cleanupAuthUsers(auth: Pick<AuthRepository, 'deleteUsers'>, userIds: string[]) {
  if (userIds.length === 0) {
    return;
  }

  try {
    await auth.deleteUsers(userIds);
  } catch (cleanupError) {
    console.error('Failed to fully compensate an unsuccessful user import.', cleanupError);
  }
}
