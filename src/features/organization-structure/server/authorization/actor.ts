import { getBearerToken } from '@/server/api';
import { getSupabaseUid, supabaseFetch } from '@/server/supabase';
import {
  ActorUserRow,
  AuthorizationError,
  OrganizationActor,
} from '@/features/organization-structure/server/authorization/types';
import { listEffectiveRoleAssignments } from '@/features/organization-structure/server/authorization/data';

export async function requireOrganizationActor(request: Request): Promise<OrganizationActor> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    throw new AuthorizationError('Missing Supabase access token.', 401);
  }

  const uid = await getSupabaseUid(accessToken);

  if (!uid) {
    throw new AuthorizationError('Invalid Supabase access token.', 401);
  }

  return getOrganizationActor(uid);
}

export async function getOrganizationActor(userId: string): Promise<OrganizationActor> {
  const userQuery = new URLSearchParams({
    select: 'id,role,status',
    id: `eq.${userId}`,
    limit: '1',
  });
  const { response: userResponse, data: userData } = await supabaseFetch<ActorUserRow[]>(
    `/rest/v1/user?${userQuery.toString()}`,
  );

  if (!userResponse.ok) {
    throw new Error('Không thể tải thông tin người dùng.');
  }

  const user = Array.isArray(userData) ? userData[0] : null;

  if (!user) {
    throw new AuthorizationError('Không tìm thấy người dùng.', 401);
  }

  if (user.status !== 'active') {
    throw new AuthorizationError('Tài khoản đã bị vô hiệu hóa.', 403);
  }

  const roleAssignments = await listEffectiveRoleAssignments(user.id);

  return {
    id: user.id,
    appRole: user.role,
    status: user.status,
    roleAssignments,
  };
}

export function isSuperAdmin(actor: OrganizationActor) {
  return actor.appRole === 'super_admin';
}

export function isOrganizationManager(actor: OrganizationActor) {
  if (isSuperAdmin(actor)) {
    return true;
  }

  return actor.roleAssignments.some(
    (assignment) =>
      assignment.scope_type === 'organization' &&
      (assignment.role_key === 'captain' || assignment.role_key === 'vice_captain'),
  );
}
