import { supabaseFetch } from '@/server/supabase';
import type { UserRole } from '@/constants/userRoles';
import type {
  DomainRoleKey,
  EffectScope,
  EventOwnerScopeType,
  EventVisibility,
  NonEventRoleKey,
  PermissionKey,
} from '@/features/organization-structure/permissions';

export type ManageableScopeType = 'division' | 'group' | 'club';

interface MembershipRow {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
  source: 'manual' | 'role_assignment_auto';
  added_by: string | null;
  ended_by: string | null;
  revoked_by: string | null;
}

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  nickname: string | null;
  username: string;
  phone_number: string | null;
  school_name: string | null;
  enter_year: string | null;
  cohort: string | null;
  gender: 0 | 1 | null;
  avatar_url: string | null;
  avatar_key: string | null;
  role: UserRole;
  status: 'active' | 'disabled';
}

export interface RoleAssignmentSummary {
  id: string;
  userId: string;
  roleKey: NonEventRoleKey;
  scopeType: 'organization' | ManageableScopeType | 'club';
  scopeId: string | null;
  startsAt: string;
  endsAt: string | null;
  status: 'active' | 'ended' | 'revoked';
}

export interface LifecycleActorSummary {
  id: string;
  name: string;
  email: string;
}

interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role_key: NonEventRoleKey;
  scope_type: RoleAssignmentSummary['scopeType'];
  scope_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'ended' | 'revoked';
}

