import { describe, expect, it, vi } from 'vitest';
import { createImportUsersService } from './importUsers';
import type { ImportUsersInput } from '@/features/users/schemas/importUsers';
import { AuthSignUpPersistenceError } from '@/server/repositories/auth/authRepository';
import {
  ConflictError,
  DomainValidationError,
  ForbiddenError,
} from '@/server/services/shared/errors';
import type { SignUpWithPasswordInput } from '@/server/repositories/auth/authRepository';
import type { UserAccountRecord } from '@/server/repositories/users/userRepository';

const input: ImportUsersInput = {
  users: [
    {
      email: 'first@example.com',
      firstName: 'An',
      lastName: 'Nguyen',
      middleName: 'Van',
      phoneNumber: '0900001234',
      schoolName: 'VIT',
      enterYear: '2024',
      cohort: 'K1',
      gender: 1,
    },
    {
      email: 'second@example.com',
      firstName: 'Binh',
      lastName: 'Tran',
      middleName: '',
      phoneNumber: '-',
      schoolName: '',
      enterYear: '',
      cohort: '',
      gender: null,
    },
  ],
};

function createDependencies() {
  const findAccountById = vi.fn(
    async (): Promise<UserAccountRecord | null> => ({
      id: 'admin-1',
      role: 'super_admin',
      status: 'active',
    }),
  );
  const findExistingEmails = vi.fn(async () => [] as string[]);
  const listUsernames = vi.fn(async () => ['first_1234']);
  let authSequence = 0;
  const signUpWithPassword = vi.fn(async (authInput: SignUpWithPasswordInput) => {
    void authInput;
    authSequence += 1;
    return { userId: `auth-${authSequence}`, session: null };
  });
  const deleteUsers = vi.fn(async () => undefined);
  const createMany = vi.fn(async (records: unknown[]) => records.length);

  return {
    service: createImportUsersService({
      auth: { signUpWithPassword, deleteUsers },
      users: {
        findAccountById,
        findExistingEmails,
        listUsernames,
        createMany,
      },
      generateTemporaryPassword: () => 'temporary-password-A1!',
    }),
    findAccountById,
    findExistingEmails,
    listUsernames,
    signUpWithPassword,
    deleteUsers,
    createMany,
  };
}

describe('importUsers', () => {
  it('requires an active super-admin before reading import data', async () => {
    const dependencies = createDependencies();
    dependencies.findAccountById.mockResolvedValue({
      id: 'member-1',
      role: 'member',
      status: 'active',
    });

    await expect(dependencies.service({ userId: 'member-1' }, input)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(dependencies.findExistingEmails).not.toHaveBeenCalled();
  });

  it('rejects duplicate emails inside the import before persistence', async () => {
    const dependencies = createDependencies();

    await expect(
      dependencies.service(
        { userId: 'admin-1' },
        {
          users: [input.users[0], { ...input.users[1], email: input.users[0].email }],
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(dependencies.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('rejects emails already present in the application database', async () => {
    const dependencies = createDependencies();
    dependencies.findExistingEmails.mockResolvedValue(['first@example.com']);

    await expect(dependencies.service({ userId: 'admin-1' }, input)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(dependencies.signUpWithPassword).not.toHaveBeenCalled();
  });

  it('creates Auth identities and one fixed-default application batch', async () => {
    const dependencies = createDependencies();

    await expect(dependencies.service({ userId: 'admin-1' }, input)).resolves.toBe(2);
    expect(dependencies.signUpWithPassword).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        email: 'first@example.com',
        password: 'temporary-password-A1!',
        metadata: expect.objectContaining({
          username: 'first_1234_1',
        }),
      }),
    );
    expect(dependencies.signUpWithPassword.mock.calls[0]?.[0].metadata).not.toHaveProperty('role');
    expect(dependencies.createMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'auth-1',
        email: 'first@example.com',
        username: 'first_1234_1',
      }),
      expect.objectContaining({
        id: 'auth-2',
        email: 'second@example.com',
        username: 'second',
      }),
    ]);
  });

  it('deletes earlier Auth identities if a later signup conflicts', async () => {
    const dependencies = createDependencies();
    dependencies.signUpWithPassword
      .mockResolvedValueOnce({ userId: 'auth-1', session: null })
      .mockRejectedValueOnce(
        new AuthSignUpPersistenceError('duplicate_email', 'User already registered'),
      );

    await expect(dependencies.service({ userId: 'admin-1' }, input)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(dependencies.deleteUsers).toHaveBeenCalledWith(['auth-1']);
    expect(dependencies.createMany).not.toHaveBeenCalled();
  });

  it('deletes all created Auth identities if the application batch fails', async () => {
    const dependencies = createDependencies();
    dependencies.createMany.mockRejectedValue(new Error('database unavailable'));

    await expect(dependencies.service({ userId: 'admin-1' }, input)).rejects.toMatchObject({
      code: 'INFRASTRUCTURE',
    });
    expect(dependencies.deleteUsers).toHaveBeenCalledWith(['auth-1', 'auth-2']);
  });
});
