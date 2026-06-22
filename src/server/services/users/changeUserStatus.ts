import 'server-only';

import { organizationAuthorization } from '@/server/services/organization/authorization';
import { userRepository, type UserRepository } from '@/server/repositories/users/userRepository';
import { NotFoundError } from '@/server/services/shared/errors';
import type { Actor } from '@/server/services/shared/actor';
import type { UserStatus } from '@/features/organization-structure/permissions';
import type { UserStatusDto } from '@/features/users/types';

interface ChangeUserStatusDependencies {
  users: Pick<UserRepository, 'findAccountById' | 'updateStatus'>;
  authorization: Pick<typeof organizationAuthorization, 'requireOrganizationPermission'>;
  now(): Date;
}

const defaultDependencies: ChangeUserStatusDependencies = {
  users: userRepository,
  authorization: organizationAuthorization,
  now: () => new Date(),
};

export function createChangeUserStatus(
  dependencies: ChangeUserStatusDependencies = defaultDependencies,
) {
  return async function changeUserStatus(
    actor: Actor,
    input: { userId: string; status: UserStatus },
  ): Promise<UserStatusDto> {
    await dependencies.authorization.requireOrganizationPermission(actor, 'scope.member.manage');

    const target = await dependencies.users.findAccountById(input.userId);

    if (!target) {
      throw new NotFoundError('nhân sự', input.userId);
    }

    if (target.status === input.status) {
      return {
        userId: target.id,
        status: target.status,
        updatedAt: dependencies.now().toISOString(),
      };
    }

    const updated = await dependencies.users.updateStatus(
      input.userId,
      input.status,
      dependencies.now().toISOString(),
    );

    return {
      userId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  };
}

export const changeUserStatus = createChangeUserStatus();
