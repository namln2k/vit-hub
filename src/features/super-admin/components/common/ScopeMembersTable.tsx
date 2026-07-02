import ScopeLeadTransferModal, {
  PickerUserStatusBadge,
} from '@/features/super-admin/components/common/ScopeLeadTransferModal';
import ScopeMemberRoleActionModal from '@/features/super-admin/components/common/ScopeMemberRoleActionModal';
import MembersLoadingOverlay from '@/features/super-admin/components/common/MembersLoadingOverlay';
import {
  LifecycleActorLine,
  LifecycleStatusBadge,
  RestrictedContactValue,
  RoleAssignmentBadge,
  canEndMembership,
  canRevokeMembership,
  formatVietnamDateTime,
  getMembershipLifecycleState,
  isActiveNowAssignment,
  isCurrentOrUpcomingAssignment,
} from '@/features/super-admin/components/common/scopeMemberLifecycle';
import { getPublicUserProfilePath } from '@/constants/routes';
import type {
  RoleActionDialogState,
  ScopeMembersTableProps,
} from '@/features/super-admin/components/common/scopeMemberTypes';
import type { OrganizationMember } from '@/services/organizationAdmin';
import {
  getDeputyRoleForScope,
  getLeadRoleForScope,
  ROLE_LABELS,
} from '@/features/organization-structure/permissions';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import Avatar from '@/shared/layout/Avatar';
import { ArrowRightLeft, Ban, ShieldCheck, ShieldMinus, ShieldPlus } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';

