import { describe, expect, it, vi } from 'vitest';
import { createUserQueries } from './searchUsers';
import type { UserRecord } from '@/server/repositories/users/userRepository';

const record: UserRecord = {
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

describe('user queries', () => {
  it('returns a paginated public search DTO without personnel fields', async () => {
    const search = vi.fn(async () => ({ records: [record], total: 3 }));
    const queries = createUserQueries({
      users: { search },
      authorization: { requireOrganizationPermission: async () => undefined },
    });

    await expect(queries.searchUsers({ search: 'member', limit: 1 })).resolves.toEqual({
      items: [
        {
          uid: 'user-1',
          email: 'member@example.com',
          firstName: 'An',
          lastName: 'Nguyen',
          middleName: '',
          nickname: '',
          username: 'member',
          avatarUrl: '',
          role: 'member',
          status: 'active',
        },
      ],
      total: 3,
      limit: 1,
      offset: 0,
      hasMore: true,
    });
  });

  it('requires organization permission before listing administrative user DTOs', async () => {
    const requireOrganizationPermission = vi.fn(async () => undefined);
    const queries = createUserQueries({
      users: {
        search: async () => ({ records: [record], total: 1 }),
      },
      authorization: { requireOrganizationPermission },
    });

    const users = await queries.listUsersForAdministration({ userId: 'actor-user' });

    expect(requireOrganizationPermission).toHaveBeenCalledWith(
      { userId: 'actor-user' },
      'scope.member.manage',
    );
    expect(users[0]).toMatchObject({
      uid: 'user-1',
      phoneNumber: '0900000000',
      schoolName: 'VIT',
    });
  });
});