interface ClubRow {
  id: string;
  division_id: string;
  name: string;
  description: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DivisionRow {
  id: string;
  name: string;
}

interface GroupRow {
  id: string;
  name: string;
}

interface RoleRow {
  key: DomainRoleKey;
  scope_type: string;
  label: string;
}

interface PermissionRow {
  key: PermissionKey;
  label: string;
  description: string;
}

interface PermissionGrantRow {
  role_key: DomainRoleKey;
  permission_key: PermissionKey;
  effect_scope: EffectScope;
  is_enabled: boolean;
  updated_at: string;
}

interface EventRow {
  id: string;
  name: string;
  owner_scope_type: EventOwnerScopeType;
  owner_scope_id: string | null;
  visibility: EventVisibility;
  show_participants_publicly: boolean;
  starts_at: string;
  ends_at: string | null;
  public_location: string | null;
  public_description: string | null;
  internal_notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberSummary {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  nickname: string;
  username: string;
  phoneNumber: string;
  schoolName: string;
  enterYear: string;
  cohort: string;
  gender: 0 | 1 | null;
  avatarUrl: string;
  avatarKey: string;
  role: UserRole;
  status: 'active' | 'disabled';
  membership: {
    id: string;
    startsAt: string;
    endsAt: string | null;
    status: 'active' | 'ended' | 'revoked';
    source: 'manual' | 'role_assignment_auto';
    addedBy: LifecycleActorSummary | null;
    endedBy: LifecycleActorSummary | null;
    revokedBy: LifecycleActorSummary | null;
  };
  roleAssignments: RoleAssignmentSummary[];
}

export interface PermissionMatrix {
  roles: Array<{ key: DomainRoleKey; scopeType: string; label: string }>;
  permissions: Array<{ key: PermissionKey; label: string; description: string }>;
  grants: Array<{
    roleKey: DomainRoleKey;
    permissionKey: PermissionKey;
    effectScope: EffectScope;
    isEnabled: boolean;
    updatedAt: string;
  }>;
}

export interface ClubSummary {
  id: string;
  divisionId: string;
  divisionName: string;
  name: string;
  description: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  leads: Array<{ userId: string; name: string; email: string }>;
  deputies: Array<{ userId: string; name: string; email: string }>;
}

export interface EventSummary {
  id: string;
  name: string;
  ownerScopeType: EventOwnerScopeType;
  ownerScopeId: string | null;
  ownerScopeName: string;
  visibility: EventVisibility;
  showParticipantsPublicly: boolean;
  startsAt: string;
  endsAt: string | null;
  publicLocation: string;
  publicDescription: string;
  internalNotes: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventWriteInput {
  name: string;
  visibility: EventVisibility;
  showParticipantsPublicly: boolean;
  startsAt: string;
  endsAt: string | null;
  publicLocation: string;
  publicDescription: string;
  internalNotes: string;
}

export type OrganizationRoleKey = 'captain' | 'vice_captain';

export interface OrganizationRoleAssignmentSummary extends RoleAssignmentSummary {
  roleKey: OrganizationRoleKey;
  user: {
    id: string;
    email: string;
    name: string;
    username: string;
    avatarUrl: string;
    appRole: UserRole;
    status: 'active' | 'disabled';
  };
}

export interface OrganizationTechnicalAdminSummary {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  hasCaptainAssignment: boolean;
  hasViceCaptainAssignment: boolean;
}

export class RepositoryConflictError extends Error {
  readonly status = 409;
}

export class RepositoryForbiddenError extends Error {
  readonly status = 403;
}

const USER_SELECT =
  'id,email,first_name,last_name,middle_name,nickname,username,phone_number,school_name,enter_year,cohort,gender,avatar_url,avatar_key,role,status';

export function getMembershipTable(scopeType: ManageableScopeType) {
  if (scopeType === 'division') {
    return 'division_memberships';
  }

  if (scopeType === 'group') {
    return 'group_memberships';
  }

  return 'club_memberships';
}

export function getScopeIdColumn(scopeType: ManageableScopeType) {
  if (scopeType === 'division') {
    return 'division_id';
  }

  if (scopeType === 'group') {
    return 'group_id';
  }

  return 'club_id';
}

export function getLeadRoleKey(scopeType: ManageableScopeType): NonEventRoleKey {
  if (scopeType === 'division') {
    return 'division_lead';
  }

  if (scopeType === 'group') {
    return 'group_lead';
  }

  return 'club_lead';
}

export function getDeputyRoleKey(scopeType: ManageableScopeType): NonEventRoleKey {
  if (scopeType === 'division') {
    return 'division_deputy';
  }

  if (scopeType === 'group') {
    return 'group_deputy';
  }

  return 'club_deputy';
}

export function isManageableScopeType(value: unknown): value is ManageableScopeType {
  return value === 'division' || value === 'group' || value === 'club';
}

export function isOrganizationRoleKey(value: unknown): value is OrganizationRoleKey {
  return value === 'captain' || value === 'vice_captain';
}

export function isEventOwnerScopeType(value: unknown): value is EventOwnerScopeType {
  return value === 'organization' || value === 'division' || value === 'group' || value === 'club';
}

export function isEventVisibility(value: unknown): value is EventVisibility {
  return value === 'organization' || value === 'scope' || value === 'managers';
}

export async function listEvents(): Promise<EventSummary[]> {
  const { response, data } = await supabaseFetch<EventRow[]>(
    '/rest/v1/events?select=id,name,owner_scope_type,owner_scope_id,visibility,show_participants_publicly,starts_at,ends_at,public_location,public_description,internal_notes,created_by,updated_by,created_at,updated_at&order=starts_at.desc',
  );

  if (!response.ok) {
    throw new Error('Không thể tải danh sách sự kiện.');
  }

  return mapEventRows(Array.isArray(data) ? data : []);
}

export async function getEventSummary(eventId: string) {
  const query = new URLSearchParams({
    select:
      'id,name,owner_scope_type,owner_scope_id,visibility,show_participants_publicly,starts_at,ends_at,public_location,public_description,internal_notes,created_by,updated_by,created_at,updated_at',
    id: `eq.${eventId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<EventRow[]>(`/rest/v1/events?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải sự kiện.');
  }

  const event = Array.isArray(data) ? data[0] : null;

  if (!event) {
    return null;
  }

  const events = await mapEventRows([event]);
  return events[0] ?? null;
}

export async function createEvent({
  actorId,
  ownerScopeType,
  ownerScopeId,
  input,
}: {
  actorId: string;
  ownerScopeType: EventOwnerScopeType;
  ownerScopeId: string | null;
  input: EventWriteInput;
}) {
  const { response, data } = await supabaseFetch<EventRow[]>('/rest/v1/events', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      name: input.name,
      owner_scope_type: ownerScopeType,
      owner_scope_id: ownerScopeId,
      visibility: input.visibility,
      show_participants_publicly: input.showParticipantsPublicly,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      public_location: input.publicLocation || null,
      public_description: input.publicDescription || null,
      internal_notes: input.internalNotes || null,
      created_by: actorId,
      updated_by: actorId,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể tạo sự kiện.'));
  }

  const event = Array.isArray(data) ? data[0] : null;

  if (!event) {
    throw new Error('Không thể tạo sự kiện.');
  }

  const events = await mapEventRows([event]);
  return events[0];
}

export async function updateEvent({
  actorId,
  eventId,
  input,
}: {
  actorId: string;
  eventId: string;
  input: EventWriteInput;
}) {
  const updatedAt = new Date().toISOString();
  const query = new URLSearchParams({ id: `eq.${eventId}` });
  const { response, data } = await supabaseFetch<EventRow[]>(
    `/rest/v1/events?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        name: input.name,
        visibility: input.visibility,
        show_participants_publicly: input.showParticipantsPublicly,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        public_location: input.publicLocation || null,
        public_description: input.publicDescription || null,
        internal_notes: input.internalNotes || null,
        updated_by: actorId,
        updated_at: updatedAt,
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể cập nhật sự kiện.'));
  }

  const event = Array.isArray(data) ? data[0] : null;

  if (!event) {
    throw new Error('Không tìm thấy sự kiện.');
  }

  const events = await mapEventRows([event]);
  return events[0];
}

export async function deleteEvent(eventId: string) {
  const query = new URLSearchParams({ id: `eq.${eventId}` });
  const { response, data } = await supabaseFetch(`/rest/v1/events?${query.toString()}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể xóa sự kiện.'));
  }
}

export async function listOrganizationRoleAssignments() {
  const now = new Date().toISOString();
  const query = new URLSearchParams({
    select: 'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    scope_type: 'eq.organization',
    scope_id: 'is.null',
    role_key: 'in.(captain,vice_captain)',
    status: 'eq.active',
    or: `(ends_at.is.null,ends_at.gt.${now})`,
    order: 'starts_at.asc',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải chức vụ Đội.');
  }

  const assignments = (Array.isArray(data) ? data : []).filter(
    (assignment): assignment is RoleAssignmentRow & { role_key: OrganizationRoleKey } =>
      assignment.role_key === 'captain' || assignment.role_key === 'vice_captain',
  );
  const users = await listUsersByIds(assignments.map((assignment) => assignment.user_id));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return assignments
    .map((assignment) => {
      const user = usersById.get(assignment.user_id);

      if (!user) {
        return null;
      }

      return {
        ...mapRoleAssignmentRow(assignment),
        roleKey: assignment.role_key,
        user: mapOrganizationRoleUser(user),
      } satisfies OrganizationRoleAssignmentSummary;
    })
    .filter((assignment): assignment is OrganizationRoleAssignmentSummary => Boolean(assignment));
}

export async function listTechnicalSuperAdmins(
  roleAssignments: OrganizationRoleAssignmentSummary[],
) {
  const query = new URLSearchParams({
    select: USER_SELECT,
    role: 'eq.super_admin',
    order: 'username.asc',
  });
  const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải danh sách super admin.');
  }

  const captainUserIds = new Set(
    roleAssignments
      .filter((assignment) => assignment.roleKey === 'captain')
      .map((assignment) => assignment.userId),
  );
  const viceCaptainUserIds = new Set(
    roleAssignments
      .filter((assignment) => assignment.roleKey === 'vice_captain')
      .map((assignment) => assignment.userId),
  );

  return (Array.isArray(data) ? data : []).map((user) => ({
    ...mapOrganizationRoleUser(user),
    hasCaptainAssignment: captainUserIds.has(user.id),
    hasViceCaptainAssignment: viceCaptainUserIds.has(user.id),
  })) satisfies OrganizationTechnicalAdminSummary[];
}

export async function assignOrganizationRole({
  actorId,
  userId,
  roleKey,
  startsAt = new Date().toISOString(),
  endsAt = null,
}: {
  actorId: string;
  userId: string;
  roleKey: OrganizationRoleKey;
  startsAt?: string;
  endsAt?: string | null;
}) {
  const targetUsers = await listUsersByIds([userId]);
  const targetUser = targetUsers[0] ?? null;

  if (!targetUser) {
    throw new RepositoryConflictError('Không tìm thấy người nhận chức vụ.');
  }

  if (targetUser.status !== 'active') {
    throw new RepositoryForbiddenError('Người nhận chức vụ phải là tài khoản đang hoạt động.');
  }

  const existingAssignments = await listOrganizationRoleAssignments();
  const existingAssignment = existingAssignments.find(
    (assignment) =>
      assignment.userId === userId &&
      assignment.roleKey === roleKey &&
      doTimeRangesOverlap(assignment.startsAt, assignment.endsAt, startsAt, endsAt),
  );

  if (existingAssignment) {
    return;
  }

  if (
    roleKey === 'captain' &&
    existingAssignments.some(
      (assignment) =>
        assignment.roleKey === 'captain' &&
        doTimeRangesOverlap(assignment.startsAt, assignment.endsAt, startsAt, endsAt),
    )
  ) {
    throw new RepositoryConflictError(
      'Đội đã có Đội trưởng trong khoảng thời gian đó. Hãy dùng luồng chuyển giao Đội trưởng.',
    );
  }

  const { response, data } = await supabaseFetch('/rest/v1/role_assignments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      user_id: userId,
      role_key: roleKey,
      scope_type: 'organization',
      scope_id: null,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'active',
      assigned_by: actorId,
    },
  });

