import { describe, expect, it } from 'vitest';
import { createAuthAuthorization } from './authorization';
import { ForbiddenError } from '@/server/services/shared/errors';

describe('authAuthorization', () => {
  it('allows active super admins', async () => {
    const authorization = createAuthAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'admin',
          email: 'admin@example.com',
          role: 'super_admin',
          status: 'active',
        }),
      },
    });

    await expect(authorization.requireActiveSuperAdmin({ userId: 'admin' })).resolves.toBeUndefined();
  });

  it('rejects non-admin accounts', async () => {
    const authorization = createAuthAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'member',
          email: 'member@example.com',
          role: 'member',
          status: 'active',
        }),
      },
    });

    await expect(authorization.requireActiveSuperAdmin({ userId: 'member' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
