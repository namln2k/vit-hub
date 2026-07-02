import type { DomainRoleKey, PermissionKey } from '@/features/organization-structure/permissions';
import type { PermissionMatrix } from '@/services/organizationAdmin';

export const SCOPE_TYPE_LABELS: Record<string, string> = {
  organization: 'Toàn Đội',
  division: 'Mảng',
  group: 'Nhóm',
  club: 'CLB/Tổ',
  event: 'Sự kiện',
};

export const SCOPE_TYPE_ORDER = ['organization', 'division', 'group', 'club', 'event'] as const;

const ROLE_ORDER: DomainRoleKey[] = [
  'captain',
  'vice_captain',
  'division_lead',
  'division_deputy',
  'group_lead',
  'group_deputy',
  'club_lead',
  'club_deputy',
  'event_lead',
  'event_deputy',
  'event_staff_lead',
  'event_volunteer',
];

export const PERMISSION_GROUP_LABELS = {
  scope: 'Thành viên và chức vụ',
  event: 'Sự kiện',
  permission: 'Quản lý phân quyền',
  other: 'Khác',
} as const;

export type PermissionGroupKey = keyof typeof PERMISSION_GROUP_LABELS;

export function isDangerousPermissionManageToggle(
  grant: PermissionMatrix['grants'][number],
  nextEnabled: boolean,
) {
  return (
    !nextEnabled &&
    grant.permissionKey === 'permission.manage' &&
    (grant.roleKey === 'captain' || grant.roleKey === 'vice_captain')
  );
}

export function getGrantMetadataLabel(grant: PermissionMatrix['grants'][number]) {
  return [
    `effect_scope: ${grant.effectScope}`,
    `state: ${grant.isEnabled ? 'allow' : 'off'}`,
    `updated_at: ${grant.updatedAt}`,
    grant.updatedBy ? `updated_by: ${grant.updatedBy}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatPermissionText(value: string) {
  return value
    .replaceAll('membership', 'tư cách thành viên')
    .replaceAll('Membership', 'Tư cách thành viên')
    .replaceAll('kết thúc tư cách thành viên', 'kick thành viên')
    .replaceAll('Kết thúc tư cách thành viên', 'Kick thành viên')
    .replaceAll('Cập nhật metadata và cấu hình sự kiện', 'Cập nhật thông tin tổng quan sự kiện')
    .replaceAll('Cập nhật metadata và cấu hình event', 'Cập nhật thông tin tổng quan sự kiện')
    .replaceAll('Xem dữ liệu riêng tư sự kiện', 'Xem chi tiết vận hành sự kiện')
    .replaceAll('Xem dữ liệu riêng tư event', 'Xem chi tiết vận hành sự kiện')
    .replaceAll(
      'Xem chi tiết sự kiện, bao gồm thông tin vận hành không công khai như ghi chú nội bộ, cấu hình riêng tư và dữ liệu quản lý.',
      'Xem chi tiết vận hành sự kiện, bao gồm ghi chú nội bộ, cấu hình riêng tư, danh sách thành viên, vai trò trong sự kiện và trạng thái tham gia.',
    )
    .replaceAll('Xem chi tiết sự kiện', 'Xem chi tiết vận hành sự kiện')
    .replaceAll(
      'Xem dữ liệu vận hành riêng tư của sự kiện.',
      'Xem chi tiết vận hành sự kiện, bao gồm ghi chú nội bộ, cấu hình riêng tư, danh sách thành viên, vai trò trong sự kiện và trạng thái tham gia.',
    )
    .replaceAll(
      'Xem dữ liệu vận hành riêng tư của event.',
      'Xem chi tiết vận hành sự kiện, bao gồm ghi chú nội bộ, cấu hình riêng tư, danh sách thành viên, vai trò trong sự kiện và trạng thái tham gia.',
    )
    .replaceAll('Bổ nhiệm trưởng chính', 'Bổ nhiệm cấp trưởng')
    .replaceAll('Gỡ trưởng chính', 'Gỡ cấp trưởng')
    .replaceAll('trưởng chính', 'cấp trưởng')
    .replaceAll('transfer', 'chuyển giao')
    .replaceAll('attendance', 'trạng thái tham gia')
    .replaceAll('Attendance', 'Trạng thái tham gia')
    .replaceAll('role event', 'vai trò trong sự kiện')
    .replaceAll('role sự kiện', 'vai trò trong sự kiện')
    .replaceAll('role trong event', 'vai trò trong sự kiện')
    .replaceAll('role trong sự kiện', 'vai trò trong sự kiện')
    .replaceAll('permission matrix', 'quản lý phân quyền')
    .replaceAll('Permission matrix', 'Quản lý phân quyền')
    .replaceAll('ma trận phân quyền', 'quản lý phân quyền')
    .replaceAll('Ma trận phân quyền', 'Quản lý phân quyền')
    .replaceAll('role permission grants', 'quyền được cấp cho từng vai trò')
    .replaceAll('permission grants', 'quyền được cấp')
    .replaceAll('revoke', 'gỡ')
    .replaceAll('Revoke', 'Gỡ')
    .replaceAll('owner scope', 'phạm vi quản lý')
    .replaceAll('event members', 'thành viên sự kiện')
    .replaceAll('scope', 'trong phạm vi')
    .replaceAll('Scope', 'Trong phạm vi')
    .replaceAll('event', 'sự kiện')
    .replaceAll('Event', 'Sự kiện');
}

export function formatEffectScopeLabel(effectScope: string, roleScopeType: string) {
  if (effectScope === 'organization') {
    return 'Toàn Đội';
  }

  if (effectScope === 'self_scope') {
    if (roleScopeType === 'organization') {
      return 'Toàn Đội';
    }

    if (roleScopeType === 'division') {
      return 'Trong mảng';
    }

    if (roleScopeType === 'group') {
      return 'Trong nhóm';
    }

    if (roleScopeType === 'club') {
      return 'Trong CLB/Tổ';
    }

    if (roleScopeType === 'event') {
      return 'Trong sự kiện';
    }

    return 'Trong phạm vi';
  }

  if (effectScope === 'child_club') {
    return 'Trong CLB/Tổ trực thuộc';
  }

  if (effectScope === 'owned_event') {
    return 'Trong sự kiện';
  }

  return effectScope;
}

export function getPermissionGroupKey(permissionKey: PermissionKey): PermissionGroupKey {
  if (permissionKey.startsWith('scope.')) {
    return 'scope';
  }

  if (permissionKey.startsWith('event.')) {
    return 'event';
  }

  if (permissionKey.startsWith('permission.')) {
    return 'permission';
  }

  return 'other';
}

export function getScopeTypeOrder(scopeType: string) {
  const index = SCOPE_TYPE_ORDER.findIndex((currentScopeType) => currentScopeType === scopeType);

  return index === -1 ? SCOPE_TYPE_ORDER.length : index;
}

export function getRoleOrder(roleKey: DomainRoleKey) {
  const index = ROLE_ORDER.findIndex((currentRoleKey) => currentRoleKey === roleKey);

  return index === -1 ? ROLE_ORDER.length : index;
}

export function toggleSetValue<TValue>(set: Set<TValue>, value: TValue) {
  const nextSet = new Set(set);

  if (nextSet.has(value)) {
    nextSet.delete(value);
  } else {
    nextSet.add(value);
  }

  return nextSet;
}

export function getGrantId(grant: PermissionMatrix['grants'][number]) {
  return `${grant.roleKey}:${grant.permissionKey}:${grant.effectScope}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
