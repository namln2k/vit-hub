import type { EventRoleKey, NonEventRoleKey } from '@/features/organization-structure/permissions';
import {
  RepositoryConflictError,
  RepositoryForbiddenError,
} from '@/features/organization-structure/server/adminRepository/types';

export function getRestErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }

  return fallback;
}

export function doTimeRangesOverlap(
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

export function throwRoleAssignmentWriteError(data: unknown, roleKey: NonEventRoleKey): never {
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

export function throwEventRoleWriteError(data: unknown, roleKey: EventRoleKey): never {
  const errorCode =
    data && typeof data === 'object' && 'code' in data && typeof data.code === 'string'
      ? data.code
      : '';

  if (roleKey === 'event_lead' && errorCode === '23505') {
    throw new RepositoryConflictError(
      'Event đã có event lead. Hãy dùng luồng chuyển giao event lead.',
    );
  }

  throw new Error(getRestErrorMessage(data, 'Không thể bổ nhiệm event role.'));
}

export function throwTransferLeadError(data: unknown): never {
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

export function throwRestWriteError(data: unknown, fallback: string): never {
  if (data && typeof data === 'object' && 'code' in data && data.code === '23505') {
    throw new RepositoryConflictError('Tên CLB/tổ đã tồn tại trong mảng này.');
  }

  throw new Error(getRestErrorMessage(data, fallback));
}
