import Avatar from '@/shared/layout/Avatar';
import type { ReactNode } from 'react';
import MembersLoadingOverlay from '@/features/super-admin/components/common/MembersLoadingOverlay';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import {
  getDeputyRoleForScope,
  getLeadRoleForScope,
  ROLE_LABELS,
  type NonEventRoleKey,
} from '@/features/organization-structure/permissions';
import type { ManageableScopeType, OrganizationMember } from '@/services/organizationAdmin';
import { ShieldCheck, ShieldMinus, ShieldPlus } from 'lucide-react';

interface ScopeMembersTableProps {
  scopeType: ManageableScopeType;
  users: OrganizationMember[];
  isLoading: boolean;
  error: string;
  selectedUserIdSet: Set<string>;
  accent: 'indigo' | 'emerald';
  onToggleUser: (userId: string) => void;
  onToggleVisibleUsers: () => void;
  onAssignRole: (userId: string, roleKey: NonEventRoleKey) => void;
  onRemoveRole: (userId: string, roleKey: NonEventRoleKey) => void;
}

export default function ScopeMembersTable({
  scopeType,
  users,
  isLoading,
  error,
  selectedUserIdSet,
  accent,
  onToggleUser,
  onToggleVisibleUsers,
  onAssignRole,
  onRemoveRole,
}: ScopeMembersTableProps) {
  const areAllVisibleUsersSelected =
    users.length > 0 && users.every((user) => selectedUserIdSet.has(user.uid));
  const leadRoleKey = getLeadRoleForScope(scopeType);
  const deputyRoleKey = getDeputyRoleForScope(scopeType);
  const checkboxClassName =
    accent === 'indigo'
      ? 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
      : 'h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500';

  return (
    <div className="relative min-h-72 flex-1">
      {isLoading && <MembersLoadingOverlay />}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-12 px-5 py-3">
                <input
                  type="checkbox"
                  checked={areAllVisibleUsersSelected}
                  onChange={onToggleVisibleUsers}
                  disabled={isLoading || users.length === 0}
                  className={`${checkboxClassName} disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-label="Chọn tất cả thành viên đang hiển thị"
                />
              </th>
              <HeaderCell>Thành viên</HeaderCell>
              <HeaderCell>Username</HeaderCell>
              <HeaderCell>Email</HeaderCell>
              <HeaderCell>Chức vụ</HeaderCell>
              <HeaderCell>Thao tác</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? null : error ? (
              <EmptyTableRow className="text-red-600" colSpan={6}>
                {error}
              </EmptyTableRow>
            ) : users.length > 0 ? (
              users.map((user) => {
                const scopeRoleKeys = user.roleAssignments.map((assignment) => assignment.roleKey);
                const hasLeadRole = scopeRoleKeys.includes(leadRoleKey);
                const hasDeputyRole = scopeRoleKeys.includes(deputyRoleKey);

                return (
                  <tr key={user.uid} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIdSet.has(user.uid)}
                        onChange={() => onToggleUser(user.uid)}
                        className={checkboxClassName}
                        aria-label={`Chọn ${getFullName(user)}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatarUrl} size="sm" />
                        <span className="font-semibold whitespace-nowrap text-slate-950">
                          {getFullName(user)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      @{user.username}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {scopeRoleKeys.length > 0 ? (
                          scopeRoleKeys.map((roleKey) => (
                            <span
                              key={roleKey}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {ROLE_LABELS[roleKey]}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-medium text-slate-400">Thành viên</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          label={hasLeadRole ? 'Gỡ trưởng' : 'Gán trưởng'}
                          tone={hasLeadRole ? 'danger' : 'neutral'}
                          onClick={() =>
                            hasLeadRole
                              ? onRemoveRole(user.uid, leadRoleKey)
                              : onAssignRole(user.uid, leadRoleKey)
                          }
                        >
                          {hasLeadRole ? (
                            <ShieldMinus className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </ActionButton>
                        <ActionButton
                          label={hasDeputyRole ? 'Gỡ phó' : 'Gán phó'}
                          tone={hasDeputyRole ? 'danger' : 'neutral'}
                          onClick={() =>
                            hasDeputyRole
                              ? onRemoveRole(user.uid, deputyRoleKey)
                              : onAssignRole(user.uid, deputyRoleKey)
                          }
                        >
                          {hasDeputyRole ? (
                            <ShieldMinus className="h-4 w-4" />
                          ) : (
                            <ShieldPlus className="h-4 w-4" />
                          )}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyTableRow colSpan={6}>Chưa có thành viên trong scope này.</EmptyTableRow>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">{children}</th>
  );
}

interface ActionButtonProps {
  children: ReactNode;
  label: string;
  tone: 'neutral' | 'danger';
  onClick: () => void;
}

function ActionButton({ children, label, tone, onClick }: ActionButtonProps) {
  const className =
    tone === 'danger'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold transition-colors ${className}`}
    >
      {children}
      {label}
    </button>
  );
}

interface EmptyTableRowProps {
  children: string;
  className?: string;
  colSpan: number;
}

function EmptyTableRow({ children, className = 'text-slate-500', colSpan }: EmptyTableRowProps) {
  return (
    <tr>
      <td className={`px-5 py-10 text-center text-sm font-medium ${className}`} colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