export default function ScopeMembersTable({
  scopeType,
  users,
  isLoading,
  error,
  canManage,
  canViewContact,
  selectedUserIdSet,
  accent,
  onToggleUser,
  onToggleVisibleUsers,
  onAssignRole,
  onRemoveRole,
  onRevokeMembership,
  onTransferLead,
}: ScopeMembersTableProps) {
  const [roleActionDialog, setRoleActionDialog] = useState<RoleActionDialogState>(null);
  const [isTransferLeadModalOpen, setIsTransferLeadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'current' | 'history'>('current');
  const visibleUsers =
    viewMode === 'history'
      ? users
      : users.filter((user) => {
          const state = getMembershipLifecycleState(user);
          return state === 'active' || state === 'upcoming';
        });
  const selectableUsers = canManage ? visibleUsers.filter((user) => canEndMembership(user)) : [];
  const areAllVisibleUsersSelected =
    selectableUsers.length > 0 && selectableUsers.every((user) => selectedUserIdSet.has(user.uid));
  const leadRoleKey = getLeadRoleForScope(scopeType);
  const deputyRoleKey = getDeputyRoleForScope(scopeType);
  const currentLead = users.find((user) =>
    user.roleAssignments.some(
      (assignment) => assignment.roleKey === leadRoleKey && isActiveNowAssignment(assignment),
    ),
  );
  const leadRoleLabel = ROLE_LABELS[leadRoleKey];
  const checkboxClassName =
    accent === 'indigo'
      ? 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
      : accent === 'emerald'
        ? 'h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
        : 'h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500';

  return (
    <div className="relative min-h-72 flex-1">
      {isLoading && <MembersLoadingOverlay />}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        {!canViewContact ? (
          <p className="text-sm font-semibold text-amber-700">
            Dữ liệu liên hệ đang bị giới hạn theo quyền xem scope.
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('current')}
              className={`h-8 rounded-md px-3 text-sm font-semibold ${
                viewMode === 'current' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
              }`}
            >
              Hiện tại
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`h-8 rounded-md px-3 text-sm font-semibold ${
                viewMode === 'history' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
              }`}
            >
              Lịch sử
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsTransferLeadModalOpen(true)}
            disabled={!canManage || !currentLead || isLoading || viewMode === 'history'}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Chuyển giao {leadRoleLabel}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-12 px-5 py-3">
                <input
                  type="checkbox"
                  checked={areAllVisibleUsersSelected}
                  onChange={onToggleVisibleUsers}
                  disabled={!canManage || isLoading || selectableUsers.length === 0}
                  className={`${checkboxClassName} disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-label="Chọn tất cả thành viên đang hiển thị"
                />
              </th>
              <HeaderCell>Thành viên</HeaderCell>
              <HeaderCell>Username</HeaderCell>
              <HeaderCell>Email</HeaderCell>
              <HeaderCell>Trạng thái</HeaderCell>
              <HeaderCell>Nguồn</HeaderCell>
              <HeaderCell>Thời hạn</HeaderCell>
              <HeaderCell>Lifecycle</HeaderCell>
              <HeaderCell>Chức vụ</HeaderCell>
              <HeaderCell>Thao tác</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {isLoading ? null : error ? (
              <EmptyTableRow className="text-red-600" colSpan={10}>
                {error}
              </EmptyTableRow>
            ) : visibleUsers.length > 0 ? (
              visibleUsers.map((user) => {
                const lifecycleState = getMembershipLifecycleState(user);
                const visibleRoleAssignments =
                  viewMode === 'history'
                    ? user.roleAssignments
                    : user.roleAssignments.filter((assignment) =>
                        isCurrentOrUpcomingAssignment(assignment),
                      );
                const hasDeputyRole = visibleRoleAssignments.some(
                  (assignment) => assignment.roleKey === deputyRoleKey,
                );
                const isSelectable = canEndMembership(user);
                const canRevoke = canRevokeMembership(user);
                const isRoleActionDisabled =
                  lifecycleState !== 'active' && lifecycleState !== 'upcoming';

                return (
                  <tr key={user.uid} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIdSet.has(user.uid)}
                        onChange={() => onToggleUser(user.uid)}
                        disabled={!canManage || !isSelectable}
                        className={checkboxClassName}
                        aria-label={`Chọn ${getFullName(user)}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <MemberIdentity user={user} />
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      <MemberUsername user={user} />
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      <RestrictedContactValue value={user.email} />
                    </td>
                    <td className="px-5 py-4">
                      <LifecycleStatusBadge state={lifecycleState} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                        {user.membership.source === 'manual' ? 'Manual' : 'Role auto'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      <div className="space-y-1 whitespace-nowrap">
                        <div>Bắt đầu: {formatVietnamDateTime(user.membership.startsAt)}</div>
                        <div>
                          Kết thúc:{' '}
                          {user.membership.endsAt
                            ? formatVietnamDateTime(user.membership.endsAt)
                            : 'Chưa đặt'}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      <div className="space-y-1 whitespace-nowrap">
                        <LifecycleActorLine label="Thêm" actor={user.membership.addedBy} />
                        <LifecycleActorLine label="Kết thúc" actor={user.membership.endedBy} />
                        <LifecycleActorLine label="Thu hồi" actor={user.membership.revokedBy} />
                        <div>Tạo: {formatVietnamDateTime(user.membership.createdAt)}</div>
                        <div>Cập nhật: {formatVietnamDateTime(user.membership.updatedAt)}</div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {visibleRoleAssignments.length > 0 ? (
                          visibleRoleAssignments.map((assignment) => (
                            <RoleAssignmentBadge key={assignment.id} assignment={assignment} />
                          ))
                        ) : (
                          <span className="text-sm font-medium text-slate-400">Thành viên</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {!currentLead && (
                          <ActionButton
                            label="Gán trưởng"
                            tone="neutral"
                            onClick={() =>
                              setRoleActionDialog({
                                mode: 'assign',
                                user,
                                roleKey: leadRoleKey,
                              })
                            }
                            disabled={!canManage || isRoleActionDisabled}
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </ActionButton>
                        )}
                        <ActionButton
                          label={hasDeputyRole ? 'Gỡ phó' : 'Gán phó'}
                          tone={hasDeputyRole ? 'danger' : 'neutral'}
                          onClick={() =>
                            setRoleActionDialog({
                              mode: hasDeputyRole ? 'end' : 'assign',
                              user,
                              roleKey: deputyRoleKey,
                            })
                          }
                          disabled={!canManage || isRoleActionDisabled}
                        >
                          {hasDeputyRole ? (
                            <ShieldMinus className="h-4 w-4" />
                          ) : (
                            <ShieldPlus className="h-4 w-4" />
                          )}
                        </ActionButton>
                        <ActionButton
                          label="Thu hồi"
                          tone="danger"
                          onClick={() => onRevokeMembership(user.uid)}
                          disabled={!canManage || !canRevoke}
                        >
                          <Ban className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyTableRow colSpan={10}>
                {viewMode === 'history'
                  ? 'Chưa có lịch sử thành viên trong scope này.'
                  : 'Chưa có thành viên đang hiệu lực trong scope này.'}
              </EmptyTableRow>
            )}
          </tbody>
        </table>
      </div>
      {roleActionDialog && (
        <ScopeMemberRoleActionModal
          action={roleActionDialog}
          onClose={() => setRoleActionDialog(null)}
          onAssignRole={onAssignRole}
          onRemoveRole={onRemoveRole}
        />
      )}
      {isTransferLeadModalOpen && currentLead && (
        <ScopeLeadTransferModal
          currentLead={currentLead}
          leadRoleLabel={leadRoleLabel}
          onClose={() => setIsTransferLeadModalOpen(false)}
          onTransferLead={onTransferLead}
        />
      )}
    </div>
  );
}

function MemberIdentity({ user }: { user: OrganizationMember }) {
  const content = (
    <>
      <Avatar src={user.avatarUrl} size="sm" />
      <span className="min-w-0">
        <span className="block font-semibold whitespace-nowrap text-slate-950">
          {getFullName(user)}
        </span>
        <PickerUserStatusBadge status={user.status ?? 'active'} />
      </span>
    </>
  );

  if (user.status !== 'active') {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <Link href={getPublicUserProfilePath(user.username)} className="flex items-center gap-3">
      {content}
    </Link>
  );
}

function MemberUsername({ user }: { user: OrganizationMember }) {
  if (user.status !== 'active') {
    return <>@{user.username}</>;
  }

  return (
    <Link
      href={getPublicUserProfilePath(user.username)}
      className="hover:text-indigo-700 hover:underline"
    >
      @{user.username}
    </Link>
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
  disabled?: boolean;
}

function ActionButton({ children, label, tone, onClick, disabled = false }: ActionButtonProps) {
  const className =
    tone === 'danger'
      ? 'border-red-200 text-red-600 hover:bg-red-50'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white ${className}`}
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
