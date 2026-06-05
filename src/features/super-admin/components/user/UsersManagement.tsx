import { importUsers, queryUsers } from '@/services/users';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/features/super-admin/lib/userUtils';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import type { AppUser } from '@/contexts/auth';
import {
  parseUserImportFile,
  USER_IMPORT_MAX_FILE_BYTES,
} from '@/services/users/import';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import ImportUsersPanel, { type ImportValidation } from './ImportUsersPanel';
import UsersTable from './UsersTable';
import { formatBytes } from '@/features/super-admin/lib/userDisplayUtils';
import { toast } from 'sonner';

const USERS_SECTION = ADMIN_SECTIONS.find((section) => section.id === 'users') ?? ADMIN_SECTIONS[0];

type UsersView = 'list' | 'import';

export default function UsersManagement() {
  const searchParams = useSearchParams();
  const activeView: UsersView = searchParams.get('view') === 'import' ? 'import' : 'list';
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [userError, setUserError] = useState('');
  const [validatedImport, setValidatedImport] = useState<ImportValidation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    if (!queryText) {
      return users;
    }

    return users.filter((user) =>
      [...getSearchableUserValues(user), USER_ROLE_LABELS[user.role]].some((value) =>
        normalizeSearchValue(value).includes(queryText),
      ),
    );
  }, [search, users]);

  const loadUsers = useCallback(
    async (options: { showLoading?: boolean; isMounted?: () => boolean } = {}) => {
      const isMounted = options.isMounted ?? (() => true);

      if (options.showLoading ?? true) {
        setIsLoadingUsers(true);
      }

      setUserError('');

      try {
        const nextUsers = await queryUsers({ fetchAll: true });

        if (isMounted()) {
          setUsers(nextUsers);
        }
      } catch (error) {
        if (isMounted()) {
          const message = error instanceof Error ? error.message : '';
          setUserError(
            message
              ? `Không thể tải danh sách nhân sự: ${message}`
              : 'Không thể tải danh sách nhân sự.',
          );
          setUsers([]);
        }
      } finally {
        if (isMounted()) {
          setIsLoadingUsers(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    void loadUsers({ isMounted: () => isActive });

    return () => {
      isActive = false;
    };
  }, [loadUsers]);

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setValidatedImport(null);
      const parsedUsers = await parseUserImportFile(file);
      setValidatedImport({ fileName: file.name, users: parsedUsers });
      toast.success(`File hợp lệ. Sẵn sàng import ${parsedUsers.length} nhân sự.`, {
        id: 'users-import-validate-success',
      });
    } catch (error) {
      setValidatedImport(null);
      toast.error(error instanceof Error ? error.message : 'Không thể đọc file import.', {
        id: 'users-import-validate-error',
      });
    }
  }

  async function handleImportValidatedUsers() {
    if (!validatedImport || isImporting) {
      return;
    }

    try {
      setIsImporting(true);
      const importedCount = await importUsers(validatedImport.users);
      toast.success(`Đã import ${importedCount} nhân sự từ ${validatedImport.fileName}.`, {
        id: 'users-import-success',
      });
      setValidatedImport(null);
      await loadUsers({ showLoading: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể import nhân sự.', {
        id: 'users-import-error',
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <AdminContentPanel
      section={USERS_SECTION}
      title={activeView === 'import' ? 'Import danh sách' : 'Danh sách nhân sự'}
      count={
        activeView === 'import'
          ? `Tối đa ${formatBytes(USER_IMPORT_MAX_FILE_BYTES)}`
          : `${filteredUsers.length} nhân sự`
      }
      actions={
        activeView === 'list' ? (
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm kiếm"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 sm:w-64"
            />
          </label>
        ) : null
      }
    >
      {activeView === 'import' ? (
        <ImportUsersPanel
          fileInputRef={fileInputRef}
          isImporting={isImporting}
          validatedImport={validatedImport}
          onFileChange={handleImportFileChange}
          onImport={handleImportValidatedUsers}
        />
      ) : (
        <UsersTable users={filteredUsers} isLoading={isLoadingUsers} error={userError} />
      )}
    </AdminContentPanel>
  );
}
