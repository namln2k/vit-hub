import type { UserSearchResultDto } from '@/features/users/types';
import { getFullName } from '@/features/super-admin/lib/userUtils';
import Avatar from '@/shared/layout/Avatar';
import Sharingan from '@/shared/loading/Sharingan';
import { Check, MailPlus, Search, UserPlus, X } from 'lucide-react';

type AddUsersModalEntityId = 'group' | 'division' | 'club';

interface AddUsersModalProps {
  availableUsers: UserSearchResultDto[];
  emailImportError: string;
  emailImportMessage: string;
  emailListValue: string;
  entityId: AddUsersModalEntityId;
  entityLabel: string;
  entityName: string;
  isAdding: boolean;
  isImportingEmails: boolean;
  isSearching: boolean;
  queryText: string;
  searchError: string;
  searchValue: string;
  selectedUsers: UserSearchResultDto[];
  startsAtValue: string;
  onClose: () => void;
  onEmailListValueChange: (value: string) => void;
  onImportEmails: () => void;
  onRemoveSelectedUser: (userId: string) => void;
  onSearchValueChange: (value: string) => void;
  onSelectUser: (user: UserSearchResultDto) => void;
  onStartsAtValueChange: (value: string) => void;
  onSubmit: () => void;
}

const dialogTitleIdByEntityId = {
  division: 'add-division-users-title',
  group: 'add-group-users-title',
  club: 'add-club-users-title',
} satisfies Record<AddUsersModalEntityId, string>;

export default function AddUsersModal({
  availableUsers,
  emailImportError,
  emailImportMessage,
  emailListValue,
  entityId,
  entityLabel,
  entityName,
  isAdding,
  isImportingEmails,
  isSearching,
  queryText,
  searchError,
  searchValue,
  selectedUsers,
  startsAtValue,
  onClose,
  onEmailListValueChange,
  onImportEmails,
  onRemoveSelectedUser,
  onSearchValueChange,
  onSelectUser,
  onStartsAtValueChange,
  onSubmit,
}: AddUsersModalProps) {
  const dialogTitleId = dialogTitleIdByEntityId[entityId];
  const title = `Thêm thành viên vào ${entityLabel}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isAdding) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={dialogTitleId} className="text-lg font-bold text-slate-950">
              {title}
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{entityName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isAdding}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              placeholder="Tìm theo username, email hoặc tên"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500"
            />
            {isSearching && (
              <Sharingan
                className="absolute right-3 top-1/2 -translate-y-1/2"
                size={16}
                label="Đang tìm kiếm thành viên"
              />
            )}
          </label>

          <label className="mt-4 block rounded-lg border border-slate-200 p-3">
            <span className="block text-xs font-bold uppercase text-slate-600">
              Bắt đầu membership
            </span>
            <input
              type="datetime-local"
              value={startsAtValue}
              onChange={(event) => onStartsAtValueChange(event.target.value)}
              required
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500"
            />
            <span className="mt-1 block text-xs font-medium text-slate-500">
              Múi giờ Asia/Ho_Chi_Minh.
            </span>
          </label>

          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <label className="block text-xs font-bold uppercase text-slate-600">
              Import theo list email
            </label>
            <textarea
              value={emailListValue}
              onChange={(event) => onEmailListValueChange(event.target.value)}
              placeholder="member1@example.com&#10;member2@example.com"
              rows={4}
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500"
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Hỗ trợ xuống dòng, dấu phẩy, chấm phẩy hoặc khoảng trắng.
              </p>
              <button
                type="button"
                onClick={onImportEmails}
                disabled={isAdding || isImportingEmails || emailListValue.trim().length === 0}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isImportingEmails ? (
                  <Sharingan size={16} label="Đang import email" />
                ) : (
                  <MailPlus className="h-4 w-4" />
                )}
                Import email
              </button>
            </div>
            {emailImportError && (
              <p className="mt-2 text-sm font-medium text-red-600">{emailImportError}</p>
            )}
            {emailImportMessage && (
              <p className="mt-2 text-sm font-medium text-emerald-700">{emailImportMessage}</p>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="mb-2 text-xs font-bold uppercase text-emerald-700">
                Đã chọn {selectedUsers.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => onRemoveSelectedUser(user.uid)}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-white py-1 pl-1 pr-2 text-sm font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                  >
                    <Avatar src={user.avatarUrl} size="sm" />
                    <span className="max-w-48 truncate">{getFullName(user)}</span>
                    <X className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {searchError ? (
              <p className="px-4 py-6 text-center text-sm font-medium text-red-600">
                {searchError}
              </p>
            ) : queryText.length > 0 && queryText.length < 2 ? (
              <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                Nhập ít nhất 2 ký tự để tìm thành viên.
              </p>
            ) : isSearching ? (
              <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                Đang tìm kiếm...
              </p>
            ) : availableUsers.length > 0 ? (
              <div className="max-h-80 divide-y divide-slate-200 overflow-y-auto">
                {availableUsers.map((user) => (
                  <button
                    key={user.uid}
                    type="button"
                    onClick={() => {
                      if (user.status !== 'disabled') {
                        onSelectUser(user);
                      }
                    }}
                    disabled={user.status === 'disabled'}
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
                        <UserStatusBadge status={user.status ?? 'active'} />
                      </span>
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500">
                      <UserPlus className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                Không tìm thấy thành viên phù hợp hoặc tất cả đã thuộc {entityLabel} này.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isAdding}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={selectedUsers.length === 0 || isAdding || startsAtValue.trim().length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isAdding ? (
              <Sharingan size={16} label="Đang thêm thành viên" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Thêm {selectedUsers.length > 0 ? selectedUsers.length : ''} thành viên
          </button>
        </div>
      </div>
    </div>
  );
}

function UserStatusBadge({ status }: { status: UserSearchResultDto['status'] }) {
  const className =
    status === 'disabled'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span
      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {status === 'disabled' ? 'Disabled' : 'Active'}
    </span>
  );
}
