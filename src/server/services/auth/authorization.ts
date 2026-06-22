import 'server-only';

import { userRepository, type UserRepository } from '@/server/repositories/users/userRepository';
import type { Actor } from '@/server/services/shared/actor';
import { ForbiddenError } from '@/server/services/shared/errors';

interface AuthAuthorizationDependencies {
  users: Pick<UserRepository, 'findAccountById'>;
}

const defaultDependencies: AuthAuthorizationDependencies = {
  users: userRepository,
};

export function createAuthAuthorization(
  dependencies: AuthAuthorizationDependencies = defaultDependencies,
) {
  return {
    async requireActiveSuperAdmin(actor: Actor) {
      const account = await dependencies.users.findAccountById(actor.userId);

      if (!account || account.status !== 'active' || account.role !== 'super_admin') {
        throw new ForbiddenError('Bạn không có quyền truy cập bảng quản trị.');
      }
    },
  };
}

export const authAuthorization = createAuthAuthorization();