  if (!response.ok) {
    throwRoleAssignmentWriteError(data, roleKey);
  }
}

export async function endOrganizationRoleAssignments({
  actorId,
  userId,
  roleKey,
  endedAt = new Date().toISOString(),
}: {
  actorId: string;
  userId: string;
  roleKey: OrganizationRoleKey;
  endedAt?: string;
}) {
  const query = new URLSearchParams({
    scope_type: 'eq.organization',
    scope_id: 'is.null',
    user_id: `eq.${userId}`,
    role_key: `eq.${roleKey}`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch(`/rest/v1/role_assignments?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status: 'ended',
      ends_at: endedAt,
      ended_by: actorId,
      updated_at: endedAt,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể kết thúc chức vụ Đội.'));
  }
}

export async function transferOrganizationCaptain({
  actorId,
  targetUserId,
}: {
  actorId: string;
  targetUserId: string;
}) {
  const targetUsers = await listUsersByIds([targetUserId]);
  const targetUser = targetUsers[0] ?? null;

  if (!targetUser) {
    throw new RepositoryConflictError('Không tìm thấy người nhận chuyển giao.');
  }

  if (targetUser.status !== 'active') {
    throw new RepositoryForbiddenError('Người nhận chuyển giao phải là tài khoản đang hoạt động.');
  }

  const { response, data } = await supabaseFetch('/rest/v1/rpc/transfer_organization_captain', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      p_actor_id: actorId,
      p_target_user_id: targetUserId,
    },
  });

  if (!response.ok) {
    throwTransferLeadError(data);
  }
}

export async function listClubs(): Promise<ClubSummary[]> {
  const { response, data } = await supabaseFetch<ClubRow[]>(
    '/rest/v1/clubs?select=id,division_id,name,description,archived_at,created_at,updated_at&order=name.asc',
  );

  if (!response.ok) {
    throw new Error('Không thể tải danh sách CLB/tổ.');
  }

  const clubs = Array.isArray(data) ? data : [];

  if (clubs.length === 0) {
    return [];
  }

  const [divisions, memberCounts, roleSummaries] = await Promise.all([
    listDivisionsByIds(clubs.map((club) => club.division_id)),
    countClubMembers(clubs.map((club) => club.id)),
    listClubRoleSummaries(clubs.map((club) => club.id)),
  ]);
  const divisionsById = new Map(divisions.map((division) => [division.id, division]));

  return clubs.map((club) => mapClubRow(club, divisionsById, memberCounts, roleSummaries));
}

export async function getClub(clubId: string): Promise<ClubSummary | null> {
  const query = new URLSearchParams({
    select: 'id,division_id,name,description,archived_at,created_at,updated_at',
    id: `eq.${clubId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    return null;
  }

  const [divisions, memberCounts, roleSummaries] = await Promise.all([
    listDivisionsByIds([club.division_id]),
    countClubMembers([club.id]),
    listClubRoleSummaries([club.id]),
  ]);

  return mapClubRow(
    club,
    new Map(divisions.map((division) => [division.id, division])),
    memberCounts,
    roleSummaries,
  );
}

export async function createClub({
  actorId,
  divisionId,
  name,
  description,
}: {
  actorId: string;
  divisionId: string;
  name: string;
  description: string;
}) {
  const { response, data } = await supabaseFetch<ClubRow[]>('/rest/v1/clubs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      division_id: divisionId,
      name,
      description: description || null,
      created_by: actorId,
      updated_by: actorId,
    },
  });

  if (!response.ok) {
    throwRestWriteError(data, 'Không thể tạo CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    throw new Error('Không thể tạo CLB/tổ.');
  }

  return getCreatedOrUpdatedClub(club.id);
}

export async function updateClub({
  actorId,
  clubId,
  divisionId,
  name,
  description,
}: {
  actorId: string;
  clubId: string;
  divisionId: string;
  name: string;
  description: string;
}) {
  const query = new URLSearchParams({ id: `eq.${clubId}` });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: {
      division_id: divisionId,
      name,
      description: description || null,
      updated_by: actorId,
      updated_at: new Date().toISOString(),
    },
  });

  if (!response.ok) {
    throwRestWriteError(data, 'Không thể cập nhật CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    throw new Error('Không tìm thấy CLB/tổ.');
  }

  return getCreatedOrUpdatedClub(club.id);
}

export async function archiveClub({ actorId, clubId }: { actorId: string; clubId: string }) {
  const archivedAt = new Date().toISOString();
  const query = new URLSearchParams({ id: `eq.${clubId}` });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: {
      archived_at: archivedAt,
      archived_by: actorId,
      updated_by: actorId,
      updated_at: archivedAt,
    },
  });

