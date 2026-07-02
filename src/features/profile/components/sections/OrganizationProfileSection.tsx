import type {
  UserOrganizationMembershipDto,
  UserOrganizationProfileDto,
  UserOrganizationRoleDto,
} from '@/features/users/types';

interface OrganizationProfileSectionProps {
  profile: UserOrganizationProfileDto;
}

export default function OrganizationProfileSection({ profile }: OrganizationProfileSectionProps) {
  const items = getOrganizationItems(profile);

  return (
    <section className="sm:col-span-2">
      <div className="border-t border-gray-200 pt-5">
        <h3 className="text-base font-semibold text-gray-900">Thông tin tổ chức</h3>
        {items.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-800">
            {items.map((item) => (
              <li key={item.id}>{item.label}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Chưa có thông tin tổ chức.</p>
        )}
      </div>
    </section>
  );
}

function getOrganizationItems(profile: UserOrganizationProfileDto) {
  return [
    ...profile.currentRoles.map((role) => ({
      id: `current-role-${role.id}`,
      label: formatCurrentRole(role),
    })),
    ...profile.pastRoles.map((role) => ({
      id: `past-role-${role.id}`,
      label: formatPastRole(role),
    })),
    ...profile.divisions.current.map((membership) => ({
      id: `current-division-${membership.id}`,
      label: formatCurrentMembership(membership, 'Mảng'),
    })),
    ...profile.divisions.past.map((membership) => ({
      id: `past-division-${membership.id}`,
      label: formatPastMembership(membership, 'mảng'),
    })),
    ...profile.groups.current.map((membership) => ({
      id: `current-group-${membership.id}`,
      label: formatCurrentMembership(membership, 'Nhóm'),
    })),
    ...profile.groups.past.map((membership) => ({
      id: `past-group-${membership.id}`,
      label: formatPastMembership(membership, 'nhóm'),
    })),
    ...profile.clubs.current.map((membership) => ({
      id: `current-club-${membership.id}`,
      label: formatCurrentMembership(membership, 'CLB/tổ'),
    })),
    ...profile.clubs.past.map((membership) => ({
      id: `past-club-${membership.id}`,
      label: formatPastMembership(membership, 'CLB/tổ'),
    })),
  ];
}

function formatCurrentRole(role: UserOrganizationRoleDto) {
  if (role.scopeType === 'organization') {
    return `${role.roleLabel} đương nhiệm`;
  }

  return `${role.roleLabel} ${getRoleScopePrefix(role)} ${role.scopeName}`;
}

function formatPastRole(role: UserOrganizationRoleDto) {
  const scopeText =
    role.scopeType === 'organization' ? '' : ` ${getRoleScopePrefix(role)} ${role.scopeName}`;

  return `Cựu ${role.roleLabel}${scopeText} (${formatMonthRange(role.startsAt, role.endsAt)})`;
}

function formatCurrentMembership(
  membership: UserOrganizationMembershipDto,
  scopeLabel: 'Mảng' | 'Nhóm' | 'CLB/tổ',
) {
  return `Thành viên ${scopeLabel} ${membership.scopeName}`;
}

function formatPastMembership(
  membership: UserOrganizationMembershipDto,
  scopeLabel: 'mảng' | 'nhóm' | 'CLB/tổ',
) {
  return `Cựu thành viên ${scopeLabel} ${membership.scopeName} (${formatMonthRange(
    membership.startsAt,
    membership.endsAt,
  )})`;
}

function getRoleScopePrefix(role: UserOrganizationRoleDto) {
  if (role.scopeType === 'division') {
    return 'mảng';
  }

  if (role.scopeType === 'group') {
    return 'nhóm';
  }

  return 'CLB/tổ';
}

function formatMonthRange(startsAt: string, endsAt: string | null) {
  const start = formatMonthYear(startsAt);
  const end = endsAt ? formatMonthYear(endsAt) : 'nay';

  return `từ ${start} đến ${end}`;
}

function formatMonthYear(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
