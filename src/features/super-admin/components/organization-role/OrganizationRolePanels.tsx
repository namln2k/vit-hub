import type { UserSearchResultDto } from '@/features/users/types';
import {
  formatVietnamDateTime,
  getAssignmentStatusLabel,
  getDisplayName,
  getRoleLifecycleState,
  ROLE_LABELS,
} from '@/features/super-admin/components/organization-role/organizationRoleUtils';
import type {
  OrganizationRoleAssignmentDetail,
  OrganizationTechnicalAdmin,
} from '@/services/organizationAdmin';
import Avatar from '@/shared/layout/Avatar';
import { ShieldX } from 'lucide-react';

export function RoleAssignmentGroup({
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
        <span className="inline-flex w-max items-center whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500">
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
                <div>Trạng thái DB: {getAssignmentStatusLabel(assignment.status)}</div>
                <div>Domain role: {ROLE_LABELS[assignment.roleKey]}</div>
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

export function TechnicalAdminsTable({ admins }: { admins: OrganizationTechnicalAdmin[] }) {
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
                <span className="inline-flex w-max items-center whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                  super_admin
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {admin.hasCaptainAssignment && <DomainRoleChip label="Đội trưởng" />}
                  {admin.hasViceCaptainAssignment && <DomainRoleChip label="Đội phó" />}
                  {!admin.hasCaptainAssignment && !admin.hasViceCaptainAssignment && (
                    <span className="inline-flex w-max items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
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

export function UserSummary({
  user,
}: {
  user: OrganizationRoleAssignmentDetail['user'] | OrganizationTechnicalAdmin | UserSearchResultDto;
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

function RoleStateBadge({ assignment }: { assignment: OrganizationRoleAssignmentDetail }) {
  const state = getRoleLifecycleState(assignment);
  const className =
    state === 'upcoming'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span
      className={`inline-flex w-max items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${className}`}
    >
      {state === 'upcoming' ? 'Sắp hiệu lực' : 'Đang hiệu lực'}
    </span>
  );
}

function DomainRoleChip({ label }: { label: string }) {
  return (
    <span className="inline-flex w-max items-center whitespace-nowrap rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
      {label}
    </span>
  );
}

function HeaderCell({ children }: { children: string }) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase text-slate-500">
      {children}
    </th>
  );
}
