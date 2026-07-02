import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  EndViceCaptainModal,
  AssignViceCaptainModal,
  TransferCaptainModal,
} from '@/features/super-admin/components/organization-role/OrganizationRoleModals';
import {
  RoleAssignmentGroup,
  TechnicalAdminsTable,
} from '@/features/super-admin/components/organization-role/OrganizationRolePanels';
import {
  getCaptainActionLabel,
  getCaptainActionMode,
  getRoleLifecycleState,
} from '@/features/super-admin/components/organization-role/organizationRoleUtils';
import {
  assignOrganizationRole,
  endOrganizationRole,
  formatOrganizationRoleApiError,
  formatTransferLeadApiError,
  listOrganizationRoles,
  transferOrganizationCaptain,
  type OrganizationRoleAssignmentDetail,
  type OrganizationTechnicalAdmin,
} from '@/services/organizationAdmin';
import { ArrowRightLeft, ShieldPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const SECTION =
  ADMIN_SECTIONS.find((section) => section.id === 'organization-roles') ?? ADMIN_SECTIONS[0];

export default function OrganizationRolesManagement() {
  const [assignments, setAssignments] = useState<OrganizationRoleAssignmentDetail[]>([]);
  const [technicalAdmins, setTechnicalAdmins] = useState<OrganizationTechnicalAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAssignViceModalOpen, setIsAssignViceModalOpen] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState<OrganizationRoleAssignmentDetail | null>(
    null,
  );
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
          setError(
            message ? `Không thể tải chức vụ Đội: ${message}` : 'Không thể tải chức vụ Đội.',
          );
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
  const captainActionMode = getCaptainActionMode(currentCaptain);
  const captainActionLabel = getCaptainActionLabel(captainActionMode);

  async function handleAssignInitialCaptain(userId: string) {
    try {
      await assignOrganizationRole(userId, 'captain');
      toast.success('Đã bổ nhiệm Đội trưởng.', { id: 'organization-assign-captain-success' });
      await loadOrganizationRoles({ showLoading: false });
    } catch (assignError) {
      const message = formatOrganizationRoleApiError(assignError, 'Không thể bổ nhiệm Đội trưởng.');
      toast.error(`Không thể bổ nhiệm Đội trưởng: ${message}`, {
        id: 'organization-assign-captain-error',
      });
      throw new Error(message);
    }
  }

  async function handleAssignViceCaptain(userId: string, startsAt: string, endsAt: string | null) {
    try {
      await assignOrganizationRole(userId, 'vice_captain', startsAt, endsAt);
      toast.success('Đã bổ nhiệm Đội phó.', { id: 'organization-assign-vice-success' });
      await loadOrganizationRoles({ showLoading: false });
    } catch (assignError) {
      const message = formatOrganizationRoleApiError(assignError, 'Không thể bổ nhiệm Đội phó.');
      toast.error(`Không thể bổ nhiệm Đội phó: ${message}`, {
        id: 'organization-assign-vice-error',
      });
      throw new Error(message);
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
      const message = formatOrganizationRoleApiError(
        endError,
        'Không thể kết thúc nhiệm kỳ Đội phó.',
      );
      toast.error(`Không thể kết thúc nhiệm kỳ Đội phó: ${message}`, {
        id: 'organization-end-vice-error',
      });
      throw new Error(message);
    }
  }

  async function handleTransferCaptain(targetUserId: string) {
    try {
      await transferOrganizationCaptain(targetUserId);
      toast.success('Đã chuyển giao Đội trưởng.', { id: 'organization-transfer-captain-success' });
      await loadOrganizationRoles({ showLoading: false });
    } catch (transferError) {
      const message = formatTransferLeadApiError(
        transferError,
        'Không thể chuyển giao Đội trưởng.',
      );
      toast.error(`Không thể chuyển giao Đội trưởng: ${message}`, {
        id: 'organization-transfer-captain-error',
      });
      throw new Error(message);
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
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-200 bg-white px-4 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          >
            {captainActionMode === 'transfer' ? (
              <ArrowRightLeft className="h-4 w-4" />
            ) : (
              <ShieldPlus className="h-4 w-4" />
            )}
            {captainActionLabel}
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
      {isTransferCaptainModalOpen && (
        <TransferCaptainModal
          currentCaptain={currentCaptain}
          onClose={() => setIsTransferCaptainModalOpen(false)}
          onTransfer={
            captainActionMode === 'transfer' ? handleTransferCaptain : handleAssignInitialCaptain
          }
        />
      )}
    </AdminContentPanel>
  );
}
