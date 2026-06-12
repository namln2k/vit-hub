import type { AppUser } from '@/contexts/auth';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import Avatar from '@/shared/layout/Avatar';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  assignOrganizationRole,
  endOrganizationRole,
  listOrganizationRoles,
  transferOrganizationCaptain,
  type OrganizationRoleAssignmentDetail,
  type OrganizationRoleKey,
  type OrganizationTechnicalAdmin,
} from '@/services/organizationAdmin';
import { queryUsers } from '@/services/users';
import { ArrowRightLeft, Search, ShieldPlus, ShieldX, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const SECTION =
  ADMIN_SECTIONS.find((section) => section.id === 'organization-roles') ?? ADMIN_SECTIONS[0];

const ROLE_LABELS = {
  captain: 'Đội trưởng',
  vice_captain: 'Đội phó',
} satisfies Record<OrganizationRoleKey, string>;

type RoleLifecycleState = 'current' | 'upcoming';

export default function OrganizationRolesManagement() {
  const [assignments, setAssignments] = useState<OrganizationRoleAssignmentDetail[]>([]);
  const [technicalAdmins, setTechnicalAdmins] = useState<OrganizationTechnicalAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAssignViceModalOpen, setIsAssignViceModalOpen] = useState(false);
  const [endingAssignment, setEndingAssignment] =
    useState<OrganizationRoleAssignmentDetail | null>(null);
  const [isTransferCaptainModalOpen, setIsTransferCaptainModalOpen] = useState(false);

  const loadOrganizationRoles = useCallback(
    async (options: { showLoading?: boolean; isMounted?: () => boolean } = {}) => {
      const isMounted = options.isMounted ?? (() => true);

      if (options.showLoading ?? true) {
        setIsLoading(true);
      }

      setError('');

      try {
        const nextRoles = await listOrganizationRoles();

        if (isMounted()) {
          setAssignments(nextRoles.assignments);
          setTechnicalAdmins(nextRoles.technicalAdmins);
        }
      } catch (loadError) {
        if (isMounted()) {
          const message = loadError instanceof Error ? loadError.message : '';
          setError(message ? `Không thể tải chức vụ Đội: ${message}` : 'Không thể tải chức vụ Đội.');
          setAssignments([]);
          setTechnicalAdmins([]);
        }
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void loadOrganizationRoles({ isMounted: () => isActive });
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadOrganizationRoles]);

  const currentCaptain = useMemo(
    () =>
      assignments.find(
        (assignment) =>
          assignment.roleKey === 'captain' && getRoleLifecycleState(assignment) === 'current',
      ) ?? null,
    [assignments],
  );
  const captainAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.roleKey === 'captain'),
    [assignments],
  );
  const viceCaptainAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.roleKey === 'vice_captain'),
    [assignments],
  );

  async function handleAssignViceCaptain(userId: string, startsAt: string, endsAt: string | null) {
    try {
      await assignOrganizationRole(userId, 'vice_captain', startsAt, endsAt);
      toast.success('Đã bổ nhiệm Đội phó.', { id: 'organization-assign-vice-success' });
      await loadOrganizationRoles({ showLoading: false });
    } catch (assignError) {
      const message = assignError instanceof Error ? assignError.message : '';
      toast.error(message ? `Không thể bổ nhiệm Đội phó: ${message}` : 'Không thể bổ nhiệm Đội phó.', {
        id: 'organization-assign-vice-error',
      });
      throw assignError;
    }
  }

  async function handleEndViceCaptain(
    assignment: OrganizationRoleAssignmentDetail,
    endedAt: string,
  ) {
    try {
      await endOrganizationRole(assignment.userId, 'vice_captain', endedAt);
      toast.success('Đã kết thúc nhiệm kỳ Đội phó.', { id: 'organization-end-vice-success' });
      await loadOrganizationRoles({ showLoading: false });
    } catch (endError) {
      const message = endError instanceof Error ? endError.message : '';
      toast.error(
        message ? `Không thể kết thúc nhiệm kỳ Đội phó: ${message}` : 'Không thể kết thúc nhiệm kỳ Đội phó.',
        { id: 'organization-end-vice-error' },
      );
      throw endError;
    }
  }

  async function handleTransferCaptain(targetUserId: string) {
    try {
      await transferOrganizationCaptain(targetUserId);
      toast.success('Đã chuyển giao Đội trưởng.', { id: 'organization-transfer-captain-success' });
      await loadOrganizationRoles({ showLoading: false });
    } catch (transferError) {
      const message = transferError instanceof Error ? transferError.message : '';
      toast.error(
        message ? `Không thể chuyển giao Đội trưởng: ${message}` : 'Không thể chuyển giao Đội trưởng.',
        { id: 'organization-transfer-captain-error' },
      );
      throw transferError;
    }
  }

  return (
    <AdminContentPanel
      section={SECTION}
      title="Chức vụ Đội"
      count={`${assignments.length} nhiệm kỳ`}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsTransferCaptainModalOpen(true)}
            disabled={!currentCaptain || isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Chuyển giao Đội trưởng
          </button>
          <button
            type="button"
            onClick={() => setIsAssignViceModalOpen(true)}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShieldPlus className="h-4 w-4" />
            Bổ nhiệm Đội phó
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="px-5 py-10 text-center text-sm font-medium text-slate-500">
          Đang tải chức vụ Đội...
        </div>
      ) : error ? (
        <div className="px-5 py-10 text-center text-sm font-medium text-red-600">{error}</div>
      ) : (
        <div className="divide-y divide-slate-200">
          <section className="p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-950">Domain role assignments</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Đội trưởng và Đội phó là domain roles trong role_assignments.
              </p>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <RoleAssignmentGroup
                title="Đội trưởng"
                assignments={captainAssignments}
                emptyText="Chưa có nhiệm kỳ Đội trưởng hiện tại hoặc sắp tới."
              />
              <RoleAssignmentGroup
                title="Đội phó"
                assignments={viceCaptainAssignments}
                emptyText="Chưa có nhiệm kỳ Đội phó hiện tại hoặc sắp tới."
                onEndAssignment={setEndingAssignment}
              />
            </div>
          </section>

          <section className="p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-950">Technical super_admin</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                super_admin là quyền override kỹ thuật, không đồng nghĩa với Đội trưởng.
              </p>
            </div>
            <TechnicalAdminsTable admins={technicalAdmins} />
          </section>
        </div>
      )}

      {isAssignViceModalOpen && (
        <AssignViceCaptainModal
          onClose={() => setIsAssignViceModalOpen(false)}
          onAssign={handleAssignViceCaptain}
        />
      )}
      {endingAssignment && (
        <EndViceCaptainModal
          assignment={endingAssignment}
          onClose={() => setEndingAssignment(null)}
          onEnd={handleEndViceCaptain}
        />
      )}
      {isTransferCaptainModalOpen && currentCaptain && (
        <TransferCaptainModal
          currentCaptain={currentCaptain}
          onClose={() => setIsTransferCaptainModalOpen(false)}
          onTransfer={handleTransferCaptain}
        />
      )}
    </AdminContentPanel>
  );
}

