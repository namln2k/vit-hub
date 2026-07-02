import { ROLE_LABELS } from '@/features/organization-structure/permissions';
import type { OrganizationMember } from '@/services/organizationAdmin';

export type RoleAssignment = OrganizationMember['roleAssignments'][number];
export type RoleAssignmentLifecycleState = 'active' | 'upcoming' | 'expired' | 'ended' | 'revoked';

export function RoleAssignmentBadge({ assignment }: { assignment: RoleAssignment }) {
  const state = getRoleAssignmentLifecycleState(assignment);
  const config = roleAssignmentStatusConfig[state];
  const metadata = [
    `Bắt đầu: ${formatVietnamDateTime(assignment.startsAt)}`,
    assignment.endsAt ? `Kết thúc: ${formatVietnamDateTime(assignment.endsAt)}` : '',
    assignment.assignedBy ? `Gán bởi: ${assignment.assignedBy.name}` : '',
    assignment.endedBy ? `Kết thúc bởi: ${assignment.endedBy.name}` : '',
    assignment.revokedBy ? `Thu hồi bởi: ${assignment.revokedBy.name}` : '',
    `Tạo: ${formatVietnamDateTime(assignment.createdAt)}`,
    `Cập nhật: ${formatVietnamDateTime(assignment.updatedAt)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <span
      className={`inline-flex w-max max-w-none items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${config.className}`}
      title={metadata}
    >
      {ROLE_LABELS[assignment.roleKey]} · {config.label}
    </span>
  );
}

export type MembershipLifecycleState = 'active' | 'upcoming' | 'expired' | 'ended' | 'revoked';

export function isCurrentOrUpcomingAssignment(assignment: RoleAssignment) {
  if (assignment.status !== 'active') {
    return false;
  }

  const endsAt = assignment.endsAt ? new Date(assignment.endsAt).getTime() : null;

  return endsAt === null || endsAt > Date.now();
}

export function isActiveNowAssignment(assignment: RoleAssignment) {
  if (assignment.status !== 'active') {
    return false;
  }

  const now = Date.now();
  const startsAt = new Date(assignment.startsAt).getTime();
  const endsAt = assignment.endsAt ? new Date(assignment.endsAt).getTime() : null;

  return startsAt <= now && (endsAt === null || endsAt > now);
}

export function getRoleAssignmentLifecycleState(
  assignment: RoleAssignment,
): RoleAssignmentLifecycleState {
  if (assignment.status === 'ended') {
    return 'ended';
  }

  if (assignment.status === 'revoked') {
    return 'revoked';
  }

  const now = Date.now();

  if (new Date(assignment.startsAt).getTime() > now) {
    return 'upcoming';
  }

  if (assignment.endsAt && new Date(assignment.endsAt).getTime() <= now) {
    return 'expired';
  }

  return 'active';
}

export function getMembershipLifecycleState(user: OrganizationMember): MembershipLifecycleState {
  if (user.membership.status === 'ended') {
    return 'ended';
  }

  if (user.membership.status === 'revoked') {
    return 'revoked';
  }

  const now = Date.now();
  const startsAt = new Date(user.membership.startsAt).getTime();
  const endsAt = user.membership.endsAt ? new Date(user.membership.endsAt).getTime() : null;

  if (startsAt > now) {
    return 'upcoming';
  }

  if (endsAt !== null && endsAt <= now) {
    return 'expired';
  }

  return 'active';
}

export function canEndMembership(user: OrganizationMember) {
  return user.membership.status === 'active';
}

export function canRevokeMembership(user: OrganizationMember) {
  return (
    user.membership.status === 'active' &&
    new Date(user.membership.startsAt).getTime() <= Date.now()
  );
}

const lifecycleStatusConfig = {
  active: {
    label: 'Đang hiệu lực',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  upcoming: {
    label: 'Sắp hiệu lực',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  expired: {
    label: 'Hết hạn',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  ended: {
    label: 'Đã kết thúc',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  },
  revoked: {
    label: 'Đã thu hồi',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
} satisfies Record<MembershipLifecycleState, { label: string; className: string }>;

const roleAssignmentStatusConfig = {
  active: {
    label: 'Đang hiệu lực',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  upcoming: {
    label: 'Sắp hiệu lực',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  expired: {
    label: 'Hết hạn',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  ended: {
    label: 'Đã kết thúc',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  },
  revoked: {
    label: 'Đã thu hồi',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
} satisfies Record<RoleAssignmentLifecycleState, { label: string; className: string }>;

export function LifecycleStatusBadge({ state }: { state: MembershipLifecycleState }) {
  const config = lifecycleStatusConfig[state];

  return (
    <span
      className={`inline-flex w-max max-w-none items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function LifecycleActorLine({
  label,
  actor,
}: {
  label: string;
  actor: OrganizationMember['membership']['addedBy'];
}) {
  if (!actor) {
    return <div>{label}: Chưa có</div>;
  }

  return (
    <div title={actor.email ?? undefined}>
      {label}: {actor.name}
    </div>
  );
}

export function RestrictedContactValue({ value }: { value?: string | null }) {
  if (!value) {
    return <span className="text-xs font-semibold text-amber-700">Bị giới hạn</span>;
  }

  return <>{value}</>;
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
