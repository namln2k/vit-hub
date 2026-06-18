'use client';

import PlaceholderManagement from '@/features/super-admin/components/common/PlaceholderManagement';
import ClubsManagement from '@/features/super-admin/components/club/ClubsManagement';
import DivisionsManagement from '@/features/super-admin/components/division/DivisionsManagement';
import EventsManagement from '@/features/super-admin/components/event/EventsManagement';
import GroupsManagement from '@/features/super-admin/components/group/GroupsManagement';
import OrganizationRolesManagement from '@/features/super-admin/components/organization-role/OrganizationRolesManagement';
import PermissionsManagement from '@/features/super-admin/components/permission/PermissionsManagement';
import PostsManagement from '@/features/super-admin/components/post/PostsManagement';
import UsersManagement from '@/features/super-admin/components/user/UsersManagement';
import { useSuperAdminLayout } from '@/features/super-admin/contexts/SuperAdminLayoutContext';
import type { UserSummaryDto } from '@/features/users/types';
import type { PostAdministrationDataDto } from '@/features/posts/types';

export default function SuperAdminPage({
  initialUsers = [],
  initialPostData,
}: {
  initialUsers?: UserSummaryDto[];
  initialPostData?: PostAdministrationDataDto;
}) {
  const {
    activeSection,
    activeSectionId,
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
    handleClubCreated,
    handleClubUpdated,
  } = useSuperAdminLayout();

  if (activeSectionId === 'divisions') {
    return (
      <DivisionsManagement
        activeDivision={activeDivision}
        divisions={divisions}
        isLoadingDivisions={isLoadingDivisions}
        divisionError={divisionError}
      />
    );
  }

  if (activeSectionId === 'groups') {
    return (
      <GroupsManagement
        activeGroup={activeGroup}
        groups={groups}
        isLoadingGroups={isLoadingGroups}
        groupError={groupError}
        onGroupCreated={handleGroupCreated}
        onGroupUpdated={handleGroupUpdated}
      />
    );
  }

  if (activeSectionId === 'users') {
    return <UsersManagement initialUsers={initialUsers} />;
  }

  if (activeSectionId === 'posts') {
    return initialPostData ? (
      <PostsManagement initialData={initialPostData} />
    ) : (
      <PlaceholderManagement section={activeSection} />
    );
  }

  if (activeSectionId === 'permissions') {
    return <PermissionsManagement />;
  }

  if (activeSectionId === 'clubs') {
    return (
      <ClubsManagement
        activeClub={activeClub}
        clubs={clubs}
        divisions={divisions}
        isLoadingClubs={isLoadingClubs}
        clubError={clubError}
        onClubCreated={handleClubCreated}
        onClubUpdated={handleClubUpdated}
      />
    );
  }

  if (activeSectionId === 'events') {
    return <EventsManagement divisions={divisions} groups={groups} clubs={clubs} />;
  }

  if (activeSectionId === 'organization-roles') {
    return <OrganizationRolesManagement />;
  }

  return <PlaceholderManagement section={activeSection} />;
}
