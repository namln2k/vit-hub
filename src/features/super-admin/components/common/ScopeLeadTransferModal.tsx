import type { UserSearchResultDto } from '@/features/users/types';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import { searchUsers } from '@/features/users/client/searchUsers';
import { formatTransferLeadApiError, type OrganizationMember } from '@/services/organizationAdmin';
import Avatar from '@/shared/layout/Avatar';
import { ArrowRightLeft, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ScopeMembersTableProps } from '@/features/super-admin/components/common/scopeMemberTypes';

interface TransferLeadModalProps {
  currentLead: OrganizationMember;
  leadRoleLabel: string;
  onClose: () => void;
  onTransferLead: ScopeMembersTableProps['onTransferLead'];
}

export default function ScopeLeadTransferModal({
  currentLead,
  leadRoleLabel,
  onClose,
  onTransferLead,
}: TransferLeadModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<UserSearchResultDto[]>([]);
  const [targetUser, setTargetUser] = useState<UserSearchResultDto | null>(null);
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
          const nextUsers = await searchUsers({ search: queryText, limit: queryText ? 12 : 20 });

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
        formatTransferLeadApiError(transferError, `Không thể chuyển giao ${leadRoleLabel}.`),
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
            <h2 className="text-base font-bold text-slate-950">Chuyển giao {leadRoleLabel}</h2>
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
            <TransferUserCard label={`${leadRoleLabel} hiện tại`} user={currentLead} />
            <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 sm:flex">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <TransferUserCard label={`${leadRoleLabel} mới`} user={targetUser} />
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
  user: OrganizationMember | UserSearchResultDto | null;
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

export function PickerUserStatusBadge({ status }: { status: UserSearchResultDto['status'] }) {
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
