'use client';

import PlaceholderManagement from '@/features/super-admin/components/common/PlaceholderManagement';
import ClubsManagement from '@/features/super-admin/components/club/ClubsManagement';
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
    clubs,
    isLoadingClubs,
    clubError,
    activeClub,
    handleGroupCreated,
    handleGroupUpdated,
    handleGroupDeleted,
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
    return (
      <PlaceholderManagement
        section={activeSection}
        description="Màn quản lý sự kiện đã có điểm vào ổn định. Event owner, phân quyền sự kiện, và danh sách tham gia sẽ được triển khai ở các lát tiếp theo."
        statusItems={[
          'Route /super-admin/events đã sẵn sàng.',
          'Chưa có thao tác tạo hoặc chỉnh sửa sự kiện trong màn này.',
        ]}
      />
    );
  }

  if (activeSectionId === 'organization-roles') {
    return (
      <PlaceholderManagement
        section={activeSection}
        description="Màn chức vụ Đội đã có điểm vào ổn định. Chức vụ Đội trưởng, Đội phó, trưởng/phó mảng, nhóm, và CLB/tổ sẽ dùng mô hình scoped role assignments."
        statusItems={[
          'Route /super-admin/organization-roles đã sẵn sàng.',
          'Role assignment cấp mảng và nhóm hiện vẫn nằm trong từng màn quản lý tương ứng.',
        ]}
      />
    );
  }

  return <PlaceholderManagement section={activeSection} />;
}