function RoleAssignmentGroup({
  title,
  assignments,
  emptyText,
  onEndAssignment,
}: {
  title: string;
  assignments: OrganizationRoleAssignmentDetail[];
  emptyText: string;
  onEndAssignment?: (assignment: OrganizationRoleAssignmentDetail) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-extrabold uppercase text-slate-700">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
          {assignments.length}
        </span>
      </div>
      {assignments.length > 0 ? (
        <div className="divide-y divide-slate-200">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <UserSummary user={assignment.user} />
                <RoleStateBadge assignment={assignment} />
              </div>
              <div className="mt-3 grid gap-2 text-sm font-medium text-slate-600 sm:grid-cols-2">
                <div>Bắt đầu: {formatVietnamDateTime(assignment.startsAt)}</div>
                <div>
                  Kết thúc:{' '}
                  {assignment.endsAt ? formatVietnamDateTime(assignment.endsAt) : 'Chưa đặt'}
                </div>
                <div>Status DB: {assignment.status}</div>
                <div>Role: {ROLE_LABELS[assignment.roleKey]}</div>
              </div>
              {onEndAssignment && getRoleLifecycleState(assignment) === 'current' && (
                <button
                  type="button"
                  onClick={() => onEndAssignment(assignment)}
                  className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <ShieldX className="h-4 w-4" />
                  Kết thúc nhiệm kỳ
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">{emptyText}</div>
      )}
    </div>
  );
}

function TechnicalAdminsTable({ admins }: { admins: OrganizationTechnicalAdmin[] }) {
  if (admins.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-500">
        Không có technical super_admin.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <HeaderCell>Nhân sự</HeaderCell>
            <HeaderCell>Technical role</HeaderCell>
            <HeaderCell>Domain role</HeaderCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {admins.map((admin) => (
            <tr key={admin.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <UserSummary user={admin} />
              </td>
              <td className="px-5 py-4">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                  super_admin
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {admin.hasCaptainAssignment && <DomainRoleChip label="Đội trưởng" />}
                  {admin.hasViceCaptainAssignment && <DomainRoleChip label="Đội phó" />}
                  {!admin.hasCaptainAssignment && !admin.hasViceCaptainAssignment && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      Không có domain role Đội
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignViceCaptainModal({
  onClose,
  onAssign,
}: {
  onClose: () => void;
  onAssign: (userId: string, startsAt: string, endsAt: string | null) => Promise<void>;
}) {
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [startsAtValue, setStartsAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [endsAtValue, setEndsAtValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!targetUser) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      const startsAt = fromVietnamDateTimeLocalValue(startsAtValue);
      const endsAt = endsAtValue ? fromVietnamDateTimeLocalValue(endsAtValue) : null;

      if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        setError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
        return;
      }

      await onAssign(targetUser.uid, startsAt, endsAt);
      onClose();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Không thể bổ nhiệm Đội phó.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RoleUserPickerModal
      title="Bổ nhiệm Đội phó"
      confirmLabel="Bổ nhiệm"
      isSaving={isSaving}
      targetUser={targetUser}
      error={error}
      onClose={onClose}
      onConfirm={() => void handleSubmit()}
      onTargetUserChange={setTargetUser}
    >
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
    </RoleUserPickerModal>
  );
}

function TransferCaptainModal({
  currentCaptain,
  onClose,
  onTransfer,
}: {
  currentCaptain: OrganizationRoleAssignmentDetail;
  onClose: () => void;
  onTransfer: (targetUserId: string) => Promise<void>;
}) {
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!targetUser) {
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onTransfer(targetUser.uid);
      onClose();
    } catch (transferError) {
      setError(
        transferError instanceof Error ? transferError.message : 'Không thể chuyển giao Đội trưởng.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RoleUserPickerModal
      title="Chuyển giao Đội trưởng"
      confirmLabel="Xác nhận chuyển giao"
      isSaving={isSaving}
      targetUser={targetUser}
      error={error}
      onClose={onClose}
      onConfirm={() => void handleSubmit()}
      onTargetUserChange={setTargetUser}
      currentUser={currentCaptain.user}
    />
  );
}

function EndViceCaptainModal({
  assignment,
  onClose,
  onEnd,
}: {
  assignment: OrganizationRoleAssignmentDetail;
  onClose: () => void;
  onEnd: (assignment: OrganizationRoleAssignmentDetail, endedAt: string) => Promise<void>;
}) {
  const [endedAtValue, setEndedAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    setIsSaving(true);

    try {
      await onEnd(assignment, fromVietnamDateTimeLocalValue(endedAtValue));
      onClose();
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Không thể kết thúc nhiệm kỳ Đội phó.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <BaseModal title="Kết thúc nhiệm kỳ Đội phó" onClose={onClose} isSaving={isSaving}>
      <div className="space-y-4">
        <UserSummary user={assignment.user} />
        <DateTimeField
          label="Kết thúc lúc"
          value={endedAtValue}
          onChange={setEndedAtValue}
          disabled={isSaving}
        />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ModalActions
          confirmLabel="Kết thúc"
          isSaving={isSaving}
          canConfirm
          onClose={onClose}
          onConfirm={() => void handleSubmit()}
        />
      </div>
    </BaseModal>
  );
}

function RoleUserPickerModal({
  children,
  title,
  confirmLabel,
  currentUser,
  targetUser,
  isSaving,
  error,
  onClose,
  onConfirm,
  onTargetUserChange,
}: {
  children?: React.ReactNode;
  title: string;
  confirmLabel: string;
  currentUser?: OrganizationRoleAssignmentDetail['user'];
  targetUser: AppUser | null;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
  onTargetUserChange: (user: AppUser) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const queryText = searchValue.trim();

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(
      async () => {
        if (queryText.length > 0 && queryText.length < 2) {
          setUsers([]);
          setIsSearching(false);
          setSearchError('');
          return;
        }

        setIsSearching(true);
        setSearchError('');

        try {
          const nextUsers = await queryUsers({ search: queryText, limit: queryText ? 12 : 20 });

          if (isActive) {
            setUsers(nextUsers);
          }
        } catch {
          if (isActive) {
            setUsers([]);
            setSearchError('Không thể tải danh sách nhân sự.');
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

  return (
    <BaseModal title={title} onClose={onClose} isSaving={isSaving}>
      <div className="space-y-4">
        {currentUser && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <RoleUserCard label="Hiện tại" user={currentUser} />
            <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <RoleUserCard label="Người nhận" user={targetUser} />
          </div>
        )}
        {!currentUser && <RoleUserCard label="Người nhận" user={targetUser} />}

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            autoFocus
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Tìm theo username, email hoặc tên"
            disabled={isSaving}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          {queryText.length > 0 && queryText.length < 2 ? (
            <PickerMessage>Nhập ít nhất 2 ký tự để tìm nhân sự.</PickerMessage>
          ) : searchError ? (
            <PickerMessage className="text-red-600">{searchError}</PickerMessage>
          ) : isSearching ? (
            <PickerMessage>Đang tìm kiếm...</PickerMessage>
          ) : users.length > 0 ? (
            <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.uid}
                  type="button"
                  onClick={() => {
                    if (user.status === 'active') {
                      onTargetUserChange(user);
                    }
                  }}
                  disabled={isSaving || user.status !== 'active'}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar src={user.avatarUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950">
                        {getDisplayName(user)}
                      </span>
                      <span className="block truncate text-xs font-medium text-slate-500">
                        @{user.username} · {user.email}
                      </span>
                      {user.role === 'super_admin' && (
                        <span className="mt-1 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          technical super_admin
                        </span>
                      )}
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
            <PickerMessage>Không tìm thấy nhân sự phù hợp.</PickerMessage>
          )}
        </div>

        {children}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <ModalActions
          confirmLabel={confirmLabel}
          isSaving={isSaving}
          canConfirm={Boolean(targetUser)}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </div>
    </BaseModal>
  );
}

function BaseModal({
  children,
  title,
  isSaving,
  onClose,
}: {
  children: React.ReactNode;
  title: string;
  isSaving: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  confirmLabel,
  isSaving,
  canConfirm,
  onClose,
  onConfirm,
}: {
  confirmLabel: string;
  isSaving: boolean;
  canConfirm: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
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
        onClick={onConfirm}
        disabled={isSaving || !canConfirm}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving ? 'Đang lưu' : confirmLabel}
      </button>
    </div>
  );
}

function RoleUserCard({
  label,
  user,
}: {
  label: string;
  user: OrganizationRoleAssignmentDetail['user'] | AppUser | null;
}) {
  return (
    <div className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      {user ? (
        <div className="mt-3">
          <UserSummary user={user} />
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

function UserSummary({
  user,
}: {
  user: OrganizationRoleAssignmentDetail['user'] | OrganizationTechnicalAdmin | AppUser;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar src={user.avatarUrl} size="sm" />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-slate-950">{getDisplayName(user)}</div>
        <div className="truncate text-xs font-medium text-slate-500">
          @{user.username} · {user.email}
        </div>
      </div>
    </div>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
  disabled,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  optional?: boolean;
}) {
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
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    </label>
  );
}

function RoleStateBadge({ assignment }: { assignment: OrganizationRoleAssignmentDetail }) {
  const state = getRoleLifecycleState(assignment);
  const className =
    state === 'upcoming'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>
      {state === 'upcoming' ? 'Sắp hiệu lực' : 'Đang hiệu lực'}
    </span>
  );
}

function DomainRoleChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
      {label}
    </span>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">{children}</th>
  );
}

function PickerMessage({
  children,
  className = 'text-slate-500',
}: {
  children: string;
  className?: string;
}) {
  return <p className={`px-4 py-6 text-center text-sm font-medium ${className}`}>{children}</p>;
}

function ErrorMessage({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
      {children}
    </p>
  );
}

function getRoleLifecycleState(assignment: OrganizationRoleAssignmentDetail): RoleLifecycleState {
  return new Date(assignment.startsAt).getTime() > Date.now() ? 'upcoming' : 'current';
}

function getDisplayName(
  user: OrganizationRoleAssignmentDetail['user'] | OrganizationTechnicalAdmin | AppUser,
) {
  if ('name' in user) {
    return user.name;
  }

  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim() || user.email;
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
