import Avatar from '@/shared/layout/Avatar';
import type { AppUser } from '@/contexts/auth';
import { useEffect, useState, type ReactNode } from 'react';
import MembersLoadingOverlay from '@/features/super-admin/components/common/MembersLoadingOverlay';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import {
  getDeputyRoleForScope,
  getLeadRoleForScope,
  ROLE_LABELS,
  type NonEventRoleKey,
} from '@/features/organization-structure/permissions';
import type { ManageableScopeType, OrganizationMember } from '@/services/organizationAdmin';
import { queryUsers } from '@/services/users';
import { ArrowRightLeft, Ban, Search, ShieldCheck, ShieldMinus, ShieldPlus, X } from 'lucide-react';

interface ScopeMembersTableProps {
  scopeType: ManageableScopeType;
  users: OrganizationMember[];
  isLoading: boolean;
  error: string;
  selectedUserIdSet: Set<string>;
  accent: 'indigo' | 'emerald' | 'cyan';
  onToggleUser: (userId: string) => void;
  onToggleVisibleUsers: () => void;
  onAssignRole: (
    userId: string,
    roleKey: NonEventRoleKey,
    startsAt: string,
    endsAt: string | null,
  ) => Promise<void>;
  onRemoveRole: (userId: string, roleKey: NonEventRoleKey, endedAt: string) => Promise<void>;
  onRevokeMembership: (userId: string) => void;
  onTransferLead: (targetUserId: string) => Promise<void>;
}

