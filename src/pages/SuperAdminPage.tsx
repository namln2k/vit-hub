import { listDivisions, type Division } from '@/api/divisions';
import { listGroups, type Group } from '@/api/groups';
import Header from '@/components/layout/Header';
import { ADMIN_SECTIONS } from '@/components/super-admin/common/AdminSections';
import PlaceholderManagement from '@/components/super-admin/common/PlaceholderManagement';
import type { AdminSectionId } from '@/components/super-admin/common/types';
import DivisionsManagement from '@/components/super-admin/division/DivisionsManagement';
import GroupsManagement from '@/components/super-admin/group/GroupsManagement';
import SuperAdminSidebar from '@/components/super-admin/common/SuperAdminSidebar';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function SuperAdminPage() {
  const [activeSectionId, setActiveSectionId] = useState<AdminSectionId>('divisions');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [activeDivisionId, setActiveDivisionId] = useState('');
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(true);
  const [divisionError, setDivisionError] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupError, setGroupError] = useState('');

  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === activeSectionId) ?? ADMIN_SECTIONS[0],
    [activeSectionId],
  );
  const activeDivision = useMemo(
    () => divisions.find((division) => division.id === activeDivisionId) ?? null,
    [activeDivisionId, divisions],
  );
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, groups],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDivisions() {
      setIsLoadingDivisions(true);
      setDivisionError('');

      try {
        const nextDivisions = await listDivisions();

        if (!isMounted) {
          return;
        }

        setDivisions(nextDivisions);
        setActiveDivisionId((current) => current || nextDivisions[0]?.id || '');
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : '';
          setDivisionError(
            message ? `Không thể tải danh sách mảng: ${message}` : 'Không thể tải danh sách mảng.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDivisions(false);
        }
      }
    }

    void loadDivisions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadGroups() {
      setIsLoadingGroups(true);
      setGroupError('');

      try {
        const nextGroups = await listGroups();

        if (!isMounted) {
          return;
        }

        setGroups(nextGroups);
        setActiveGroupId((current) => current || nextGroups[0]?.id || '');
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : '';
          setGroupError(
            message ? `Không thể tải danh sách nhóm: ${message}` : 'Không thể tải danh sách nhóm.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingGroups(false);
        }
      }
    }

    void loadGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleGroupCreated(group: Group) {
    setGroups((currentGroups) =>
      [...currentGroups, group].sort((first, second) => first.name.localeCompare(second.name)),
    );
    setActiveGroupId(group.id);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
              Super Admin
            </div>
            <h1 className="text-2xl font-bold text-slate-950">Bảng quản trị</h1>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <SuperAdminSidebar
            sections={ADMIN_SECTIONS}
            activeSectionId={activeSectionId}
            onSectionChange={setActiveSectionId}
            divisions={divisions}
            activeDivisionId={activeDivisionId}
            onDivisionChange={setActiveDivisionId}
            isLoadingDivisions={isLoadingDivisions}
            divisionError={divisionError}
            groups={groups}
            activeGroupId={activeGroupId}
            onGroupChange={setActiveGroupId}
            isLoadingGroups={isLoadingGroups}
            groupError={groupError}
          />

          {activeSectionId === 'divisions' ? (
            <DivisionsManagement activeDivision={activeDivision} />
          ) : activeSectionId === 'groups' ? (
            <GroupsManagement activeGroup={activeGroup} onGroupCreated={handleGroupCreated} />
          ) : (
            <PlaceholderManagement section={activeSection} />
          )}
        </div>
      </main>
    </div>
  );
}
