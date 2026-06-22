import { supabaseFetch } from '@/server/supabase';
import {
  ManageableScopeType,
  RepositoryConflictError,
} from '@/features/organization-structure/server/adminRepository/types';
import {
  getMembershipTable,
  getScopeIdColumn,
} from '@/features/organization-structure/server/adminRepository/metadata';
import { getClub } from '@/features/organization-structure/server/adminRepository/clubs';
import { throwRestWriteError } from '@/features/organization-structure/server/adminRepository/errors';

export async function archiveClub({ actorId, clubId }: { actorId: string; clubId: string }) {
  await archiveScope({ actorId, scopeType: 'club', scopeId: clubId });
  const club = await getClub(clubId);

  if (!club) {
    throw new Error('Không tìm thấy CLB/tổ.');
  }

  return club;
}

export async function archiveScope({
  actorId,
  scopeType,
  scopeId,
  archivedAt = new Date().toISOString(),
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  archivedAt?: string;
}) {
  await assertCanArchiveScope(scopeType, scopeId);

  const scopeTable = getScopeTable(scopeType);
  const query = new URLSearchParams({ id: `eq.${scopeId}` });
  await endScopeRowsAt({ actorId, scopeType, scopeId, archivedAt });

  const { response: archiveResponse, data: archiveData } = await supabaseFetch(
    `/rest/v1/${scopeTable}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        archived_at: archivedAt,
        archived_by: actorId,
        updated_at: archivedAt,
      },
    },
  );

  if (!archiveResponse.ok) {
    throwRestWriteError(archiveData, 'Không thể lưu trữ scope.');
  }
}

async function endScopeRowsAt({
  actorId,
  scopeType,
  scopeId,
  archivedAt,
}: {
  actorId: string;
  scopeType: ManageableScopeType;
  scopeId: string;
  archivedAt: string;
}) {
  const membershipQuery = new URLSearchParams({
    [getScopeIdColumn(scopeType)]: `eq.${scopeId}`,
    status: 'eq.active',
    starts_at: `lt.${archivedAt}`,
  });
  const { response: membershipResponse, data: membershipData } = await supabaseFetch(
    `/rest/v1/${getMembershipTable(scopeType)}?${membershipQuery.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        status: 'ended',
        ends_at: archivedAt,
        ended_by: actorId,
        updated_at: archivedAt,
      },
    },
  );

  if (!membershipResponse.ok) {
    throwRestWriteError(membershipData, 'Không thể kết thúc memberships khi lưu trữ scope.');
  }

  const roleQuery = new URLSearchParams({
    scope_type: `eq.${scopeType}`,
    scope_id: `eq.${scopeId}`,
    status: 'eq.active',
    starts_at: `lt.${archivedAt}`,
  });
  const { response: roleResponse, data: roleData } = await supabaseFetch(
    `/rest/v1/role_assignments?${roleQuery.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: {
        status: 'ended',
        ends_at: archivedAt,
        ended_by: actorId,
        updated_at: archivedAt,
      },
    },
  );

  if (!roleResponse.ok) {
    throwRestWriteError(roleData, 'Không thể kết thúc role assignments khi lưu trữ scope.');
  }
}

async function assertCanArchiveScope(scopeType: ManageableScopeType, scopeId: string) {
  const eventQuery = new URLSearchParams({
    select: 'id',
    owner_scope_type: `eq.${scopeType}`,
    owner_scope_id: `eq.${scopeId}`,
    limit: '1',
  });
  const { response: eventResponse, data: eventData } = await supabaseFetch<Array<{ id: string }>>(
    `/rest/v1/events?${eventQuery.toString()}`,
  );

  if (!eventResponse.ok) {
    throw new Error('Không thể kiểm tra event liên kết.');
  }

  if (Array.isArray(eventData) && eventData.length > 0) {
    throw new RepositoryConflictError(
      'Không thể lưu trữ scope vì vẫn còn event dùng scope này làm owner. Hãy xóa hoặc chuyển kế hoạch bằng event mới trước.',
    );
  }

  if (scopeType !== 'division') {
    return;
  }

  const clubQuery = new URLSearchParams({
    select: 'id',
    division_id: `eq.${scopeId}`,
    archived_at: 'is.null',
    limit: '1',
  });
  const { response: clubResponse, data: clubData } = await supabaseFetch<Array<{ id: string }>>(
    `/rest/v1/clubs?${clubQuery.toString()}`,
  );

  if (!clubResponse.ok) {
    throw new Error('Không thể kiểm tra CLB/tổ con.');
  }

  if (Array.isArray(clubData) && clubData.length > 0) {
    throw new RepositoryConflictError(
      'Không thể lưu trữ mảng vì vẫn còn CLB/tổ đang hoạt động bên dưới. Hãy lưu trữ CLB/tổ con trước.',
    );
  }
}

function getScopeTable(scopeType: ManageableScopeType) {
  if (scopeType === 'division') {
    return 'divisions';
  }

  if (scopeType === 'group') {
    return 'groups';
  }

  return 'clubs';
}
