import { importUsers, queryUsers } from '@/api/users';
import Avatar from '@/components/layout/Avatar';
import AdminContentPanel from '@/components/super-admin/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import {
  getFullName,
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/components/super-admin/common/UserUtils';
import { USER_ROLE_LABELS } from '@/constants/userRoles';
import type { AppUser } from '@/contexts/auth';
import {
  downloadUserImportSample,
  parseUserImportFile,
  USER_IMPORT_MAX_FILE_BYTES,
  type ParsedImportUser,
} from '@/utils/userImport';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Search, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

const USERS_SECTION = ADMIN_SECTIONS.find((section) => section.id === 'users') ?? ADMIN_SECTIONS[0];

type UsersView = 'list' | 'import';

interface ImportValidation {
  fileName: string;
  users: ParsedImportUser[];
}

export default function UsersManagement() {
  const [searchParams] = useSearchParams();
  const activeView: UsersView = searchParams.get('view') === 'import' ? 'import' : 'list';
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [userError, setUserError] = useState('');
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');
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
      setImportError('');
      setImportMessage('');
      setValidatedImport(null);
      const parsedUsers = await parseUserImportFile(file);
      setValidatedImport({ fileName: file.name, users: parsedUsers });
      setImportMessage(`File hợp lệ. Sẵn sàng import ${parsedUsers.length} nhân sự.`);
    } catch (error) {
      setImportMessage('');
      setValidatedImport(null);
      setImportError(error instanceof Error ? error.message : 'Không thể đọc file import.');
    }
  }

  async function handleImportValidatedUsers() {
    if (!validatedImport || isImporting) {
      return;
    }

    try {
      setImportError('');
      setImportMessage('');
      setIsImporting(true);
      const importedCount = await importUsers(validatedImport.users);
      setImportMessage(`Đã import ${importedCount} nhân sự từ ${validatedImport.fileName}.`);
      setValidatedImport(null);
      await loadUsers({ showLoading: false });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Không thể import nhân sự.');
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
          importError={importError}
          importMessage={importMessage}
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

interface ImportUsersPanelProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  importError: string;
  importMessage: string;
  validatedImport: ImportValidation | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

function ImportUsersPanel({
  fileInputRef,
  isImporting,
  importError,
  importMessage,
  validatedImport,
  onFileChange,
  onImport,
}: ImportUsersPanelProps) {
  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-950">Sample file</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadUserImportSample('csv')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-sky-300 hover:text-sky-700"
            >
              <Download className="h-4 w-4" />
              Tải CSV
            </button>
            <button
              type="button"
              onClick={() => downloadUserImportSample('xlsx')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-sky-300 hover:text-sky-700"
            >
              <Download className="h-4 w-4" />
              Tải XLSX
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-950">Upload file</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-bold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Chọn file CSV/XLSX
          </button>
          <p className="mt-2 text-xs font-medium text-slate-500">
            File tối đa {formatBytes(USER_IMPORT_MAX_FILE_BYTES)}.
          </p>
        </section>
      </div>

      {importError && (
        <StatusMessage tone="error" icon={<AlertCircle className="h-4 w-4" />}>
          {importError}
        </StatusMessage>
      )}

      {importMessage && (
        <StatusMessage tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
          {importMessage}
        </StatusMessage>
      )}

      {validatedImport && (
        <section className="rounded-lg border border-emerald-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-emerald-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-950">{validatedImport.fileName}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {validatedImport.users.length} nhân sự đã được validate.
              </p>
            </div>
            <button
              type="button"
              onClick={onImport}
              disabled={isImporting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload className={`h-4 w-4 ${isImporting ? 'animate-pulse' : ''}`} />
              {isImporting ? 'Đang import...' : 'Import'}
            </button>
          </div>
          <ImportPreviewTable users={validatedImport.users} />
        </section>
      )}
    </div>
  );
}

interface StatusMessageProps {
  tone: 'error' | 'success';
  icon: React.ReactNode;
  children: string;
}

function StatusMessage({ tone, icon, children }: StatusMessageProps) {
  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

function ImportPreviewTable({ users }: { users: ParsedImportUser[] }) {
  const previewUsers = users.slice(0, 5);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Họ tên
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">SĐT</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Trường
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Năm vào Đội
            </th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Khóa</th>
            <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Giới tính
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {previewUsers.map((user, index) => (
            <tr key={`${user.lastName}-${user.firstName}-${index}`}>
              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                {[user.lastName, user.middleName, user.firstName].filter(Boolean).join(' ')}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-600">{user.email}</td>
              <td className="px-4 py-3 text-sm font-medium text-slate-600">{user.phoneNumber}</td>
              <td className="px-4 py-3 text-sm font-medium text-slate-600">
                {user.schoolName || '-'}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-600">
                {user.enterYear || '-'}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-600">{user.cohort || '-'}</td>
              <td className="px-4 py-3 text-sm font-medium text-slate-600">
                {getGenderLabel(user.gender)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length > previewUsers.length && (
        <p className="border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-500">
          Còn {users.length - previewUsers.length} dòng khác.
        </p>
      )}
    </div>
  );
}

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  error: string;
}

function UsersTable({ users, isLoading, error }: UsersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Nhân sự
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Username
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Email
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">SĐT</th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Trường
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Năm vào Đội
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">Khóa</th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Giới tính
            </th>
            <th className="px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
              Vai trò
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <EmptyTableRow>Đang tải nhân sự...</EmptyTableRow>
          ) : error ? (
            <EmptyTableRow className="text-red-600">{error}</EmptyTableRow>
          ) : users.length > 0 ? (
            users.map((user) => (
              <tr key={user.uid} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatarUrl} size="sm" />
                    <span className="font-semibold text-slate-950 whitespace-nowrap">
                      {getFullName(user)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">@{user.username}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.email}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">{user.phoneNumber}</td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {user.schoolName || '-'}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {user.enterYear || '-'}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {user.cohort || '-'}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {getGenderLabel(user.gender)}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {USER_ROLE_LABELS[user.role]}
                </td>
              </tr>
            ))
          ) : (
            <EmptyTableRow>Chưa có nhân sự.</EmptyTableRow>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface EmptyTableRowProps {
  children: string;
  className?: string;
}

function EmptyTableRow({ children, className = 'text-slate-500' }: EmptyTableRowProps) {
  return (
    <tr>
      <td className={`px-5 py-10 text-center text-sm font-medium ${className}`} colSpan={9}>
        {children}
      </td>
    </tr>
  );
}

function getGenderLabel(gender: AppUser['gender']) {
  if (gender === 0) {
    return 'Nữ';
  }

  if (gender === 1) {
    return 'Nam';
  }

  return 'Khác';
}

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}
