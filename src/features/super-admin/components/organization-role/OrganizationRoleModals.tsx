import type { UserSearchResultDto } from '@/features/users/types';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import { UserSummary } from '@/features/super-admin/components/organization-role/OrganizationRolePanels';
import { getDisplayName } from '@/features/super-admin/components/organization-role/organizationRoleUtils';
import { searchUsers } from '@/features/users/client/searchUsers';
import {
  formatOrganizationRoleApiError,
  formatTransferLeadApiError,
  type OrganizationRoleAssignmentDetail,
} from '@/services/organizationAdmin';
import Avatar from '@/shared/layout/Avatar';
import { ArrowRightLeft, Search, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export function AssignViceCaptainModal({
  onClose,
  onAssign,
}: {
  onClose: () => void;
  onAssign: (userId: string, startsAt: string, endsAt: string | null) => Promise<void>;
}) {
  const [targetUser, setTargetUser] = useState<UserSearchResultDto | null>(null);
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
      setError(formatOrganizationRoleApiError(assignError, 'Không thể bổ nhiệm Đội phó.'));
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

export function TransferCaptainModal({
  currentCaptain,
  onClose,
  onTransfer,
}: {
  currentCaptain: OrganizationRoleAssignmentDetail | null;
  onClose: () => void;
  onTransfer: (targetUserId: string) => Promise<void>;
}) {
  const [targetUser, setTargetUser] = useState<UserSearchResultDto | null>(null);
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
        currentCaptain
          ? formatTransferLeadApiError(transferError, 'Không thể chuyển giao Đội trưởng.')
          : formatOrganizationRoleApiError(transferError, 'Không thể bổ nhiệm Đội trưởng.'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RoleUserPickerModal
      title={currentCaptain ? 'Chuyển giao Đội trưởng' : 'Bổ nhiệm Đội trưởng'}
      confirmLabel={currentCaptain ? 'Xác nhận chuyển giao' : 'Bổ nhiệm'}
      isSaving={isSaving}
      targetUser={targetUser}
      error={error}
      onClose={onClose}
      onConfirm={() => void handleSubmit()}
      onTargetUserChange={setTargetUser}
      currentUser={currentCaptain?.user}
    />
  );
}

export function EndViceCaptainModal({
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
      setError(formatOrganizationRoleApiError(endError, 'Không thể kết thúc nhiệm kỳ Đội phó.'));
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
  children?: ReactNode;
  title: string;
  confirmLabel: string;
  currentUser?: OrganizationRoleAssignmentDetail['user'];
  targetUser: UserSearchResultDto | null;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
  onTargetUserChange: (user: UserSearchResultDto) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<UserSearchResultDto[]>([]);
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
          const nextUsers = await searchUsers({ search: queryText, limit: queryText ? 12 : 20 });

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
  children: ReactNode;
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
  user: OrganizationRoleAssignmentDetail['user'] | UserSearchResultDto | null;
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

function PickerUserStatusBadge({ status }: { status: UserSearchResultDto['status'] }) {
  const className =
    status === 'disabled'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span
      className={`mt-1 inline-flex w-max items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {status === 'disabled' ? 'Disabled' : 'Active'}
    </span>
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
