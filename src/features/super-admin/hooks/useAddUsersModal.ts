import type { AppUser } from '@/contexts/auth';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import { normalizeSearchValue } from '@/features/super-admin/lib/userUtils';
import { formatEmailList, parseEmailList } from '@/services/users/emailList';
import { queryUsers } from '@/services/users';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface UseAddUsersModalOptions {
  existingUserIds: string[];
  entityLabel: string;
  successToastId: string;
  errorToastId: string;
  onAddUsers: (userIds: string[], startsAt: string) => Promise<void>;
  onAdded: () => Promise<void>;
  onClose: () => void;
}

export function useAddUsersModal({
  existingUserIds,
  entityLabel,
  successToastId,
  errorToastId,
  onAddUsers,
  onAdded,
  onClose,
}: UseAddUsersModalOptions) {
  const [searchValue, setSearchValue] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isImportingEmails, setIsImportingEmails] = useState(false);
  const [emailListValue, setEmailListValue] = useState('');
  const [startsAtValue, setStartsAtValue] = useState(() => toVietnamDateTimeLocalValue(new Date()));
  const [searchError, setSearchError] = useState('');
  const [emailImportError, setEmailImportError] = useState('');
  const [emailImportMessage, setEmailImportMessage] = useState('');

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
      const timeoutId = window.setTimeout(() => {
        setUsers([]);
        setSearchError('');
        setIsSearching(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
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
    if (user.status !== 'active') {
      return;
    }

    setSelectedUsers((currentUsers) => [...currentUsers, user]);
  }

  function removeSelectedUser(userId: string) {
    setSelectedUsers((currentUsers) => currentUsers.filter((user) => user.uid !== userId));
  }

  function updateEmailListValue(value: string) {
    setEmailListValue(value);
    setEmailImportError('');
    setEmailImportMessage('');
  }

  async function importEmails() {
    const parsedEmails = parseEmailList(emailListValue);

    setEmailImportError('');
    setEmailImportMessage('');

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
        (user) =>
          user.status === 'active' &&
          !existingUserIdSet.has(user.uid) &&
          !selectedUserIdSet.has(user.uid),
      );
      const disabledUsers = matchedUsers.filter((user) => user.status !== 'active');
      const skippedUsers = matchedUsers.filter(
        (user) => existingUserIdSet.has(user.uid) || selectedUserIdSet.has(user.uid),
      );

      if (missingEmails.length > 0) {
        setEmailImportError(`Không tìm thấy user: ${formatEmailList(missingEmails)}.`);
        return;
      }

      if (importableUsers.length === 0) {
        const reason =
          disabledUsers.length > 0
            ? `Tất cả email trong danh sách đã thuộc ${entityLabel}, đã được chọn hoặc đang Disabled.`
            : `Tất cả email trong danh sách đã thuộc ${entityLabel} hoặc đã được chọn.`;
        setEmailImportError(reason);
        return;
      }

      setSelectedUsers((currentUsers) => [...currentUsers, ...importableUsers]);
      setEmailImportMessage(
        `Đã thêm ${importableUsers.length} user vào danh sách chọn${
          skippedUsers.length > 0 ? `, bỏ qua ${skippedUsers.length} user đã có` : ''
        }${disabledUsers.length > 0 ? `, bỏ qua ${disabledUsers.length} user Disabled` : ''}.`,
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

  async function submit() {
    if (selectedUsers.length === 0) {
      return;
    }

    setIsAdding(true);
    const selectedCount = selectedUsers.length;

    try {
      await onAddUsers(
        selectedUsers.map((user) => user.uid),
        fromVietnamDateTimeLocalValue(startsAtValue),
      );
      await onAdded();
      onClose();
      toast.success(`Đã thêm ${selectedCount} thành viên vào ${entityLabel}.`, {
        id: successToastId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message ? `Không thể thêm thành viên: ${message}` : 'Không thể thêm thành viên.',
        { id: errorToastId },
      );
    } finally {
      setIsAdding(false);
    }
  }

  return {
    availableUsers,
    emailImportError,
    emailImportMessage,
    emailListValue,
    importEmails,
    isAdding,
    isImportingEmails,
    isSearching,
    queryText,
    removeSelectedUser,
    searchError,
    searchValue,
    selectUser,
    selectedUsers,
    setStartsAtValue,
    setSearchValue,
    startsAtValue,
    submit,
    updateEmailListValue,
  };
}
