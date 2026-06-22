import { describe, expect, it, vi } from 'vitest';
import { createUserProfileService } from './profile';
import type {
  CreateUserRecordInput,
  UpdateUserProfileRecordInput,
  UserRecord,
} from '@/server/repositories/users/userRepository';
import type { AuthIdentity } from '@/server/services/auth/identity';
import { ForbiddenError, NotFoundError } from '@/server/services/shared/errors';

const existingRecord: UserRecord = {
  id: 'user-1',
  email: 'member@example.com',
  firstName: 'An',
  lastName: 'Nguyen',
  middleName: null,
  nickname: null,
  username: 'member',
  phoneNumber: '0900000000',
  schoolName: 'VIT',
  enterYear: '2024',
  cohort: 'K1',
  gender: null,
  avatarUrl: null,
  avatarKey: null,
  role: 'member',
  status: 'active',
};

const identity: AuthIdentity = {
  actor: { userId: 'user-1' },
  email: 'Member@Example.com',
  metadata: {},
};

function createDependencies(overrides: { existing?: UserRecord | null; created?: UserRecord }) {
  const create = vi.fn(async (input: CreateUserRecordInput) => {
    void input;
    return overrides.created ?? existingRecord;
  });
  const findById = vi.fn(async () => overrides.existing ?? null);
  const updateProfile = vi.fn(
    async (userId: string, input: UpdateUserProfileRecordInput, updatedAt: string) => {
      void updatedAt;
      return {
        ...existingRecord,
        id: userId,
        ...input,
      };
    },
  );
  const usernameExists = vi.fn(async () => false);

  return {
    service: createUserProfileService({
      users: {
        create,
        findById,
        updateProfile,
        usernameExists,
      },
      now: () => new Date('2026-06-18T10:00:00.000Z'),
    }),
    create,
    findById,
    updateProfile,
    usernameExists,
  };
}

describe('user profile service', () => {
  it('returns an existing profile without provisioning it again', async () => {
    const dependencies = createDependencies({ existing: existingRecord });

    await expect(dependencies.service.getCurrentUserProfile(identity)).resolves.toMatchObject({
      uid: 'user-1',
      username: 'member',
      role: 'member',
      status: 'active',
    });
    expect(dependencies.create).not.toHaveBeenCalled();
    expect(dependencies.usernameExists).not.toHaveBeenCalled();
  });

  it('provisions a member profile without trusting role or status metadata', async () => {
    const dependencies = createDependencies({ existing: null });

    await dependencies.service.getCurrentUserProfile({
      ...identity,
      metadata: {
        full_name: 'Nguyen Van An',
        username: 'valid_member',
        role: 'super_admin',
        status: 'disabled',
      },
    });

    expect(dependencies.create).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'member@example.com',
      firstName: 'An',
      lastName: 'Nguyen',
      middleName: 'Van',
      nickname: '',
      username: 'valid_member',
      avatarUrl: '',
      avatarKey: '',
    });
    expect(dependencies.create.mock.calls[0]?.[0]).not.toHaveProperty('role');
    expect(dependencies.create.mock.calls[0]?.[0]).not.toHaveProperty('status');
  });

  it('generates a unique username when Auth metadata is invalid', async () => {
    const dependencies = createDependencies({ existing: null });
    dependencies.usernameExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await dependencies.service.getCurrentUserProfile({
      ...identity,
      email: 'Bad.Email@example.com',
      metadata: { username: 'admin user!' },
    });

    expect(dependencies.usernameExists).toHaveBeenNthCalledWith(1, 'bad_email');
    expect(dependencies.usernameExists).toHaveBeenNthCalledWith(2, 'bad_email1');
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'bad_email1' }),
    );
  });

  it('ignores a metadata avatar key outside the authenticated user namespace', async () => {
    const dependencies = createDependencies({ existing: null });

    await dependencies.service.getCurrentUserProfile({
      ...identity,
      metadata: {
        username: 'member_one',
        avatar_url: 'https://cdn.example.com/avatar.png',
        avatar_key: 'avatars/another-user/avatar.png',
      },
    });

    expect(dependencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        avatarUrl: 'https://cdn.example.com/avatar.png',
        avatarKey: '',
      }),
    );
  });

  it('updates only the authenticated actor profile', async () => {
    const dependencies = createDependencies({ existing: existingRecord });

    await dependencies.service.updateCurrentUserNickname(
      { userId: 'actor-user' },
      { nickname: 'New name' },
    );

    expect(dependencies.findById).toHaveBeenCalledWith('actor-user');
    expect(dependencies.updateProfile).toHaveBeenCalledWith(
      'actor-user',
      { nickname: 'New name' },
      '2026-06-18T10:00:00.000Z',
    );
  });

  it('rejects profile updates when the actor has no application profile', async () => {
    const dependencies = createDependencies({ existing: null });

    await expect(
      dependencies.service.updateCurrentUserNickname(
        { userId: 'missing-user' },
        { nickname: 'New name' },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(dependencies.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects avatar keys outside the authenticated actor namespace', async () => {
    const dependencies = createDependencies({ existing: existingRecord });

    expect(() =>
      dependencies.service.setCurrentUserAvatar(
        { userId: 'user-1' },
        {
          avatarUrl: 'https://cdn.example.com/avatar.png',
          avatarKey: 'avatars/another-user/avatar.png',
        },
      ),
    ).toThrow(ForbiddenError);
    expect(dependencies.updateProfile).not.toHaveBeenCalled();
  });
});
