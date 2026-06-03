import { addUsersToGroup } from '@/api/groups';
import { queryUsers } from '@/api/users';
import Avatar from '@/components/shared/layout/Avatar';
import Sharingan from '@/components/shared/loading/Sharingan';
import type { AppUser } from '@/contexts/auth';
import { Check, MailPlus, Search, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getFullName, normalizeSearchValue } from '@/components/pages/super-admin/common/UserUtils';
import { formatEmailList, parseEmailList } from '@/utils/import/emailListImport';

interface AddGroupUsersModalProps {
  groupId: string;
  groupName: string;
  existingUserIds: string[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export default function AddGroupUsersModal({
  groupId,
  groupName,
  existingUserIds,
  onClose,
  onAdded,
}: AddGroupUsersModalProps) {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isImportingEmails, setIsImportingEmails] = useState(false);
  const [emailListValue, setEmailListValue] = useState('');
  const [searchError, setSearchError] = useState('');
  const [emailImportError, setEmailImportError] = useState('');
  const [emailImportMessage, setEmailImportMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const queryText = normalizeSearchValue(searchValue);
  const existingUserIdSet = useMemo(() => new Set(existingUserIds), [existingUserIds]);
  const selectedUserIdSet = useMemo(
    () => new Set(selectedUsers.map((user) => user.uid)),
    [selectedUsers],
  );
  const availableUsers = useMemo(
    () =>
      users.filter((user) => !existingUserIdSet.has(user.uid) && !selectedUserIdSet.has(user.uid)),
    [existingUserIdSet, selectedUserIdSet, users],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isAdding) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAdding, onClose]);

  useEffect(() => {
    if (queryText.length > 0 && queryText.length < 2) {
      setUsers([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(
      async () => {
        setIsSearching(true);
        setSearchError('');

        try {
          const nextUsers = await queryUsers({ search: queryText, limit: queryText ? 12 : 20 });
          if (isActive) {
            setUsers(nextUsers);
          }
        } catch {
          if (isActive) {
            setSearchError('Không thể tải danh sách thành viên lúc này.');
            setUsers([]);
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

  function selectUser(user: AppUser) {
    setSelectedUsers((currentUsers) => [...currentUsers, user]);
    setSubmitError('');
  }

  function removeSelectedUser(userId: string) {
    setSelectedUsers((currentUsers) => currentUsers.filter((user) => user.uid !== userId));
    setSubmitError('');
  }

  async function handleImportEmails() {
    const parsedEmails = parseEmailList(emailListValue);

    setEmailImportError('');
    setEmailImportMessage('');
    setSubmitError('');

    if (parsedEmails.invalidEmails.length > 0) {
      setEmailImportError(`Email không hợp lệ: ${formatEmailList(parsedEmails.invalidEmails)}.`);
      return;
    }

    if (parsedEmails.duplicateEmails.length > 0) {
      setEmailImportError(
        `Email bị trùng trong danh sách: ${formatEmailList(parsedEmails.duplicateEmails)}.`,
      );
      return;
    }

    if (parsedEmails.emails.length === 0) {
      setEmailImportError('Nhập ít nhất 1 email để import.');
      return;
    }

    setIsImportingEmails(true);

    try {
      const matchedUsers = await queryUsers({
        emails: parsedEmails.emails,
        limit: parsedEmails.emails.length,
      });
      const matchedEmailSet = new Set(matchedUsers.map((user) => user.email.toLowerCase()));
      const missingEmails = parsedEmails.emails.filter((email) => !matchedEmailSet.has(email));
      const importableUsers = matchedUsers.filter(
        (user) => !existingUserIdSet.has(user.uid) && !selectedUserIdSet.has(user.uid),
      );
      const skippedUsers = matchedUsers.filter(
        (user) => existingUserIdSet.has(user.uid) || selectedUserIdSet.has(user.uid),
      );

      if (missingEmails.length > 0) {
        setEmailImportError(`Không tìm thấy user: ${formatEmailList(missingEmails)}.`);
        return;
      }

      if (importableUsers.length === 0) {
        setEmailImportError('Tất cả email trong danh sách đã thuộc nhóm hoặc đã được chọn.');
        return;
      }

      setSelectedUsers((currentUsers) => [...currentUsers, ...importableUsers]);
      setEmailImportMessage(
        `Đã thêm ${importableUsers.length} user vào danh sách chọn${
          skippedUsers.length > 0 ? `, bỏ qua ${skippedUsers.length} user đã có` : ''
        }.`,
      );
      setEmailListValue('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setEmailImportError(
        message ? `Không thể import theo email: ${message}` : 'Không thể import theo email.',
      );
    } finally {
      setIsImportingEmails(false);
    }
  }

  async function handleSubmit() {
    if (selectedUsers.length === 0) {
      return;
    }

    setIsAdding(true);
    setSubmitError('');

    try {
      await addUsersToGroup(
        groupId,
        selectedUsers.map((user) => user.uid),
      );
      await onAdded();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setSubmitError(
        message ? `Không thể thêm thành viên: ${message}` : 'Không thể thêm thành viên.',
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-group-users-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isAdding) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="add-group-users-title" className="text-lg font-bold text-slate-950">
              Thêm thành viên vào nhóm
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">{groupName}</p>
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
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm theo username, email hoặc tên"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500"
            />
            {isSearching && (
              <Sharingan
                className="absolute right-3 top-1/2 -translate-y-1/2"
                size={16}
                label="Đang tìm kiếm thành viên"
              />
            )}
          </label>

          <div className="mt-4 rounded-lg border border-slate-200 p-3">
            <label className="block text-xs font-bold uppercase text-slate-600">
              Import theo list email
            </label>
            <textarea
              value={emailListValue}
              onChange={(event) => {
                setEmailListValue(event.target.value);
                setEmailImportError('');
                setEmailImportMessage('');
              }}
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
                onClick={handleImportEmails}
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
                    onClick={() => removeSelectedUser(user.uid)}
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
                    onClick={() => selectUser(user)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
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
                Không tìm thấy thành viên phù hợp hoặc tất cả đã thuộc nhóm này.
              </p>
            )}
          </div>

          {submitError && <p className="mt-3 text-sm font-medium text-red-600">{submitError}</p>}
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
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || isAdding}
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
