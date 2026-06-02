import {
  downloadUserImportSample,
  USER_IMPORT_MAX_FILE_BYTES,
  type ParsedImportUser,
} from '@/utils/import/userImport';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import type { ChangeEvent, ReactNode, RefObject } from 'react';
import { formatBytes, getGenderLabel } from './userDisplayUtils';

export interface ImportValidation {
  fileName: string;
  users: ParsedImportUser[];
}

interface ImportUsersPanelProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  importError: string;
  importMessage: string;
  validatedImport: ImportValidation | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
}

export default function ImportUsersPanel({
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
  icon: ReactNode;
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
