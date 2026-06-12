import {
  listClubMembers,
  removeUsersFromClub,
  type Club,
} from '@/services/clubs';
import type { Division } from '@/services/divisions';
import { Archive, Pencil, Plus, Search, UserPlus, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddClubUsersModal from './AddClubUsersModal';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import ArchiveClubModal from './ArchiveClubModal';
import ClubFormModal from './ClubFormModal';
import ClubsTable from './ClubsTable';
import ConfirmRemoveUsersModal from '@/features/super-admin/components/common/ConfirmRemoveUsersModal';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  getSearchableUserValues,
  normalizeSearchValue,
} from '@/features/super-admin/lib/userUtils';
import {
  assignScopeRole,
  removeScopeRole,
  type OrganizationMember,
} from '@/services/organizationAdmin';
import ScopeMembersTable from '@/features/super-admin/components/common/ScopeMembersTable';
import type { NonEventRoleKey } from '@/features/organization-structure/permissions';
import { toast } from 'sonner';

interface ClubsManagementProps {
  activeClub: Club | null;
  clubs: Club[];
  divisions: Division[];
  isLoadingClubs: boolean;
  clubError: string;
  onClubCreated: (club: Club) => void;
  onClubUpdated: (club: Club) => void;
}

export default function ClubsManagement({
  activeClub,
  clubs,
  divisions,
  isLoadingClubs,
  clubError,
  onClubCreated,
  onClubUpdated,
}: ClubsManagementProps) {
  const [users, setUsers] = useState<OrganizationMember[]>([]);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [clubToEdit, setClubToEdit] = useState<Club | null>(null);
  const [clubToArchive, setClubToArchive] = useState<Club | null>(null);
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isRemoveUsersModalOpen, setIsRemoveUsersModalOpen] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);

  const filteredClubs = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    return clubs.filter((club) => {
      if (!includeArchived && club.archivedAt) {
        return false;
      }

      if (divisionFilter && club.divisionId !== divisionFilter) {
        return false;
      }

      if (!queryText) {
        return true;
      }

      return [club.name, club.description, club.divisionName].some((value) =>
        normalizeSearchValue(value).includes(queryText),
      );
    });
  }, [clubs, divisionFilter, includeArchived, search]);

  const filteredUsers = useMemo(() => {
    const queryText = normalizeSearchValue(search);

    if (!queryText) {
      return users;
    }

    return users.filter((user) =>
      getSearchableUserValues(user).some((value) =>
        normalizeSearchValue(value).includes(queryText),
      ),
    );
  }, [search, users]);
  const existingUserIds = useMemo(() => users.map((user) => user.uid), [users]);
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const loadClubUsers = useCallback(
    async (clubId: string, isMounted: () => boolean = () => true) => {
      setIsLoadingUsers(true);
      setUserError('');
      setSelectedUserIds([]);
      setIsAddUsersModalOpen(false);
      setIsRemoveUsersModalOpen(false);

      try {
        const nextUsers = await listClubMembers(clubId);

        if (isMounted()) {
          setUsers(nextUsers);
        }
      } catch (error) {
        if (isMounted()) {
          const message = error instanceof Error ? error.message : '';
          setUserError(
            message
              ? `Không thể tải danh sách thành viên của CLB/tổ: ${message}`
              : 'Không thể tải danh sách thành viên của CLB/tổ.',
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
    if (!activeClub) {
      return;
    }

    const clubId = activeClub.id;
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      void loadClubUsers(clubId, () => isMounted);
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeClub, loadClubUsers]);

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((currentId) => currentId !== userId)
        : [...currentIds, userId],
    );
  }

  function toggleVisibleUsersSelection() {
    const visibleUserIds = filteredUsers.map((user) => user.uid);
    const areAllVisibleUsersSelected =
      visibleUserIds.length > 0 && visibleUserIds.every((userId) => selectedUserIdSet.has(userId));

    setSelectedUserIds((currentIds) => {
      if (areAllVisibleUsersSelected) {
        return currentIds.filter((userId) => !visibleUserIds.includes(userId));
      }

      return Array.from(new Set([...currentIds, ...visibleUserIds]));
    });
  }

  async function handleRemoveSelectedUsers() {
    if (!activeClub || selectedUserIds.length === 0) {
      return;
    }

    setIsRemovingUsers(true);

    try {
      await removeUsersFromClub(activeClub.id, selectedUserIds);
      setUsers((currentUsers) =>
        currentUsers.filter((user) => !selectedUserIds.includes(user.uid)),
      );
      setSelectedUserIds([]);
      setIsRemoveUsersModalOpen(false);
      toast.success(`Đã xóa ${selectedUserIds.length} thành viên khỏi CLB/tổ.`, {
        id: 'club-remove-users-success',
      });
      void loadClubUsers(activeClub.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message
          ? `Không thể xóa thành viên khỏi CLB/tổ: ${message}`
          : 'Không thể xóa thành viên khỏi CLB/tổ.',
        { id: 'club-remove-users-error' },
      );
    } finally {
      setIsRemovingUsers(false);
    }
  }

  async function handleAssignRole(userId: string, roleKey: NonEventRoleKey) {
    if (!activeClub) {
      return;
    }

    try {
      await assignScopeRole('club', activeClub.id, userId, roleKey);
      toast.success('Đã cập nhật chức vụ trong CLB/tổ.', { id: 'club-role-success' });
      void loadClubUsers(activeClub.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message ? `Không thể cập nhật chức vụ: ${message}` : 'Không thể cập nhật chức vụ.',
        { id: 'club-role-error' },
      );
    }
  }

  async function handleRemoveRole(userId: string, roleKey: NonEventRoleKey) {
    if (!activeClub) {
      return;
    }

    try {
      await removeScopeRole('club', activeClub.id, userId, roleKey);
      toast.success('Đã gỡ chức vụ trong CLB/tổ.', { id: 'club-role-remove-success' });
      void loadClubUsers(activeClub.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message ? `Không thể gỡ chức vụ: ${message}` : 'Không thể gỡ chức vụ.', {
        id: 'club-role-remove-error',
      });
    }
  }

  const isViewingClubList = !activeClub;
  const visibleCount = isViewingClubList
    ? `${filteredClubs.length} CLB/tổ`
    : `${filteredUsers.length} thành viên`;

  return (
    <AdminContentPanel
      section={ADMIN_SECTIONS[2]}
      className={activeClub ? 'flex flex-col' : undefined}
      title={activeClub?.name ?? 'Quản lý CLB/tổ'}
      count={visibleCount}
      actions={
        isViewingClubList ? (
          <ClubListActions
            search={search}
            divisionFilter={divisionFilter}
            divisions={divisions}
            includeArchived={includeArchived}
            onSearchChange={setSearch}
            onDivisionFilterChange={setDivisionFilter}
            onIncludeArchivedChange={setIncludeArchived}
            onCreate={() => setIsCreateModalOpen(true)}
          />
        ) : (
          <ClubDetailActions
            search={search}
            selectedUserCount={selectedUserIds.length}
            isArchived={Boolean(activeClub.archivedAt)}
            onSearchChange={setSearch}
            onEdit={() => setClubToEdit(activeClub)}
            onArchive={() => setClubToArchive(activeClub)}
            onOpenAddUsersModal={() => setIsAddUsersModalOpen(true)}
            onOpenRemoveUsersModal={() => setIsRemoveUsersModalOpen(true)}
          />
        )
      }
    >
      {isViewingClubList ? (
        <ClubsTable
          clubs={filteredClubs}
          isLoading={isLoadingClubs}
          error={clubError}
          onEditClub={setClubToEdit}
          onArchiveClub={setClubToArchive}
        />
      ) : (
        <>
          <ClubDetailSummary club={activeClub} />
          <ScopeMembersTable
            scopeType="club"
            users={filteredUsers}
            isLoading={isLoadingUsers}
            error={userError}
            accent="cyan"
            selectedUserIdSet={selectedUserIdSet}
            onToggleUser={toggleUserSelection}
            onToggleVisibleUsers={toggleVisibleUsersSelection}
            onAssignRole={handleAssignRole}
            onRemoveRole={handleRemoveRole}
          />
        </>
      )}

      {isCreateModalOpen && (
        <ClubFormModal
          divisions={divisions}
          initialDivisionId={divisionFilter}
          onClose={() => setIsCreateModalOpen(false)}
          onSaved={(club) => {
            onClubCreated(club);
            setIsCreateModalOpen(false);
          }}
        />
      )}
      {clubToEdit && (
        <ClubFormModal
          club={clubToEdit}
          divisions={divisions}
          onClose={() => setClubToEdit(null)}
          onSaved={(club) => {
            onClubUpdated(club);
            setClubToEdit(null);
          }}
        />
      )}
      {clubToArchive && (
        <ArchiveClubModal
          club={clubToArchive}
          onClose={() => setClubToArchive(null)}
          onArchived={(club) => {
            onClubUpdated(club);
            setClubToArchive(null);
          }}
        />
      )}
      {activeClub && isAddUsersModalOpen && (
        <AddClubUsersModal
          clubId={activeClub.id}
          clubName={activeClub.name}
          existingUserIds={existingUserIds}
          onClose={() => setIsAddUsersModalOpen(false)}
          onAdded={() => loadClubUsers(activeClub.id)}
        />
      )}
      {activeClub && isRemoveUsersModalOpen && (
        <ConfirmRemoveUsersModal
          contextName={activeClub.name}
          contextType="club"
          selectedCount={selectedUserIds.length}
          isRemoving={isRemovingUsers}
          onCancel={() => setIsRemoveUsersModalOpen(false)}
          onConfirm={handleRemoveSelectedUsers}
        />
      )}
    </AdminContentPanel>
  );
}

