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
  type EffectScope,
} from '@/features/organization-structure/permissions';
import {
  CollapseAllToggle,
  HeaderCell,
  PermissionMatrixFilters,
  PermissionRow,
} from '@/features/super-admin/components/permission/PermissionMatrixPanels';
import {
  getGrantId,
  getPermissionGroupKey,
  getRoleOrder,
  getScopeTypeOrder,
  isDangerousPermissionManageToggle,
  PERMISSION_GROUP_LABELS,
  type PermissionGroupKey,
  SCOPE_TYPE_LABELS,
  toggleSetValue,
} from '@/features/super-admin/components/permission/permissionMatrixUtils';
import Sharingan from '@/shared/loading/Sharingan';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function PermissionsManagement() {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleScopeFilter, setRoleScopeFilter] = useState<'all' | string>('all');
  const [permissionGroupFilter, setPermissionGroupFilter] = useState<
    'all' | keyof typeof PERMISSION_GROUP_LABELS
  >('all');
  const [effectScopeFilter, setEffectScopeFilter] = useState<'all' | EffectScope>('all');
  const [selectedRoleKey, setSelectedRoleKey] = useState<DomainRoleKey | null>(null);
  const [collapsedRoleScopeTypes, setCollapsedRoleScopeTypes] = useState<Set<string>>(new Set());
  const [collapsedPermissionGroups, setCollapsedPermissionGroups] = useState<Set<PermissionGroupKey>>(
    new Set(),
  );
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
      if (roleScopeFilter !== 'all' && role.scopeType !== roleScopeFilter) {
        continue;
      }

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
  }, [matrix, roleScopeFilter]);
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
      PermissionGroupKey,
      Array<PermissionMatrix['permissions'][number]>
    >();

    for (const grant of selectedRoleGrants) {
      if (effectScopeFilter !== 'all' && grant.effectScope !== effectScopeFilter) {
        continue;
      }

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

      if (permissionGroupFilter !== 'all' && groupKey !== permissionGroupFilter) {
        continue;
      }

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
  }, [
    effectScopeFilter,
    permissionGroupFilter,
    permissionLabelsByKey,
    search,
    selectedRole,
    selectedRoleGrants,
  ]);
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
    if (!matrix?.capabilities.canManage) {
      return;
    }

    const nextEnabled = !grant.isEnabled;

    if (isDangerousPermissionManageToggle(grant, nextEnabled)) {
      const confirmed = window.confirm(
        `Bạn đang tắt permission.manage cho ${ROLE_LABELS[grant.roleKey]}. Vai trò này có thể mất khả năng sửa lại permission matrix. Tiếp tục?`,
      );

      if (!confirmed) {
        return;
      }
    }

    const grantId = getGrantId(grant);
    setUpdatingGrantId(grantId);

    try {
      await updatePermissionGrant(
        grant.roleKey,
        grant.permissionKey,
        grant.effectScope,
        nextEnabled,
      );
      setMatrix((currentMatrix) =>
        currentMatrix
          ? {
              ...currentMatrix,
              grants: currentMatrix.grants.map((currentGrant) =>
                getGrantId(currentGrant) === grantId
                  ? { ...currentGrant, isEnabled: nextEnabled, updatedAt: new Date().toISOString() }
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

  function togglePermissionGroup(groupKey: PermissionGroupKey) {
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
        <PermissionMatrixFilters
          search={search}
          roleScopeFilter={roleScopeFilter}
          permissionGroupFilter={permissionGroupFilter}
          effectScopeFilter={effectScopeFilter}
          onSearchChange={setSearch}
          onRoleScopeFilterChange={setRoleScopeFilter}
          onPermissionGroupFilterChange={setPermissionGroupFilter}
          onEffectScopeFilterChange={setEffectScopeFilter}
          onSelectedRoleKeyChange={setSelectedRoleKey}
        />
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
              <div className="border-b border-slate-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-900">
                super_admin là technical override ngoài permission matrix. Matrix này là allow-only
                grants trực tiếp cho từng role; không có deny và không có role hierarchy ẩn.
                {!matrix?.capabilities.canManage ? (
                  <span className="ml-2 text-amber-800">Bạn đang ở chế độ chỉ đọc.</span>
                ) : null}
              </div>
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
                                    canManage={Boolean(matrix?.capabilities.canManage)}
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
