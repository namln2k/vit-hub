import { listDivisions, type Division } from '@/api/divisions';
import { listGroups, type Group } from '@/api/groups';
import Header from '@/components/shared/layout/Header';
import { ADMIN_SECTIONS } from '@/components/pages/super-admin/common/AdminSections';
import PlaceholderManagement from '@/components/pages/super-admin/common/PlaceholderManagement';
import {
  findAdminItemBySlug,
  getAdminItemPath,
  getAdminSectionPath,
} from '@/components/pages/super-admin/common/adminRoutes';
import type { AdminSectionId } from '@/components/pages/super-admin/common/types';
import DivisionsManagement from '@/components/pages/super-admin/division/DivisionsManagement';
import GroupsManagement from '@/components/pages/super-admin/group/GroupsManagement';
import PostsManagement from '@/components/pages/super-admin/post/PostsManagement';
import UsersManagement from '@/components/pages/super-admin/user/UsersManagement';
import SuperAdminSidebar from '@/components/pages/super-admin/common/SuperAdminSidebar';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const routeParams = useParams();
  const routeSegments = (routeParams['*'] ?? '').split('/').filter(Boolean);
  const sectionIdFromUrl = routeSegments[0] as AdminSectionId | undefined;
  const activeSectionId: AdminSectionId =
    sectionIdFromUrl && ADMIN_SECTIONS.some((section) => section.id === sectionIdFromUrl)
      ? sectionIdFromUrl
      : 'divisions';
  const activeItemSlug = routeSegments[1];
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(true);
  const [divisionError, setDivisionError] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupError, setGroupError] = useState('');

  const activeSection = useMemo(
    () => ADMIN_SECTIONS.find((section) => section.id === activeSectionId) ?? ADMIN_SECTIONS[0],
    [activeSectionId],
  );
  const activeDivision = useMemo(
    () => (activeSectionId === 'divisions' ? findAdminItemBySlug(divisions, activeItemSlug) : null),
    [activeItemSlug, activeSectionId, divisions],
  );
  const activeGroup = useMemo(
    () => (activeSectionId === 'groups' ? findAdminItemBySlug(groups, activeItemSlug) : null),
    [activeItemSlug, activeSectionId, groups],
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
    navigate(getAdminItemPath('groups', group));
  }

  function handleGroupUpdated(group: Group) {
    setGroups((currentGroups) =>
      currentGroups
        .map((currentGroup) => (currentGroup.id === group.id ? group : currentGroup))
        .sort((first, second) => first.name.localeCompare(second.name)),
    );
    navigate(getAdminItemPath('groups', group), { replace: true });
  }

  function handleGroupDeleted(groupId: string) {
    setGroups((currentGroups) =>
      currentGroups.filter((currentGroup) => currentGroup.id !== groupId),
    );
    navigate(getAdminSectionPath('groups'), { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
            divisions={divisions}
            activeDivisionId={activeDivision?.id ?? ''}
            isLoadingDivisions={isLoadingDivisions}
            divisionError={divisionError}
            groups={groups}
            activeGroupId={activeGroup?.id ?? ''}
            isLoadingGroups={isLoadingGroups}
            groupError={groupError}
          />

          {activeSectionId === 'divisions' ? (
            <DivisionsManagement
              activeDivision={activeDivision}
              divisions={divisions}
              isLoadingDivisions={isLoadingDivisions}
              divisionError={divisionError}
            />
          ) : activeSectionId === 'groups' ? (
            <GroupsManagement
              activeGroup={activeGroup}
              groups={groups}
              isLoadingGroups={isLoadingGroups}
              groupError={groupError}
              onGroupCreated={handleGroupCreated}
              onGroupUpdated={handleGroupUpdated}
              onGroupDeleted={handleGroupDeleted}
            />
          ) : activeSectionId === 'users' ? (
            <UsersManagement />
          ) : activeSectionId === 'posts' ? (
            <PostsManagement />
          ) : (
            <PlaceholderManagement section={activeSection} />
          )}
        </div>
      </main>
    </div>
  );
}