interface ClubListActionsProps {
  search: string;
  divisionFilter: string;
  divisions: Division[];
  includeArchived: boolean;
  onSearchChange: (value: string) => void;
  onDivisionFilterChange: (value: string) => void;
  onIncludeArchivedChange: (value: boolean) => void;
  onCreate: () => void;
}

function ClubListActions({
  search,
  divisionFilter,
  divisions,
  includeArchived,
  onSearchChange,
  onDivisionFilterChange,
  onIncludeArchivedChange,
  onCreate,
}: ClubListActionsProps) {
  return (
    <>
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm CLB/tổ"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 sm:w-56"
        />
      </label>
      <select
        value={divisionFilter}
        onChange={(event) => onDivisionFilterChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-cyan-500"
      >
        <option value="">Tất cả mảng</option>
        {divisions.map((division) => (
          <option key={division.id} value={division.id}>
            {division.name}
          </option>
        ))}
      </select>
      <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => onIncludeArchivedChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        Đã lưu trữ
      </label>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
      >
        <Plus className="h-4 w-4" />
        Tạo CLB/tổ
      </button>
    </>
  );
}

interface ClubDetailActionsProps {
  search: string;
  selectedUserCount: number;
  isArchived: boolean;
  onSearchChange: (value: string) => void;
  onEdit: () => void;
  onArchive: () => void;
  onOpenAddUsersModal: () => void;
  onOpenRemoveUsersModal: () => void;
}

function ClubDetailActions({
  search,
  selectedUserCount,
  isArchived,
  onSearchChange,
  onEdit,
  onArchive,
  onOpenAddUsersModal,
  onOpenRemoveUsersModal,
}: ClubDetailActionsProps) {
  return (
    <>
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm thành viên"
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-500 sm:w-56"
        />
      </label>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Pencil className="h-4 w-4" />
        Sửa
      </button>
      <button
        type="button"
        onClick={onArchive}
        disabled={isArchived}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Archive className="h-4 w-4" />
        Lưu trữ
      </button>
      <button
        type="button"
        onClick={onOpenAddUsersModal}
        disabled={isArchived}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <UserPlus className="h-4 w-4" />
        Thêm
      </button>
      <button
        type="button"
        onClick={onOpenRemoveUsersModal}
        disabled={selectedUserCount === 0 || isArchived}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
      >
        <UsersRound className="h-4 w-4" />
        Xóa {selectedUserCount > 0 ? selectedUserCount : ''}
      </button>
    </>
  );
}

function ClubDetailSummary({ club }: { club: Club }) {
  return (
    <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 md:grid-cols-4">
      <SummaryItem label="Mảng" value={club.divisionName} />
      <SummaryItem label="Thành viên" value={String(club.memberCount)} />
      <SummaryItem
        label="Chủ nhiệm"
        value={club.leads.length > 0 ? club.leads.map((lead) => lead.name).join(', ') : '-'}
      />
      <SummaryItem
        label="Phó chủ nhiệm"
        value={
          club.deputies.length > 0 ? club.deputies.map((deputy) => deputy.name).join(', ') : '-'
        }
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
