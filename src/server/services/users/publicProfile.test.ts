import { describe, expect, it, vi } from 'vitest';
import { createPublicUserProfileService } from './publicProfile';
import { getEmptyOrganizationProfile } from '@/features/users/organizationProfile';
import type { UserRecord } from '@/server/repositories/users/userRepository';

const activeUser: UserRecord = {
  id: 'user-1',
  email: 'member@example.com',
  firstName: 'An',
  lastName: 'Nguyen',
  middleName: '',
  nickname: 'An',
  username: 'member',
  phoneNumber: '0900000000',
  schoolName: 'VIT',
  enterYear: '2024',
  cohort: 'K1',
  gender: 1,
  avatarUrl: '',
  avatarKey: '',
  role: 'member',
  status: 'active',
};

function createService(user: UserRecord | null) {
  const organizationProfile = {
    ...getEmptyOrganizationProfile(),
    currentRoles: [
      {
        id: 'role-1',
        roleKey: 'captain' as const,
        roleLabel: 'Đội trưởng',
        scopeType: 'organization' as const,
        scopeName: 'Toàn Đội',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: null,
        status: 'active' as const,
      },
    ],
  };
  const findByUsername = vi.fn(async () => user);
  const getForUser = vi.fn(async () => organizationProfile);

  return {
    service: createPublicUserProfileService({
      users: { findByUsername },
      organizationProfiles: { getForUser },
      now: () => new Date('2026-07-02T00:00:00.000Z'),
    }),
    findByUsername,
    getForUser,
    organizationProfile,
  };
}

describe('public user profile service', () => {
  it('returns an active user profile with organization information', async () => {
    const dependencies = createService(activeUser);

    await expect(
      dependencies.service.getPublicUserProfileByUsername('Member'),
    ).resolves.toMatchObject({
      uid: 'user-1',
      username: 'member',
      organizationProfile: dependencies.organizationProfile,
    });
    expect(dependencies.findByUsername).toHaveBeenCalledWith('Member');
    expect(dependencies.getForUser).toHaveBeenCalledWith(
      'user-1',
      '2026-07-02T00:00:00.000Z',
    );
  });

  it('does not expose disabled users', async () => {
    const dependencies = createService({ ...activeUser, status: 'disabled' });

    await expect(
      dependencies.service.getPublicUserProfileByUsername('member'),
    ).resolves.toBeNull();
    expect(dependencies.getForUser).not.toHaveBeenCalled();
  });

  it('does not query for a blank username', async () => {
    const dependencies = createService(activeUser);

    await expect(dependencies.service.getPublicUserProfileByUsername('  ')).resolves.toBeNull();
    expect(dependencies.findByUsername).not.toHaveBeenCalled();
  });
});
