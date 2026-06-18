import type {
  OrganizationRoleAssignmentDetail,
  OrganizationRoleKey,
  OrganizationTechnicalAdmin,
} from '@/services/organizationAdmin';
import type { AppUser } from '@/contexts/auth';

export const ROLE_LABELS = {
  captain: 'Đội trưởng',
  vice_captain: 'Đội phó',
} satisfies Record<OrganizationRoleKey, string>;

export type RoleLifecycleState = 'current' | 'upcoming';

export function getRoleLifecycleState(
  assignment: OrganizationRoleAssignmentDetail,
): RoleLifecycleState {
  return new Date(assignment.startsAt).getTime() > Date.now() ? 'upcoming' : 'current';
}

export function getDisplayName(
  user: OrganizationRoleAssignmentDetail['user'] | OrganizationTechnicalAdmin | AppUser,
) {
  if ('name' in user) {
    return user.name;
  }

  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim() || user.email;
}

export function getAssignmentStatusLabel(status: OrganizationRoleAssignmentDetail['status']) {
  if (status === 'active') {
    return 'active';
  }

  if (status === 'ended') {
    return 'ended';
  }

  return 'revoked';
}

export function formatVietnamDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
