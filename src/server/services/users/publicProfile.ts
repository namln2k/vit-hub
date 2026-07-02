import 'server-only';

import {
  userRepository,
  type UserRecord,
  type UserRepository,
} from '@/server/repositories/users/userRepository';
import {
  userOrganizationProfileRepository,
  type UserOrganizationProfileRepository,
} from '@/server/repositories/users/userOrganizationProfileRepository';
import { mapUserSummary } from '@/server/services/users/searchUsers';
import type { UserSummaryDto } from '@/features/users/types';

interface PublicUserProfileDependencies {
  users: Pick<UserRepository, 'findByUsername'>;
  organizationProfiles: UserOrganizationProfileRepository;
  now(): Date;
}

const defaultDependencies: PublicUserProfileDependencies = {
  users: userRepository,
  organizationProfiles: userOrganizationProfileRepository,
  now: () => new Date(),
};

export function createPublicUserProfileService(
  dependencies: PublicUserProfileDependencies = defaultDependencies,
) {
  async function getPublicUserProfileByUsername(
    username: string,
  ): Promise<UserSummaryDto | null> {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      return null;
    }

    const user = await dependencies.users.findByUsername(normalizedUsername);

    if (!user || user.status !== 'active') {
      return null;
    }

    return mapPublicUserProfile(user);
  }

  async function mapPublicUserProfile(user: UserRecord): Promise<UserSummaryDto> {
    return {
      ...mapUserSummary(user),
      organizationProfile: await dependencies.organizationProfiles.getForUser(
        user.id,
        dependencies.now().toISOString(),
      ),
    };
  }

  return {
    getPublicUserProfileByUsername,
  };
}

export const { getPublicUserProfileByUsername } = createPublicUserProfileService();
