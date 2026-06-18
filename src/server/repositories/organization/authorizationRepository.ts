import 'server-only';

import { supabaseFetch } from '@/server/supabase';
import { InfrastructureError } from '@/server/services/shared/errors';
import type {
  EffectScope,
  NonEventRoleKey,
  PermissionKey,
} from '@/features/organization-structure/permissions';

export interface RoleAssignmentRecord {
  roleKey: NonEventRoleKey;
  scopeType: 'organization' | 'division' | 'group' | 'club';
  scopeId: string | null;
  startsAt: string;
  endsAt: string | null;
  status: 'active' | 'ended' | 'revoked';
}

export interface PermissionGrantRecord {
  roleKey: NonEventRoleKey;
  permissionKey: PermissionKey;
  effectScope: EffectScope;
  isEnabled: boolean;
}

interface RoleAssignmentRow {
  role_key: NonEventRoleKey;
  scope_type: RoleAssignmentRecord['scopeType'];
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: RoleAssignmentRecord['status'];
}

interface PermissionGrantRow {
  role_key: NonEventRoleKey;
  permission_key: PermissionKey;
  effect_scope: EffectScope;
  is_enabled: boolean;
}

interface ClubParentRow {
  division_id: string | number;
}

export interface OrganizationAuthorizationRepository {
  listRoleAssignments(userId: string): Promise<RoleAssignmentRecord[]>;
  listPermissionGrants(roleKeys: NonEventRoleKey[]): Promise<PermissionGrantRecord[]>;
  findClubParentDivisionId(clubId: string): Promise<string | null>;
}

export const organizationAuthorizationRepository: OrganizationAuthorizationRepository = {
  async listRoleAssignments(userId) {
    const query = new URLSearchParams({
      select: 'role_key,scope_type,scope_id,starts_at,ends_at,status',
      user_id: `eq.${userId}`,
      status: 'eq.active',
    });
    const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
      `/rest/v1/role_assignments?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải vai trò của người dùng.');
    }

    return (Array.isArray(data) ? data : []).map((row) => ({
      roleKey: row.role_key,
      scopeType: row.scope_type,
      scopeId: row.scope_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
    }));
  },

  async listPermissionGrants(roleKeys) {
    const uniqueRoleKeys = Array.from(new Set(roleKeys));

    if (uniqueRoleKeys.length === 0) {
      return [];
    }

    const query = new URLSearchParams({
      select: 'role_key,permission_key,effect_scope,is_enabled',
      role_key: `in.(${uniqueRoleKeys.join(',')})`,
      is_enabled: 'eq.true',
    });
    const { response, data } = await supabaseFetch<PermissionGrantRow[]>(
      `/rest/v1/role_permission_grants?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải quyền của người dùng.');
    }

    return (Array.isArray(data) ? data : []).map((row) => ({
      roleKey: row.role_key,
      permissionKey: row.permission_key,
      effectScope: row.effect_scope,
      isEnabled: row.is_enabled,
    }));
  },

  async findClubParentDivisionId(clubId) {
    const query = new URLSearchParams({
      select: 'division_id',
      id: `eq.${clubId}`,
      limit: '1',
    });
    const { response, data } = await supabaseFetch<ClubParentRow[]>(
      `/rest/v1/clubs?${query.toString()}`,
    );

    if (!response.ok) {
      throw new InfrastructureError('Không thể tải mảng quản lý của CLB/tổ.');
    }

    const row = Array.isArray(data) ? data[0] : null;
    return row ? String(row.division_id) : null;
  },
};