type RoleActionDialogState = {
  mode: 'assign' | 'end';
  user: OrganizationMember;
  roleKey: NonEventRoleKey;
} | null;

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
  onRevokeMembership,
  onTransferLead,
}: ScopeMembersTableProps) {
  const [roleActionDialog, setRoleActionDialog] = useState<RoleActionDialogState>(null);
  const [isTransferLeadModalOpen, setIsTransferLeadModalOpen] = useState(false);
  const selectableUsers = users.filter((user) => canEndMembership(user));
  const areAllVisibleUsersSelected =
    selectableUsers.length > 0 && selectableUsers.every((user) => selectedUserIdSet.has(user.uid));
  const leadRoleKey = getLeadRoleForScope(scopeType);
  const deputyRoleKey = getDeputyRoleForScope(scopeType);
  const currentLead = users.find((user) =>
    user.roleAssignments.some(
      (assignment) => assignment.roleKey === leadRoleKey && isActiveNowAssignment(assignment),
    ),
  );
  const checkboxClassName =
    accent === 'indigo'
      ? 'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
      : accent === 'emerald'
        ? 'h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
        : 'h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500';

  return (
    <div className="relative min-h-72 flex-1">
      {isLoading && <MembersLoadingOverlay />}
      <div className="flex justify-end border-b border-slate-200 bg-white px-5 py-3">
        <button
          type="button"
          onClick={() => setIsTransferLeadModalOpen(true)}
          disabled={!currentLead || isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Chuyển giao trưởng
        </button>
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
                  disabled={isLoading || selectableUsers.length === 0}
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
            ) : users.length > 0 ? (
              users.map((user) => {
                const lifecycleState = getMembershipLifecycleState(user);
                const visibleRoleAssignments = user.roleAssignments.filter((assignment) =>
                  isCurrentOrUpcomingAssignment(assignment),
                );
                const hasLeadRole = visibleRoleAssignments.some(
                  (assignment) => assignment.roleKey === leadRoleKey,
                );
                const hasDeputyRole = visibleRoleAssignments.some(
                  (assignment) => assignment.roleKey === deputyRoleKey,
                );
                const isCurrentLead = currentLead?.uid === user.uid;
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
                        disabled={!isSelectable}
                        className={checkboxClassName}
                        aria-label={`Chọn ${getFullName(user)}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatarUrl} size="sm" />
                        <span className="min-w-0">
                          <span className="block font-semibold whitespace-nowrap text-slate-950">
                            {getFullName(user)}
                          </span>
                          <PickerUserStatusBadge status={user.status ?? 'active'} />
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      @{user.username}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
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
                        {(isCurrentLead || !currentLead) && (
                          <ActionButton
                            label={hasLeadRole ? 'Gỡ trưởng' : 'Gán trưởng'}
                            tone={hasLeadRole ? 'danger' : 'neutral'}
                            onClick={() =>
                              setRoleActionDialog({
                                mode: hasLeadRole ? 'end' : 'assign',
                                user,
                                roleKey: leadRoleKey,
                              })
                            }
                            disabled={isRoleActionDisabled}
                          >
                            {hasLeadRole ? (
                              <ShieldMinus className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
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
                          disabled={isRoleActionDisabled}
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
                          disabled={!canRevoke}
                        >
                          <Ban className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyTableRow colSpan={10}>Chưa có thành viên trong scope này.</EmptyTableRow>
            )}
          </tbody>
        </table>
      </div>
      {roleActionDialog && (
        <RoleActionModal
          action={roleActionDialog}
          onClose={() => setRoleActionDialog(null)}
          onAssignRole={onAssignRole}
          onRemoveRole={onRemoveRole}
        />
      )}
      {isTransferLeadModalOpen && currentLead && (
        <TransferLeadModal
          currentLead={currentLead}
          onClose={() => setIsTransferLeadModalOpen(false)}
          onTransferLead={onTransferLead}
        />
      )}
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

type RoleAssignment = OrganizationMember['roleAssignments'][number];
type RoleAssignmentLifecycleState = 'active' | 'upcoming';

function RoleAssignmentBadge({ assignment }: { assignment: RoleAssignment }) {
  const state = getRoleAssignmentLifecycleState(assignment);
  const stateClassName =
    state === 'upcoming'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span
      className={`rounded-full border px-2 py-1 text-xs font-semibold ${stateClassName}`}
      title={`Bắt đầu: ${formatVietnamDateTime(assignment.startsAt)}${
        assignment.endsAt ? ` - Kết thúc: ${formatVietnamDateTime(assignment.endsAt)}` : ''
      }`}
    >
      {ROLE_LABELS[assignment.roleKey]} · {state === 'upcoming' ? 'Sắp hiệu lực' : 'Đang hiệu lực'}
    </span>
  );
}

interface RoleActionModalProps {
  action: NonNullable<RoleActionDialogState>;
  onClose: () => void;
  onAssignRole: ScopeMembersTableProps['onAssignRole'];
  onRemoveRole: ScopeMembersTableProps['onRemoveRole'];
}

function RoleActionModal({ action, onClose, onAssignRole, onRemoveRole }: RoleActionModalProps) {
  const [startsAtValue, setStartsAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [endsAtValue, setEndsAtValue] = useState('');
  const [endedAtValue, setEndedAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const isAssigning = action.mode === 'assign';
  const isLeadRole =
    action.roleKey === 'division_lead' ||
    action.roleKey === 'group_lead' ||
    action.roleKey === 'club_lead';

  async function handleSubmit() {
    setError('');

    try {
      setIsSaving(true);

      if (isAssigning) {
        const startsAt = fromVietnamDateTimeLocalValue(startsAtValue);
        const endsAt = endsAtValue ? fromVietnamDateTimeLocalValue(endsAtValue) : null;

        if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
          setError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
          return;
        }

        await onAssignRole(action.user.uid, action.roleKey, startsAt, endsAt);
      } else {
        await onRemoveRole(
          action.user.uid,
          action.roleKey,
          fromVietnamDateTimeLocalValue(endedAtValue),
        );
      }

      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể cập nhật chức vụ.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {isAssigning ? 'Bổ nhiệm chức vụ' : 'Kết thúc chức vụ'}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {getFullName(action.user)} · {ROLE_LABELS[action.roleKey]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {isAssigning ? (
            <>
              {isLeadRole && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Nếu scope đã có cấp trưởng trùng thời gian, thao tác này sẽ bị từ chối. Hãy dùng
                  luồng chuyển giao trưởng để thay thế cấp trưởng hiện tại.
                </p>
              )}
              <DateTimeField
                label="Bắt đầu"
                value={startsAtValue}
                onChange={setStartsAtValue}
                disabled={isSaving}
              />
              <DateTimeField
                label="Kết thúc"
                value={endsAtValue}
                onChange={setEndsAtValue}
                disabled={isSaving}
                optional
              />
            </>
          ) : (
            <DateTimeField
              label="Kết thúc lúc"
              value={endedAtValue}
              onChange={setEndedAtValue}
              disabled={isSaving}
            />
          )}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? 'Đang lưu' : isAssigning ? 'Bổ nhiệm' : 'Kết thúc'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TransferLeadModalProps {
  currentLead: OrganizationMember;
  onClose: () => void;
  onTransferLead: ScopeMembersTableProps['onTransferLead'];
}

function TransferLeadModal({ currentLead, onClose, onTransferLead }: TransferLeadModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const queryText = searchValue.trim();

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(
      async () => {
        if (queryText.length > 0 && queryText.length < 2) {
          setUsers([]);
          setIsSearching(false);
          return;
        }

        setIsSearching(true);
        setError('');

        try {
          const nextUsers = await queryUsers({ search: queryText, limit: queryText ? 12 : 20 });

          if (isActive) {
            setUsers(nextUsers);
          }
        } catch {
          if (isActive) {
            setUsers([]);
            setError('Không thể tải danh sách thành viên.');
          }
        } finally {
          if (isActive) {
            setIsSearching(false);
          }
        }
      },
      queryText ? 250 : 0,
    );

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [queryText]);

  async function handleTransfer() {
    if (!targetUser) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onTransferLead(targetUser.uid);
      onClose();
    } catch (transferError) {
      setError(
        transferError instanceof Error ? transferError.message : 'Không thể chuyển giao trưởng.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">Chuyển giao trưởng</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Chuyển giao có hiệu lực ngay sau khi xác nhận.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <TransferUserCard label="Trưởng hiện tại" user={currentLead} />
            <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <TransferUserCard label="Trưởng mới" user={targetUser} />
          </div>

          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm theo username, email hoặc tên"
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </label>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {queryText.length > 0 && queryText.length < 2 ? (
              <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                Nhập ít nhất 2 ký tự để tìm thành viên.
              </p>
            ) : isSearching ? (
              <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                Đang tìm kiếm...
              </p>
            ) : users.length > 0 ? (
              <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                      if (user.status === 'active') {
                        setTargetUser(user);
                      }
                    }}
                    disabled={isSaving || user.status !== 'active'}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar src={user.avatarUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-950">
                          {getFullName(user)}
                        </span>
                        <span className="block truncate text-xs font-medium text-slate-500">
                          @{user.username} · {user.email}
                        </span>
                        <PickerUserStatusBadge status={user.status ?? 'active'} />
                      </span>
                    </span>
                    <span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                      Chọn
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                Không tìm thấy thành viên phù hợp.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleTransfer()}
            disabled={isSaving || !targetUser}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? 'Đang chuyển giao' : 'Xác nhận chuyển giao'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferUserCard({
  label,
  user,
}: {
  label: string;
  user: OrganizationMember | AppUser | null;
}) {
  return (
    <div className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      {user ? (
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <Avatar src={user.avatarUrl} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-950">{getFullName(user)}</div>
            <div className="truncate text-xs font-medium text-slate-500">
              @{user.username} · {user.email}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm font-medium text-slate-400">Chưa chọn</div>
      )}
    </div>
  );
}

function PickerUserStatusBadge({ status }: { status: AppUser['status'] }) {
  const className =
    status === 'disabled'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>
      {status === 'disabled' ? 'Disabled' : 'Active'}
    </span>
  );
}

interface DateTimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  optional?: boolean;
}

function DateTimeField({ label, value, onChange, disabled, optional = false }: DateTimeFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">
        {label}
        {optional ? <span className="font-medium text-slate-400"> (tùy chọn)</span> : null}
      </span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

type MembershipLifecycleState = 'active' | 'upcoming' | 'expired' | 'ended' | 'revoked';

function isCurrentOrUpcomingAssignment(assignment: RoleAssignment) {
  if (assignment.status !== 'active') {
    return false;
  }

  const endsAt = assignment.endsAt ? new Date(assignment.endsAt).getTime() : null;

  return endsAt === null || endsAt > Date.now();
}

function isActiveNowAssignment(assignment: RoleAssignment) {
  if (assignment.status !== 'active') {
    return false;
  }

  const now = Date.now();
  const startsAt = new Date(assignment.startsAt).getTime();
  const endsAt = assignment.endsAt ? new Date(assignment.endsAt).getTime() : null;

  return startsAt <= now && (endsAt === null || endsAt > now);
}

function getRoleAssignmentLifecycleState(
  assignment: RoleAssignment,
): RoleAssignmentLifecycleState {
  return new Date(assignment.startsAt).getTime() > Date.now() ? 'upcoming' : 'active';
}

function getMembershipLifecycleState(user: OrganizationMember): MembershipLifecycleState {
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

function canEndMembership(user: OrganizationMember) {
  return user.membership.status === 'active';
}

function canRevokeMembership(user: OrganizationMember) {
  return (
    user.membership.status === 'active' && new Date(user.membership.startsAt).getTime() <= Date.now()
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

function LifecycleStatusBadge({ state }: { state: MembershipLifecycleState }) {
  const config = lifecycleStatusConfig[state];

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function LifecycleActorLine({
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
    <div title={actor.email}>
      {label}: {actor.name}
    </div>
  );
}

function formatVietnamDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
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