  if (!response.ok) {
    throwRestWriteError(data, 'Không thể lưu trữ CLB/tổ.');
  }

  const club = Array.isArray(data) ? data[0] : null;

  if (!club) {
    throw new Error('Không tìm thấy CLB/tổ.');
  }

  return getCreatedOrUpdatedClub(club.id);
}

export async function listScopeMembers(scopeType: ManageableScopeType, scopeId: string) {
  const table = getMembershipTable(scopeType);
  const scopeIdColumn = getScopeIdColumn(scopeType);
  const membershipQuery = new URLSearchParams({
    select: 'id,user_id,starts_at,ends_at,status,source,added_by,ended_by,revoked_by',
    [scopeIdColumn]: `eq.${scopeId}`,
    order: 'starts_at.desc',
  });
  const { response: membershipResponse, data: membershipData } = await supabaseFetch<
    MembershipRow[]
  >(`/rest/v1/${table}?${membershipQuery.toString()}`);

  if (!membershipResponse.ok) {
    throw new Error('Không thể tải memberships.');
  }

  const memberships = Array.isArray(membershipData) ? membershipData : [];
  const userIds = memberships.map((membership) => membership.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const lifecycleActorIds = memberships.flatMap((membership) =>
    [membership.added_by, membership.ended_by, membership.revoked_by].filter(
      (userId): userId is string => Boolean(userId),
    ),
  );
  const [users, lifecycleActors, roleAssignments] = await Promise.all([
    listUsersByIds(userIds),
    listUsersByIds(lifecycleActorIds),
    listScopeRoleAssignments(scopeType, scopeId, userIds),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const lifecycleActorsById = new Map(
    lifecycleActors.map((user) => [user.id, mapLifecycleActorRow(user)]),
  );
  const rolesByUserId = new Map<string, RoleAssignmentSummary[]>();

  for (const assignment of roleAssignments) {
    const userRoles = rolesByUserId.get(assignment.userId) ?? [];
    userRoles.push(assignment);
    rolesByUserId.set(assignment.userId, userRoles);
  }

  return memberships
    .map((membership) => {
      const user = usersById.get(membership.user_id);

      if (!user) {
        return null;
      }

      return {
        ...mapUserRow(user),
        membership: {
          id: membership.id,
          startsAt: membership.starts_at,
          endsAt: membership.ends_at,
          status: membership.status,
          source: membership.source,
          addedBy: membership.added_by
            ? (lifecycleActorsById.get(membership.added_by) ?? null)
            : null,
          endedBy: membership.ended_by
            ? (lifecycleActorsById.get(membership.ended_by) ?? null)
            : null,
          revokedBy: membership.revoked_by
            ? (lifecycleActorsById.get(membership.revoked_by) ?? null)
            : null,
        },
        roleAssignments: rolesByUserId.get(user.id) ?? [],
      } satisfies OrganizationMemberSummary;
    })
    .filter((member): member is OrganizationMemberSummary => Boolean(member))
    .sort((first, second) => getUserSortName(first).localeCompare(getUserSortName(second)));
}

export async function addScopeMembers({
  actorId,
  scopeType,
  scopeId,
  userIds,
  startsAt = new Date().toISOString(),
  source = 'manual',
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  startsAt?: string;
  source?: 'manual' | 'role_assignment_auto';
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const users = await listUsersByIds(uniqueUserIds);
  const disabledUser = users.find((user) => user.status !== 'active');

  if (disabledUser) {
    throw new Error(`Không thể thêm user đã bị vô hiệu hóa: ${disabledUser.email}.`);
  }

  const startTime = new Date(startsAt).getTime();
  const existingIds = new Set(
    (await listScopeMembers(scopeType, scopeId))
      .filter(
        (member) =>
          member.membership.status === 'active' &&
          (!member.membership.endsAt || new Date(member.membership.endsAt).getTime() > startTime),
      )
      .map((member) => member.uid),
  );
  const rows = uniqueUserIds
    .filter((userId) => !existingIds.has(userId))
    .map((userId) => ({
      [getScopeIdColumn(scopeType)]: scopeId,
      user_id: userId,
      starts_at: startsAt,
      status: 'active',
      source,
      added_by: actorId,
    }));

  if (rows.length === 0) {
    return;
  }

  const { response, data } = await supabaseFetch(`/rest/v1/${getMembershipTable(scopeType)}`, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: rows,
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thêm thành viên.'));
  }
}

export async function endScopeMembers({
  actorId,
  scopeType,
  scopeId,
  userIds,
  endedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  endedAt?: string;
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const query = new URLSearchParams({
    [getScopeIdColumn(scopeType)]: `eq.${scopeId}`,
    user_id: `in.(${uniqueUserIds.join(',')})`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch(
    `/rest/v1/${getMembershipTable(scopeType)}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        status: 'ended',
        ends_at: endedAt,
        ended_by: actorId,
        updated_at: endedAt,
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể kết thúc membership.'));
  }

  await endScopeRoleAssignments({
    actorId,
    scopeType,
    scopeId,
    userIds: uniqueUserIds,
    roleKeys: [getLeadRoleKey(scopeType), getDeputyRoleKey(scopeType)],
    endedAt,
  });
}

export async function revokeScopeMembers({
  actorId,
  scopeType,
  scopeId,
  userIds,
  revokedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  revokedAt?: string;
}) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return;
  }

  const query = new URLSearchParams({
    [getScopeIdColumn(scopeType)]: `eq.${scopeId}`,
    user_id: `in.(${uniqueUserIds.join(',')})`,
    status: 'eq.active',
    starts_at: `lte.${revokedAt}`,
  });
  const { response, data } = await supabaseFetch<MembershipRow[]>(
    `/rest/v1/${getMembershipTable(scopeType)}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        status: 'revoked',
        ends_at: revokedAt,
        revoked_by: actorId,
        updated_at: revokedAt,
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thu hồi membership.'));
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Không tìm thấy membership đang hiệu lực để thu hồi.');
  }

  await revokeScopeRoleAssignments({
    actorId,
    scopeType,
    scopeId,
    userIds: uniqueUserIds,
    roleKeys: [getLeadRoleKey(scopeType), getDeputyRoleKey(scopeType)],
    revokedAt,
  });
}

export async function assignScopeRole({
  actorId,
  scopeType,
  scopeId,
  userId,
  roleKey,
  startsAt = new Date().toISOString(),
  endsAt = null,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userId: string;
  roleKey: NonEventRoleKey;
  startsAt?: string;
  endsAt?: string | null;
}) {
  const activeAssignments = await listScopeRoleAssignments(scopeType, scopeId, [userId]);
  const existingAssignment = activeAssignments.find(
    (assignment) =>
      assignment.roleKey === roleKey &&
      doTimeRangesOverlap(assignment.startsAt, assignment.endsAt, startsAt, endsAt),
  );

  if (existingAssignment) {
    return;
  }

  if (roleKey === getLeadRoleKey(scopeType)) {
    const hasConflictingLead = await hasConflictingLeadAssignment({
      scopeType,
      scopeId,
      roleKey,
      startsAt,
      endsAt,
    });

    if (hasConflictingLead) {
      throw new RepositoryConflictError(
        'Scope này đã có cấp trưởng trong khoảng thời gian đó. Hãy dùng luồng chuyển giao trưởng.',
      );
    }
  }

  await addScopeMembers({
    actorId,
    scopeType,
    scopeId,
    userIds: [userId],
    startsAt,
    source: 'role_assignment_auto',
  });

  const { response, data } = await supabaseFetch('/rest/v1/role_assignments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      user_id: userId,
      role_key: roleKey,
      scope_type: scopeType,
      scope_id: scopeId,
      starts_at: startsAt,
      ends_at: endsAt,
      status: 'active',
      assigned_by: actorId,
    },
  });

  if (!response.ok) {
    throwRoleAssignmentWriteError(data, roleKey);
  }
}

export async function endScopeRoleAssignments({
  actorId,
  scopeType,
  scopeId,
  userIds,
  roleKeys,
  endedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  roleKeys: NonEventRoleKey[];
  endedAt?: string;
}) {
  const query = new URLSearchParams({
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    role_key: `in.(${roleKeys.join(',')})`,
    status: 'eq.active',
  });

  if (userIds.length > 0) {
    query.set('user_id', `in.(${Array.from(new Set(userIds)).join(',')})`);
  }

  const { response, data } = await supabaseFetch(`/rest/v1/role_assignments?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status: 'ended',
      ends_at: endedAt,
      ended_by: actorId,
      updated_at: endedAt,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể gỡ vai trò.'));
  }
}

export async function transferScopeLead({
  actorId,
  scopeType,
  scopeId,
  targetUserId,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  targetUserId: string;
}) {
  const targetUsers = await listUsersByIds([targetUserId]);
  const targetUser = targetUsers[0] ?? null;

  if (!targetUser) {
    throw new RepositoryConflictError('Không tìm thấy người nhận chuyển giao.');
  }

  if (targetUser.status !== 'active') {
    throw new RepositoryForbiddenError('Người nhận chuyển giao phải là tài khoản đang hoạt động.');
  }

  const { response, data } = await supabaseFetch('/rest/v1/rpc/transfer_scope_lead', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      p_actor_id: actorId,
      p_scope_type: scopeType,
      p_scope_id: scopeId,
      p_target_user_id: targetUserId,
    },
  });

  if (!response.ok) {
    throwTransferLeadError(data);
  }
}

export async function revokeScopeRoleAssignments({
  actorId,
  scopeType,
  scopeId,
  userIds,
  roleKeys,
  revokedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  userIds: string[];
  roleKeys: NonEventRoleKey[];
  revokedAt?: string;
}) {
  const query = new URLSearchParams({
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    role_key: `in.(${roleKeys.join(',')})`,
    status: 'eq.active',
    starts_at: `lte.${revokedAt}`,
  });

  if (userIds.length > 0) {
    query.set('user_id', `in.(${Array.from(new Set(userIds)).join(',')})`);
  }

  const { response, data } = await supabaseFetch(`/rest/v1/role_assignments?${query.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      status: 'revoked',
      ends_at: revokedAt,
      revoked_by: actorId,
      updated_at: revokedAt,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể thu hồi vai trò.'));
  }
}

export async function listPermissionMatrix(): Promise<PermissionMatrix> {
  const [rolesResult, permissionsResult, grantsResult] = await Promise.all([
    supabaseFetch<RoleRow[]>('/rest/v1/roles?select=key,scope_type,label&order=scope_type.asc'),
    supabaseFetch<PermissionRow[]>(
      '/rest/v1/permissions?select=key,label,description&order=key.asc',
    ),
    supabaseFetch<PermissionGrantRow[]>(
      '/rest/v1/role_permission_grants?select=role_key,permission_key,effect_scope,is_enabled,updated_at&order=role_key.asc',
    ),
  ]);

  if (!rolesResult.response.ok || !permissionsResult.response.ok || !grantsResult.response.ok) {
    throw new Error('Không thể tải permission matrix.');
  }

  return {
    roles: (Array.isArray(rolesResult.data) ? rolesResult.data : []).map((role) => ({
      key: role.key,
      scopeType: role.scope_type,
      label: role.label,
    })),
    permissions: (Array.isArray(permissionsResult.data) ? permissionsResult.data : []).map(
      (permission) => ({
        key: permission.key,
        label: permission.label,
        description: permission.description,
      }),
    ),
    grants: (Array.isArray(grantsResult.data) ? grantsResult.data : []).map((grant) => ({
      roleKey: grant.role_key,
      permissionKey: grant.permission_key,
      effectScope: grant.effect_scope,
      isEnabled: grant.is_enabled,
      updatedAt: grant.updated_at,
    })),
  };
}

export async function updatePermissionGrant({
  actorId,
  roleKey,
  permissionKey,
  effectScope,
  isEnabled,
}: {
  actorId: string;
  roleKey: DomainRoleKey;
  permissionKey: PermissionKey;
  effectScope: EffectScope;
  isEnabled: boolean;
}) {
  const query = new URLSearchParams({
    role_key: `eq.${roleKey}`,
    permission_key: `eq.${permissionKey}`,
    effect_scope: `eq.${effectScope}`,
  });
  const { response, data } = await supabaseFetch(
    `/rest/v1/role_permission_grants?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        is_enabled: isEnabled,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể cập nhật permission grant.'));
  }
}

async function listUsersByIds(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: USER_SELECT,
    id: `in.(${uniqueUserIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<UserRow[]>(`/rest/v1/user?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải thông tin người dùng.');
  }

  return Array.isArray(data) ? data : [];
}

async function listDivisionsByIds(divisionIds: string[]) {
  const uniqueDivisionIds = Array.from(new Set(divisionIds));

  if (uniqueDivisionIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,name',
    id: `in.(${uniqueDivisionIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<DivisionRow[]>(
    `/rest/v1/divisions?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải mảng của CLB/tổ.');
  }

  return Array.isArray(data) ? data : [];
}

async function listGroupsByIds(groupIds: string[]) {
  const uniqueGroupIds = Array.from(new Set(groupIds));

  if (uniqueGroupIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,name',
    id: `in.(${uniqueGroupIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<GroupRow[]>(`/rest/v1/groups?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải nhóm.');
  }

  return Array.isArray(data) ? data : [];
}

async function listClubRowsByIds(clubIds: string[]) {
  const uniqueClubIds = Array.from(new Set(clubIds));

  if (uniqueClubIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,division_id,name,description,archived_at,created_at,updated_at',
    id: `in.(${uniqueClubIds.join(',')})`,
  });
  const { response, data } = await supabaseFetch<ClubRow[]>(`/rest/v1/clubs?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải CLB/tổ.');
  }

  return Array.isArray(data) ? data : [];
}

async function countClubMembers(clubIds: string[]) {
  const uniqueClubIds = Array.from(new Set(clubIds));
  const counts = new Map<string, number>();

  if (uniqueClubIds.length === 0) {
    return counts;
  }

  const query = new URLSearchParams({
    select: 'club_id',
    club_id: `in.(${uniqueClubIds.join(',')})`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<Array<{ club_id: string }>>(
    `/rest/v1/club_memberships?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải số thành viên CLB/tổ.');
  }

  for (const row of Array.isArray(data) ? data : []) {
    counts.set(row.club_id, (counts.get(row.club_id) ?? 0) + 1);
  }

  return counts;
}

async function mapEventRows(rows: EventRow[]) {
  const divisionIds = rows
    .filter((row) => row.owner_scope_type === 'division' && row.owner_scope_id)
    .map((row) => String(row.owner_scope_id));
  const groupIds = rows
    .filter((row) => row.owner_scope_type === 'group' && row.owner_scope_id)
    .map((row) => String(row.owner_scope_id));
  const clubIds = rows
    .filter((row) => row.owner_scope_type === 'club' && row.owner_scope_id)
    .map((row) => String(row.owner_scope_id));
  const [divisions, groups, clubs] = await Promise.all([
    listDivisionsByIds(divisionIds),
    listGroupsByIds(groupIds),
    listClubRowsByIds(clubIds),
  ]);
  const divisionsById = new Map(divisions.map((division) => [division.id, division.name]));
  const groupsById = new Map(groups.map((group) => [group.id, group.name]));
  const clubsById = new Map(clubs.map((club) => [club.id, club.name]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ownerScopeType: row.owner_scope_type,
    ownerScopeId: row.owner_scope_id,
    ownerScopeName: getEventOwnerScopeName(row, divisionsById, groupsById, clubsById),
    visibility: row.visibility,
    showParticipantsPublicly: row.show_participants_publicly,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    publicLocation: row.public_location ?? '',
    publicDescription: row.public_description ?? '',
    internalNotes: row.internal_notes ?? '',
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) satisfies EventSummary[];
}

function getEventOwnerScopeName(
  row: EventRow,
  divisionsById: Map<string, string>,
  groupsById: Map<string, string>,
  clubsById: Map<string, string>,
) {
  if (row.owner_scope_type === 'organization') {
    return 'Toàn Đội';
  }

  if (!row.owner_scope_id) {
    return 'Không rõ scope';
  }

  if (row.owner_scope_type === 'division') {
    return divisionsById.get(row.owner_scope_id) ?? row.owner_scope_id;
  }

  if (row.owner_scope_type === 'group') {
    return groupsById.get(row.owner_scope_id) ?? row.owner_scope_id;
  }

  return clubsById.get(row.owner_scope_id) ?? row.owner_scope_id;
}

async function listClubRoleSummaries(clubIds: string[]) {
  const uniqueClubIds = Array.from(new Set(clubIds));
  const summaries = new Map<
    string,
    {
      leads: Array<{ userId: string; name: string; email: string }>;
      deputies: Array<{ userId: string; name: string; email: string }>;
    }
  >();

  if (uniqueClubIds.length === 0) {
    return summaries;
  }

  const query = new URLSearchParams({
    select: 'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    scope_type: 'eq.club',
    scope_id: `in.(${uniqueClubIds.join(',')})`,
    role_key: 'in.(club_lead,club_deputy)',
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải chức vụ CLB/tổ.');
  }

  const assignments = Array.isArray(data) ? data : [];
  const users = await listUsersByIds(assignments.map((assignment) => assignment.user_id));
  const usersById = new Map(users.map((user) => [user.id, user]));

  for (const assignment of assignments) {
    if (!assignment.scope_id) {
      continue;
    }

    const user = usersById.get(assignment.user_id);

    if (!user) {
      continue;
    }

    const summary = summaries.get(assignment.scope_id) ?? { leads: [], deputies: [] };
    const userSummary = {
      userId: user.id,
      name: getUserSortName(mapUserRow(user)),
      email: user.email,
    };

    if (assignment.role_key === 'club_lead') {
      summary.leads.push(userSummary);
    } else if (assignment.role_key === 'club_deputy') {
      summary.deputies.push(userSummary);
    }

    summaries.set(assignment.scope_id, summary);
  }

  return summaries;
}

async function getCreatedOrUpdatedClub(clubId: string) {
  const club = await getClub(clubId);

  if (!club) {
    throw new Error('Không tìm thấy CLB/tổ.');
  }

  return club;
}

function mapClubRow(
  row: ClubRow,
  divisionsById: Map<string, DivisionRow>,
  memberCounts: Map<string, number>,
  roleSummaries: Map<
    string,
    {
      leads: Array<{ userId: string; name: string; email: string }>;
      deputies: Array<{ userId: string; name: string; email: string }>;
    }
  >,
): ClubSummary {
  const roleSummary = roleSummaries.get(row.id) ?? { leads: [], deputies: [] };

  return {
    id: row.id,
    divisionId: row.division_id,
    divisionName: divisionsById.get(row.division_id)?.name ?? 'Không rõ mảng',
    name: row.name,
    description: row.description ?? '',
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: memberCounts.get(row.id) ?? 0,
    leads: roleSummary.leads,
    deputies: roleSummary.deputies,
  };
}

async function listScopeRoleAssignments(
  scopeType: ManageableScopeType,
  scopeId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return [];
  }

  const query = new URLSearchParams({
    select: 'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    user_id: `in.(${Array.from(new Set(userIds)).join(',')})`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể tải role assignments.');
  }

  return (Array.isArray(data) ? data : []).map(mapRoleAssignmentRow);
}

async function hasConflictingLeadAssignment({
  scopeType,
  scopeId,
  roleKey,
  startsAt,
  endsAt,
}: {
  scopeType: ManageableScopeType;
  scopeId: string;
  roleKey: NonEventRoleKey;
  startsAt: string;
  endsAt: string | null;
}) {
  const query = new URLSearchParams({
    select: 'id,user_id,role_key,scope_type,scope_id,starts_at,ends_at,status',
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    role_key: `eq.${roleKey}`,
    status: 'eq.active',
  });
  const { response, data } = await supabaseFetch<RoleAssignmentRow[]>(
    `/rest/v1/role_assignments?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Không thể kiểm tra cấp trưởng hiện tại.');
  }

  return (Array.isArray(data) ? data : []).some((assignment) =>
    doTimeRangesOverlap(assignment.starts_at, assignment.ends_at, startsAt, endsAt),
  );
}

function mapRoleAssignmentRow(row: RoleAssignmentRow): RoleAssignmentSummary {
  return {
    id: row.id,
    userId: row.user_id,
    roleKey: row.role_key,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  };
}

function mapLifecycleActorRow(row: UserRow): LifecycleActorSummary {
  return {
    id: row.id,
    name: getUserSortName(mapUserRow(row)) || row.email,
    email: row.email,
  };
}

function mapOrganizationRoleUser(row: UserRow): OrganizationRoleAssignmentSummary['user'] {
  const user = mapUserRow(row);

  return {
    id: user.uid,
    email: user.email,
    name: getUserSortName(user) || user.email,
    username: user.username,
    avatarUrl: user.avatarUrl,
    appRole: user.role,
    status: user.status,
  };
}

function mapUserRow(row: UserRow) {
  return {
    uid: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name ?? '',
    nickname: row.nickname ?? '',
    username: row.username,
    phoneNumber: row.phone_number ?? '-',
    schoolName: row.school_name ?? '',
    enterYear: row.enter_year ?? '',
    cohort: row.cohort ?? '',
    gender: row.gender ?? null,
    avatarUrl: row.avatar_url ?? '',
    avatarKey: row.avatar_key ?? '',
    role: row.role,
    status: row.status,
  };
}

function getUserSortName(
  user: Pick<OrganizationMemberSummary, 'lastName' | 'middleName' | 'firstName'>,
) {
  return `${user.lastName} ${user.middleName} ${user.firstName}`.trim();
}

function getRestErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }

  return fallback;
}

function doTimeRangesOverlap(
  firstStartsAt: string,
  firstEndsAt: string | null,
  secondStartsAt: string,
  secondEndsAt: string | null,
) {
  const firstStartTime = new Date(firstStartsAt).getTime();
  const firstEndTime = firstEndsAt ? new Date(firstEndsAt).getTime() : Number.POSITIVE_INFINITY;
  const secondStartTime = new Date(secondStartsAt).getTime();
  const secondEndTime = secondEndsAt ? new Date(secondEndsAt).getTime() : Number.POSITIVE_INFINITY;

  return firstStartTime < secondEndTime && secondStartTime < firstEndTime;
}

function throwRoleAssignmentWriteError(data: unknown, roleKey: NonEventRoleKey): never {
  const errorCode =
    data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
      ? data.code
      : '';
  const isLeadRole =
    roleKey === 'division_lead' || roleKey === 'group_lead' || roleKey === 'club_lead';

  if (isLeadRole && (errorCode === '23P01' || errorCode === '23505')) {
    throw new RepositoryConflictError(
      'Scope này đã có cấp trưởng trong khoảng thời gian đó. Hãy dùng luồng chuyển giao trưởng.',
    );
  }

  throw new Error(getRestErrorMessage(data, 'Không thể bổ nhiệm vai trò.'));
}

function throwTransferLeadError(data: unknown): never {
  const errorCode =
    data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
      ? data.code
      : '';

  if (errorCode === '42501') {
    throw new RepositoryForbiddenError(
      getRestErrorMessage(data, 'Không có quyền chuyển giao trưởng.'),
    );
  }

  if (errorCode === '23505' || errorCode === '23P01' || errorCode === 'P0002') {
    throw new RepositoryConflictError(
      getRestErrorMessage(data, 'Không thể chuyển giao trưởng do trạng thái scope không hợp lệ.'),
    );
  }

  throw new Error(getRestErrorMessage(data, 'Không thể chuyển giao trưởng.'));
}

function throwRestWriteError(data: unknown, fallback: string): never {
  if (data && typeof data === 'object' && 'code' in data && data.code === '23505') {
    throw new RepositoryConflictError('Tên CLB/tổ đã tồn tại trong mảng này.');
  }

  throw new Error(getRestErrorMessage(data, fallback));
}
