'use client';

import PlaceholderManagement from '@/features/super-admin/components/common/PlaceholderManagement';
import DivisionsManagement from '@/features/super-admin/components/division/DivisionsManagement';
import GroupsManagement from '@/features/super-admin/components/group/GroupsManagement';
import PermissionsManagement from '@/features/super-admin/components/permission/PermissionsManagement';
import PostsManagement from '@/features/super-admin/components/post/PostsManagement';
import UsersManagement from '@/features/super-admin/components/user/UsersManagement';
import { useSuperAdminLayout } from '@/features/super-admin/contexts/SuperAdminLayoutContext';

export default function SuperAdminPage() {
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
    handleGroupCreated,
    handleGroupUpdated,
    handleGroupDeleted,
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
        onGroupDeleted={handleGroupDeleted}
      />
    );
  }

  if (activeSectionId === 'users') {
    return <UsersManagement />;
  }

  if (activeSectionId === 'posts') {
    return <PostsManagement />;
  }

  if (activeSectionId === 'permissions') {
    return <PermissionsManagement />;
  }

  return <PlaceholderManagement section={activeSection} />;
}
