import type { EventOwnerScopeRef, ScopeRef } from '@/features/organization-structure/permissions';
import {
  PermissionGrantRow,
  RoleAssignmentRow,
} from '@/features/organization-structure/server/authorization/types';

export function isEffectiveActive(
  row: Pick<RoleAssignmentRow, 'status' | 'starts_at' | 'ends_at'>,
  now: Date,
) {
  if (row.status !== 'active') {
    return false;
  }

  const startsAt = new Date(row.starts_at);
  const endsAt = row.ends_at ? new Date(row.ends_at) : null;

  return startsAt <= now && (!endsAt || now < endsAt);
}

export function grantMatchesScope({
  grant,
  assignment,
  targetScope,
  targetParentDivisionId,
}: {
  grant: PermissionGrantRow;
  assignment: RoleAssignmentRow;
  targetScope: ScopeRef | EventOwnerScopeRef;
  targetParentDivisionId: string | null;
}) {
  if (grant.effect_scope === 'organization') {
    return true;
  }

  if (grant.effect_scope === 'self_scope') {
    return assignment.scope_type === targetScope.type && assignment.scope_id === targetScope.id;
  }

  if (grant.effect_scope === 'owned_event') {
    return false;
  }

  if (grant.effect_scope === 'child_club') {
    return (
      targetScope.type === 'club' &&
      assignment.scope_type === 'division' &&
      assignment.scope_id === targetParentDivisionId
    );
  }

  return false;
}
