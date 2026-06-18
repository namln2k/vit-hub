'use client';

import { listDivisions, type Division } from '@/services/divisions';
import { listGroups, type Group } from '@/services/groups';
import { listClubs, type Club } from '@/services/clubs';
import {
  findAdminItemBySlug,
  getAdminItemPath,
  getAdminSectionPath,
} from '@/features/super-admin/lib/adminRoutes';
import type { AdminSectionId } from '@/features/super-admin/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseSuperAdminNavigationDataParams {
  activeSectionId: AdminSectionId;
  activeItemSlug: string | undefined;
}

export function useSuperAdminNavigationData({
  activeSectionId,
  activeItemSlug,
}: UseSuperAdminNavigationDataParams) {
  const router = useRouter();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(true);
  const [divisionError, setDivisionError] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupError, setGroupError] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [clubError, setClubError] = useState('');

  const activeDivision = useMemo(
    () => (activeSectionId === 'divisions' ? findAdminItemBySlug(divisions, activeItemSlug) : null),
    [activeItemSlug, activeSectionId, divisions],
  );
  const activeGroup = useMemo(
    () => (activeSectionId === 'groups' ? findAdminItemBySlug(groups, activeItemSlug) : null),
    [activeItemSlug, activeSectionId, groups],
  );
  const activeClub = useMemo(
    () => (activeSectionId === 'clubs' ? findAdminItemBySlug(clubs, activeItemSlug) : null),
    [activeItemSlug, activeSectionId, clubs],
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

    async function loadClubs() {
      setIsLoadingClubs(true);
      setClubError('');

      try {
        const nextClubs = await listClubs();

        if (!isMounted) {
          return;
        }

        setClubs(nextClubs);
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : '';
          setClubError(
            message
              ? `Không thể tải danh sách CLB/tổ: ${message}`
              : 'Không thể tải danh sách CLB/tổ.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingClubs(false);
        }
      }
    }

    void loadClubs();

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

  const handleGroupCreated = useCallback(
    (group: Group) => {
      setGroups((currentGroups) => sortGroupsByName([...currentGroups, group]));
      router.push(getAdminItemPath('groups', group));
    },
    [router],
  );

  const handleGroupUpdated = useCallback(
    (group: Group) => {
      setGroups((currentGroups) =>
        sortGroupsByName(
          currentGroups.map((currentGroup) =>
            currentGroup.id === group.id ? group : currentGroup,
          ),
        ),
      );
      router.replace(getAdminItemPath('groups', group));
    },
    [router],
  );

  const handleGroupDeleted = useCallback(
    (groupId: string) => {
      setGroups((currentGroups) =>
        currentGroups.filter((currentGroup) => currentGroup.id !== groupId),
      );
      router.replace(getAdminSectionPath('groups'));
    },
    [router],
  );

  const handleClubCreated = useCallback(
    (club: Club) => {
      setClubs((currentClubs) => sortClubsByName([...currentClubs, club]));
      router.push(getAdminItemPath('clubs', club));
    },
    [router],
  );

  const handleClubUpdated = useCallback(
    (club: Club) => {
      setClubs((currentClubs) =>
        sortClubsByName(
          currentClubs.map((currentClub) => (currentClub.id === club.id ? club : currentClub)),
        ),
      );
      router.replace(getAdminItemPath('clubs', club));
    },
    [router],
  );

  return {
    divisions,
    isLoadingDivisions,
    divisionError,
    groups,
    isLoadingGroups,
    groupError,
    activeDivision,
    activeGroup,
    clubs,
    isLoadingClubs,
    clubError,
    activeClub,
    handleGroupCreated,
    handleGroupUpdated,
    handleGroupDeleted,
    handleClubCreated,
    handleClubUpdated,
  };
}

function sortGroupsByName(groups: Group[]) {
  return groups.sort((first, second) => first.name.localeCompare(second.name));
}

function sortClubsByName(clubs: Club[]) {
  return clubs.sort((first, second) => first.name.localeCompare(second.name));
}
