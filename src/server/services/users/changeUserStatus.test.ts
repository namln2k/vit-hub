import { describe, expect, it, vi } from 'vitest';
import { createChangeUserStatus } from './changeUserStatus';
import { NotFoundError } from '@/server/services/shared/errors';

describe('changeUserStatus', () => {
  it('authorizes the actor and updates an existing user', async () => {
    const requireOrganizationPermission = vi.fn(async () => undefined);
    const findAccountById = vi.fn(async () => ({
      id: 'target-user',
      role: 'member' as const,
      status: 'active' as const,
    }));
    const updateStatus = vi.fn(async () => ({
      id: 'target-user',
      status: 'disabled' as const,
      updatedAt: '2026-06-18T10:00:00.000Z',
    }));
    const changeUserStatus = createChangeUserStatus({
      authorization: { requireOrganizationPermission },
      users: { findAccountById, updateStatus },
      now: () => new Date('2026-06-18T10:00:00.000Z'),
    });

    await expect(
      changeUserStatus({ userId: 'actor-user' }, { userId: 'target-user', status: 'disabled' }),
    ).resolves.toEqual({
      userId: 'target-user',
      status: 'disabled',
      updatedAt: '2026-06-18T10:00:00.000Z',
    });
    expect(requireOrganizationPermission).toHaveBeenCalledWith(
      { userId: 'actor-user' },
      'scope.member.manage',
    );
    expect(updateStatus).toHaveBeenCalledWith(
      'target-user',
      'disabled',
      '2026-06-18T10:00:00.000Z',
    );
  });

  it('rejects a missing target user', async () => {
    const changeUserStatus = createChangeUserStatus({
      authorization: { requireOrganizationPermission: async () => undefined },
      users: {
        findAccountById: async () => null,
        updateStatus: vi.fn(),
      },
      now: () => new Date('2026-06-18T10:00:00.000Z'),
    });

    await expect(
      changeUserStatus({ userId: 'actor-user' }, { userId: 'missing-user', status: 'disabled' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('does not write when the requested status is already current', async () => {
    const updateStatus = vi.fn();
    const changeUserStatus = createChangeUserStatus({
      authorization: { requireOrganizationPermission: async () => undefined },
      users: {
        findAccountById: async () => ({
          id: 'target-user',
          role: 'member',
          status: 'active',
        }),
        updateStatus,
      },
      now: () => new Date('2026-06-18T10:00:00.000Z'),
    });

    await expect(
      changeUserStatus({ userId: 'actor-user' }, { userId: 'target-user', status: 'active' }),
    ).resolves.toEqual({
      userId: 'target-user',
      status: 'active',
      updatedAt: '2026-06-18T10:00:00.000Z',
    });
    expect(updateStatus).not.toHaveBeenCalled();
  });
});
