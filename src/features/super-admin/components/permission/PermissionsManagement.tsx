import { useEffect, useMemo, useState } from 'react';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  listPermissionMatrix,
  updatePermissionGrant,
  type PermissionMatrix,
} from '@/services/organizationAdmin';
import {
  ROLE_LABELS,
  type DomainRoleKey,
  type PermissionKey,
} from '@/features/organization-structure/permissions';
import Sharingan from '@/shared/loading/Sharingan';
import { ChevronsDownUp, ChevronsUpDown, ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';

const SCOPE_TYPE_LABELS: Record<string, string> = {
  organization: 'Toàn Đội',
  division: 'Mảng',
  group: 'Nhóm',
  club: 'CLB/Tổ',
  event: 'Sự kiện',
};
const SCOPE_TYPE_ORDER = ['organization', 'division', 'group', 'club', 'event'] as const;
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

const PERMISSION_GROUP_LABELS = {
  scope: 'Thành viên và chức vụ',
  event: 'Sự kiện',
  permission: 'Quản lý phân quyền',
  other: 'Khác',
} as const;

export default function PermissionsManagement() {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleKey, setSelectedRoleKey] = useState<DomainRoleKey | null>(null);
  const [collapsedRoleScopeTypes, setCollapsedRoleScopeTypes] = useState<Set<string>>(new Set());
  const [collapsedPermissionGroups, setCollapsedPermissionGroups] = useState<
    Set<keyof typeof PERMISSION_GROUP_LABELS>
  >(new Set());
  const [updatingGrantId, setUpdatingGrantId] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPermissions() {
      setIsLoading(true);
      setError('');

      try {
        const nextMatrix = await listPermissionMatrix();

        if (isMounted) {
          setMatrix(nextMatrix);
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : '';
          setError(
            message
              ? `Không thể tải quản lý phân quyền: ${message}`
              : 'Không thể tải quản lý phân quyền.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  const permissionLabelsByKey = useMemo(
    () => new Map(matrix?.permissions.map((permission) => [permission.key, permission]) ?? []),
    [matrix],
  );
  const rolesByScopeType = useMemo(() => {
    const groups = new Map<string, PermissionMatrix['roles']>();

    for (const role of matrix?.roles ?? []) {
      const roles = groups.get(role.scopeType) ?? [];
      roles.push(role);
      groups.set(role.scopeType, roles);
    }

    for (const roles of groups.values()) {
      roles.sort((first, second) => getRoleOrder(first.key) - getRoleOrder(second.key));
    }

    return [...groups.entries()].sort(
      ([firstScopeType], [secondScopeType]) =>
        getScopeTypeOrder(firstScopeType) - getScopeTypeOrder(secondScopeType),
    );
  }, [matrix]);
  const orderedRoles = useMemo(
    () => rolesByScopeType.flatMap(([, roles]) => roles),
    [rolesByScopeType],
  );
  const selectedRole = useMemo(() => {
    return orderedRoles.find((role) => role.key === selectedRoleKey) ?? orderedRoles[0] ?? null;
  }, [orderedRoles, selectedRoleKey]);
  const selectedRoleGrants = useMemo(
    () => (matrix?.grants ?? []).filter((grant) => grant.roleKey === selectedRole?.key),
    [matrix, selectedRole],
  );
  const filteredPermissionGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const permissionsByGroup = new Map<
      keyof typeof PERMISSION_GROUP_LABELS,
      Array<PermissionMatrix['permissions'][number]>
    >();

    for (const grant of selectedRoleGrants) {
      const permission = permissionLabelsByKey.get(grant.permissionKey);

      if (!permission) {
        continue;
      }

      const values = [
        permission.key,
        permission.label,
        permission.description,
        grant.effectScope,
        selectedRole?.key ?? '',
        selectedRole ? ROLE_LABELS[selectedRole.key] : '',
      ];

      if (query && !values.some((value) => value.toLowerCase().includes(query))) {
        continue;
      }

      const groupKey = getPermissionGroupKey(permission.key);
      const permissions = permissionsByGroup.get(groupKey) ?? [];

      if (!permissions.some((currentPermission) => currentPermission.key === permission.key)) {
        permissions.push(permission);
      }

      permissionsByGroup.set(groupKey, permissions);
    }

    return [...permissionsByGroup.entries()].map(([groupKey, permissions]) => ({
      groupKey,
      permissions: permissions.sort((first, second) => first.key.localeCompare(second.key)),
    }));
  }, [permissionLabelsByKey, search, selectedRole, selectedRoleGrants]);
  const roleScopeTypes = useMemo(
    () => rolesByScopeType.map(([scopeType]) => scopeType),
    [rolesByScopeType],
  );
  const permissionGroupKeys = useMemo(
    () => filteredPermissionGroups.map(({ groupKey }) => groupKey),
    [filteredPermissionGroups],
  );
  const areAllRoleGroupsCollapsed =
    roleScopeTypes.length > 0 &&
    roleScopeTypes.every((scopeType) => collapsedRoleScopeTypes.has(scopeType));
  const areAllPermissionGroupsCollapsed =
    permissionGroupKeys.length > 0 &&
    permissionGroupKeys.every((groupKey) => collapsedPermissionGroups.has(groupKey));

  async function handleToggleGrant(grant: PermissionMatrix['grants'][number]) {
    const grantId = getGrantId(grant);
    setUpdatingGrantId(grantId);

    try {
      await updatePermissionGrant(
        grant.roleKey,
        grant.permissionKey,
        grant.effectScope,
        !grant.isEnabled,
      );
      setMatrix((currentMatrix) =>
        currentMatrix
          ? {
              ...currentMatrix,
              grants: currentMatrix.grants.map((currentGrant) =>
                getGrantId(currentGrant) === grantId
                  ? { ...currentGrant, isEnabled: !currentGrant.isEnabled }
                  : currentGrant,
              ),
            }
          : currentMatrix,
      );
      toast.success('Đã cập nhật quyền.', { id: 'permission-grant-success' });
    } catch (toggleError) {
      const message = toggleError instanceof Error ? toggleError.message : '';
      toast.error(message ? `Không thể cập nhật quyền: ${message}` : 'Không thể cập nhật quyền.', {
        id: 'permission-grant-error',
      });
    } finally {
      setUpdatingGrantId('');
    }
  }

  function toggleRoleScopeType(scopeType: string) {
    setCollapsedRoleScopeTypes((currentSet) => toggleSetValue(currentSet, scopeType));
  }

  function togglePermissionGroup(groupKey: keyof typeof PERMISSION_GROUP_LABELS) {
    setCollapsedPermissionGroups((currentSet) => toggleSetValue(currentSet, groupKey));
  }

  function collapseAllRoleScopeTypes() {
    setCollapsedRoleScopeTypes(new Set(roleScopeTypes));
  }

  function expandAllRoleScopeTypes() {
    setCollapsedRoleScopeTypes(new Set());
  }

  function collapseAllPermissionGroups() {
    setCollapsedPermissionGroups(new Set(permissionGroupKeys));
  }

  function expandAllPermissionGroups() {
    setCollapsedPermissionGroups(new Set());
  }

  return (
    <AdminContentPanel
      section={ADMIN_SECTIONS.find((section) => section.id === 'permissions') ?? ADMIN_SECTIONS[0]}
      title="Phân quyền"
      count={`${selectedRoleGrants.length} quyền`}
      actions={
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm quyền"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-500 sm:w-72"
          />
        </label>
      }
    >
      <div className="relative grid min-h-72 lg:grid-cols-[260px_minmax(0,1fr)]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Sharingan label="Đang tải quản lý phân quyền" />
          </div>
        )}
        <aside className="border-b border-slate-200 bg-slate-50 p-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-end gap-2 px-2">
            <CollapseAllToggle
              collapseLabel="Thu gọn tất cả nhóm role"
              expandLabel="Mở rộng tất cả nhóm role"
              isAllCollapsed={areAllRoleGroupsCollapsed}
              disabled={roleScopeTypes.length === 0}
              onCollapseAll={collapseAllRoleScopeTypes}
              onExpandAll={expandAllRoleScopeTypes}
            />
          </div>
          <div className="space-y-4">
            {rolesByScopeType.map(([scopeType, roles]) => {
              const isCollapsed = collapsedRoleScopeTypes.has(scopeType);

              return (
                <div key={scopeType}>
                  <button
                    type="button"
                    onClick={() => toggleRoleScopeType(scopeType)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-extrabold uppercase text-slate-700 transition-colors hover:bg-white hover:text-slate-950"
                    aria-expanded={!isCollapsed}
                  >
                    <span>{SCOPE_TYPE_LABELS[scopeType] ?? scopeType}</span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold normal-case text-slate-500">
                        {roles.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-2 space-y-1">
                      {roles.map((role) => {
                        const isSelected = role.key === selectedRole?.key;
                        const grantCount =
                          matrix?.grants.filter((grant) => grant.roleKey === role.key).length ?? 0;

                        return (
                          <button
                            key={role.key}
                            type="button"
                            onClick={() => setSelectedRoleKey(role.key)}
                            className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-green-100 text-green-700'
                                : 'text-slate-700 hover:bg-white hover:text-slate-950'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate">{role.label}</span>
                              <span className="block truncate text-xs font-medium opacity-70">
                                {role.key}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
                              {grantCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0">
          {!isLoading && error ? (
            <div className="px-5 py-10 text-center text-sm font-medium text-red-600">{error}</div>
          ) : !selectedRole ? (
            <div className="px-5 py-10 text-center text-sm font-medium text-slate-500">
              Không có role để hiển thị.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-base font-bold text-slate-950">
                    {ROLE_LABELS[selectedRole.key]}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-500">
                    {selectedRole.key} ·{' '}
                    {SCOPE_TYPE_LABELS[selectedRole.scopeType] ?? selectedRole.scopeType}
                  </div>
                </div>
                <CollapseAllToggle
                  collapseLabel="Thu gọn tất cả nhóm quyền"
                  expandLabel="Mở rộng tất cả nhóm quyền"
                  isAllCollapsed={areAllPermissionGroupsCollapsed}
                  disabled={permissionGroupKeys.length === 0}
                  onCollapseAll={collapseAllPermissionGroups}
                  onExpandAll={expandAllPermissionGroups}
                />
              </div>

              {filteredPermissionGroups.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                  Không có quyền phù hợp với vai trò này.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {filteredPermissionGroups.map(({ groupKey, permissions }) => {
                    const isCollapsed = collapsedPermissionGroups.has(groupKey);

                    return (
                      <section key={groupKey}>
                        <button
                          type="button"
                          onClick={() => togglePermissionGroup(groupKey)}
                          className="flex w-full items-center justify-between gap-3 bg-slate-50 px-5 py-4 text-left text-sm font-extrabold uppercase text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                          aria-expanded={!isCollapsed}
                        >
                          <span>{PERMISSION_GROUP_LABELS[groupKey]}</span>
                          <span className="flex items-center gap-2">
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold normal-case text-slate-500">
                              {permissions.length}
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isCollapsed ? '-rotate-90' : ''
                              }`}
                            />
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                              <thead>
                                <tr>
                                  <HeaderCell>Quyền</HeaderCell>
                                  <HeaderCell>Phạm vi hiệu lực</HeaderCell>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {permissions.map((permission) => (
                                  <PermissionRow
                                    key={permission.key}
                                    grants={selectedRoleGrants.filter(
                                      (grant) => grant.permissionKey === permission.key,
                                    )}
                                    permission={permission}
                                    roleScopeType={selectedRole.scopeType}
                                    updatingGrantId={updatingGrantId}
                                    onToggleGrant={handleToggleGrant}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminContentPanel>
  );
}

interface PermissionRowProps {
  permission: PermissionMatrix['permissions'][number];
  grants: PermissionMatrix['grants'];
  roleScopeType: string;
  updatingGrantId: string;
  onToggleGrant: (grant: PermissionMatrix['grants'][number]) => void;
}

interface CollapseAllToggleProps {
  collapseLabel: string;
  disabled: boolean;
  expandLabel: string;
  isAllCollapsed: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
}

function CollapseAllToggle({
  collapseLabel,
  disabled,
  expandLabel,
  isAllCollapsed,
  onCollapseAll,
  onExpandAll,
}: CollapseAllToggleProps) {
  const label = isAllCollapsed ? expandLabel : collapseLabel;

  return (
    <button
      type="button"
      onClick={isAllCollapsed ? onExpandAll : onCollapseAll}
      disabled={disabled}
      className="flex h-8 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {isAllCollapsed ? (
        <ChevronsUpDown className="h-4 w-4" />
      ) : (
        <ChevronsDownUp className="h-4 w-4" />
      )}
      <span>{isAllCollapsed ? 'Mở rộng tất cả' : 'Thu gọn tất cả'}</span>
    </button>
  );
}

function PermissionRow({
  permission,
  grants,
  roleScopeType,
  updatingGrantId,
  onToggleGrant,
}: PermissionRowProps) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="w-1/2 px-5 py-4 align-top">
        <div className="text-sm font-semibold text-slate-950">
          {formatPermissionText(permission.label)}
        </div>
        <div className="mt-1 text-xs font-medium text-slate-500">{permission.key}</div>
        <div className="mt-2 max-w-xl text-xs font-medium text-slate-500">
          {formatPermissionText(permission.description)}
        </div>
      </td>
      <td className="px-5 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          {grants.map((grant) => {
            const grantId = getGrantId(grant);
            const isUpdating = updatingGrantId === grantId;

            return (
              <button
                key={grantId}
                type="button"
                onClick={() => onToggleGrant(grant)}
                disabled={isUpdating}
                className={`inline-flex h-9 min-w-32 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  grant.isEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {isUpdating ? (
                  <Sharingan size={16} label="Đang cập nhật grant" />
                ) : (
                  formatEffectScopeLabel(grant.effectScope, roleScopeType)
                )}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">{children}</th>
  );
}

function formatPermissionText(value: string) {
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

function formatEffectScopeLabel(effectScope: string, roleScopeType: string) {
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

function getPermissionGroupKey(permissionKey: PermissionKey): keyof typeof PERMISSION_GROUP_LABELS {
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

function getScopeTypeOrder(scopeType: string) {
  const index = SCOPE_TYPE_ORDER.findIndex((currentScopeType) => currentScopeType === scopeType);

  return index === -1 ? SCOPE_TYPE_ORDER.length : index;
}

function getRoleOrder(roleKey: DomainRoleKey) {
  const index = ROLE_ORDER.findIndex((currentRoleKey) => currentRoleKey === roleKey);

  return index === -1 ? ROLE_ORDER.length : index;
}

function toggleSetValue<TValue>(set: Set<TValue>, value: TValue) {
  const nextSet = new Set(set);

  if (nextSet.has(value)) {
    nextSet.delete(value);
  } else {
    nextSet.add(value);
  }

  return nextSet;
}

function getGrantId(grant: PermissionMatrix['grants'][number]) {
  return `${grant.roleKey}:${grant.permissionKey}:${grant.effectScope}`;
}
