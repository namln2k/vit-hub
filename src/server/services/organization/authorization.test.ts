import { describe, expect, it } from 'vitest';
import { createOrganizationAuthorization } from './authorization';
import { AuthenticationRequiredError, ForbiddenError } from '@/server/services/shared/errors';

const now = () => new Date('2026-06-18T10:00:00.000Z');

describe('organizationAuthorization', () => {
  it('allows an active super admin without loading assignments', async () => {
    let assignmentsLoaded = false;
    const authorization = createOrganizationAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'actor-user',
          role: 'super_admin',
          status: 'active',
        }),
      },
      organization: {
        listRoleAssignments: async () => {
          assignmentsLoaded = true;
          return [];
        },
        listPermissionGrants: async () => [],
        findClubParentDivisionId: async () => null,
      },
      now,
    });

    await expect(
      authorization.requireOrganizationPermission({ userId: 'actor-user' }, 'scope.member.manage'),
    ).resolves.toBeUndefined();
    expect(assignmentsLoaded).toBe(false);
  });

  it('rejects a disabled account', async () => {
    const authorization = createOrganizationAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'actor-user',
          role: 'super_admin',
          status: 'disabled',
        }),
      },
      organization: {
        listRoleAssignments: async () => [],
        listPermissionGrants: async () => [],
        findClubParentDivisionId: async () => null,
      },
      now,
    });

    await expect(
      authorization.requireOrganizationPermission({ userId: 'actor-user' }, 'scope.member.manage'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects an identity without an application account', async () => {
    const authorization = createOrganizationAuthorization({
      users: { findAccountById: async () => null },
      organization: {
        listRoleAssignments: async () => [],
        listPermissionGrants: async () => [],
        findClubParentDivisionId: async () => null,
      },
      now,
    });

    await expect(
      authorization.requireOrganizationPermission({ userId: 'actor-user' }, 'scope.member.manage'),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it('allows an effective organization assignment with a matching grant', async () => {
    const authorization = createOrganizationAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'actor-user',
          role: 'member',
          status: 'active',
        }),
      },
      organization: {
        listRoleAssignments: async () => [
          {
            roleKey: 'captain',
            scopeType: 'organization',
            scopeId: null,
            startsAt: '2026-01-01T00:00:00.000Z',
            endsAt: null,
            status: 'active',
          },
        ],
        listPermissionGrants: async () => [
          {
            roleKey: 'captain',
            permissionKey: 'scope.member.manage',
            effectScope: 'self_scope',
            isEnabled: true,
          },
        ],
        findClubParentDivisionId: async () => null,
      },
      now,
    });

    await expect(
      authorization.requireOrganizationPermission({ userId: 'actor-user' }, 'scope.member.manage'),
    ).resolves.toBeUndefined();
  });

  it('rejects expired assignments', async () => {
    const authorization = createOrganizationAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'actor-user',
          role: 'member',
          status: 'active',
        }),
      },
      organization: {
        listRoleAssignments: async () => [
          {
            roleKey: 'captain',
            scopeType: 'organization',
            scopeId: null,
            startsAt: '2026-01-01T00:00:00.000Z',
            endsAt: '2026-06-01T00:00:00.000Z',
            status: 'active',
          },
        ],
        listPermissionGrants: async () => [
          {
            roleKey: 'captain',
            permissionKey: 'scope.member.manage',
            effectScope: 'organization',
            isEnabled: true,
          },
        ],
        findClubParentDivisionId: async () => null,
      },
      now,
    });

    await expect(
      authorization.requireOrganizationPermission({ userId: 'actor-user' }, 'scope.member.manage'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('allows a same-scope grant for its assigned division only', async () => {
    const authorization = createOrganizationAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'actor-user',
          role: 'member',
          status: 'active',
        }),
      },
      organization: {
        listRoleAssignments: async () => [
          {
            roleKey: 'division_lead',
            scopeType: 'division',
            scopeId: 'division-a',
            startsAt: '2026-01-01T00:00:00.000Z',
            endsAt: null,
            status: 'active',
          },
        ],
        listPermissionGrants: async () => [
          {
            roleKey: 'division_lead',
            permissionKey: 'scope.member.manage',
            effectScope: 'self_scope',
            isEnabled: true,
          },
        ],
        findClubParentDivisionId: async () => null,
      },
      now,
    });

    await expect(
      authorization.hasScopePermission({ userId: 'actor-user' }, 'scope.member.manage', {
        type: 'division',
        id: 'division-a',
      }),
    ).resolves.toBe(true);
    await expect(
      authorization.hasScopePermission({ userId: 'actor-user' }, 'scope.member.manage', {
        type: 'division',
        id: 'division-b',
      }),
    ).resolves.toBe(false);
  });

  it('allows a division child-club grant only for clubs under that division', async () => {
    const authorization = createOrganizationAuthorization({
      users: {
        findAccountById: async () => ({
          id: 'actor-user',
          role: 'member',
          status: 'active',
        }),
      },
      organization: {
        listRoleAssignments: async () => [
          {
            roleKey: 'division_lead',
            scopeType: 'division',
            scopeId: 'division-a',
            startsAt: '2026-01-01T00:00:00.000Z',
            endsAt: null,
            status: 'active',
          },
        ],
        listPermissionGrants: async () => [
          {
            roleKey: 'division_lead',
            permissionKey: 'scope.member.manage',
            effectScope: 'child_club',
            isEnabled: true,
          },
        ],
        findClubParentDivisionId: async (clubId) =>
          clubId === 'club-a' ? 'division-a' : 'division-b',
      },
      now,
    });

    await expect(
      authorization.hasScopePermission({ userId: 'actor-user' }, 'scope.member.manage', {
        type: 'club',
        id: 'club-a',
      }),
    ).resolves.toBe(true);
    await expect(
      authorization.hasScopePermission({ userId: 'actor-user' }, 'scope.member.manage', {
        type: 'club',
        id: 'club-b',
      }),
    ).resolves.toBe(false);
  });
});
