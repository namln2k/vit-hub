import {
  formatEffectScopeLabel,
  formatGrantUpdatedLabel,
  formatPermissionText,
  getGrantId,
  getGrantMetadataLabel,
  PERMISSION_GROUP_LABELS,
  SCOPE_TYPE_LABELS,
  SCOPE_TYPE_ORDER,
  type PermissionGroupKey,
} from '@/features/super-admin/components/permission/permissionMatrixUtils';
import type {
  DomainRoleKey,
  EffectScope,
} from '@/features/organization-structure/permissions';
import type { PermissionMatrix } from '@/services/organizationAdmin';
import Sharingan from '@/shared/loading/Sharingan';
import { ChevronsDownUp, ChevronsUpDown, Search } from 'lucide-react';

interface PermissionMatrixFiltersProps {
  search: string;
  roleScopeFilter: string;
  permissionGroupFilter: 'all' | PermissionGroupKey;
  effectScopeFilter: 'all' | EffectScope;
  onSearchChange: (value: string) => void;
  onRoleScopeFilterChange: (value: string) => void;
  onPermissionGroupFilterChange: (value: 'all' | PermissionGroupKey) => void;
  onEffectScopeFilterChange: (value: 'all' | EffectScope) => void;
  onSelectedRoleKeyChange: (value: DomainRoleKey | null) => void;
}

interface PermissionRowProps {
  permission: PermissionMatrix['permissions'][number];
  grants: PermissionMatrix['grants'];
  roleScopeType: string;
  canManage: boolean;
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

export function PermissionMatrixFilters({
  search,
  roleScopeFilter,
  permissionGroupFilter,
  effectScopeFilter,
  onSearchChange,
  onRoleScopeFilterChange,
  onPermissionGroupFilterChange,
  onEffectScopeFilterChange,
  onSelectedRoleKeyChange,
}: PermissionMatrixFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm quyền"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-500 sm:w-64"
        />
      </label>
      <select
        value={roleScopeFilter}
        onChange={(event) => {
          onRoleScopeFilterChange(event.target.value);
          onSelectedRoleKeyChange(null);
        }}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-rose-500"
      >
        <option value="all">Mọi role scope</option>
        {SCOPE_TYPE_ORDER.map((scopeType) => (
          <option key={scopeType} value={scopeType}>
            {SCOPE_TYPE_LABELS[scopeType]}
          </option>
        ))}
      </select>
      <select
        value={permissionGroupFilter}
        onChange={(event) => onPermissionGroupFilterChange(event.target.value as 'all' | PermissionGroupKey)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-rose-500"
      >
        <option value="all">Mọi nhóm quyền</option>
        {Object.entries(PERMISSION_GROUP_LABELS).map(([groupKey, label]) => (
          <option key={groupKey} value={groupKey}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={effectScopeFilter}
        onChange={(event) => onEffectScopeFilterChange(event.target.value as 'all' | EffectScope)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-rose-500"
      >
        <option value="all">Mọi effect scope</option>
        <option value="self_scope">self_scope</option>
        <option value="child_club">child_club</option>
        <option value="organization">organization</option>
        <option value="owned_event">owned_event</option>
      </select>
    </div>
  );
}

export function CollapseAllToggle({
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

export function PermissionRow({
  permission,
  grants,
  roleScopeType,
  canManage,
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
                disabled={isUpdating || !canManage}
                title={getGrantMetadataLabel(grant)}
                className={`inline-flex min-h-9 min-w-40 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  grant.isEnabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {isUpdating ? (
                  <Sharingan size={16} label="Đang cập nhật grant" />
                ) : (
                  <>
                    <span>{formatEffectScopeLabel(grant.effectScope, roleScopeType)}</span>
                    <span className="mt-0.5 text-[11px] font-medium opacity-80">
                      {grant.effectScope} · {grant.isEnabled ? 'allow' : 'off'}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium opacity-70">
                      {formatGrantUpdatedLabel(grant)}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

export function HeaderCell({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">{children}</th>
  );
}
