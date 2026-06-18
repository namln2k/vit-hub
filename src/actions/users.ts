'use server';

import type { ZodType } from 'zod';
import { requireWebActor, requireWebAuthIdentity } from '@/server/auth/actor';
import { changeUserStatus } from '@/server/services/users/changeUserStatus';
import { importUsers } from '@/server/services/users/importUsers';
import { listUsersForAdministration, searchUsers } from '@/server/services/users/searchUsers';
import {
  getCurrentUserProfile,
  removeCurrentUserAvatar,
  setCurrentUserAvatar,
  updateCurrentUserName,
  updateCurrentUserNickname,
  updateCurrentUserPersonnelInfo,
} from '@/server/services/users/profile';
import {
  serviceErrorToActionResult,
  zodFieldErrorsToActionResult,
} from '@/actions/shared/errorMapping';
import type { ActionResult } from '@/actions/shared/actionResult';
import type {
  PageDto,
  UserSearchResultDto,
  UserStatusDto,
  UserSummaryDto,
} from '@/features/users/types';
import { changeUserStatusSchema } from '@/features/users/schemas/changeUserStatus';
import { searchUsersSchema } from '@/features/users/schemas/searchUsers';
import { importUsersSchema } from '@/features/users/schemas/importUsers';
import {
  setCurrentUserAvatarSchema,
  updateCurrentUserNameSchema,
  updateCurrentUserNicknameSchema,
  updateCurrentUserPersonnelSchema,
} from '@/features/profile/schemas/profile';

export async function changeUserStatusAction(input: unknown): Promise<ActionResult<UserStatusDto>> {
  const parsed = changeUserStatusSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const data = await changeUserStatus(actor, parsed.data);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function searchUsersAction(
  input: unknown,
): Promise<ActionResult<PageDto<UserSearchResultDto>>> {
  const parsed = searchUsersSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const data = await searchUsers(parsed.data);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function listUsersForAdministrationAction(): Promise<ActionResult<UserSummaryDto[]>> {
  try {
    const actor = await requireWebActor();
    const data = await listUsersForAdministration(actor);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function importUsersAction(
  input: unknown,
): Promise<ActionResult<{ importedCount: number }>> {
  const parsed = importUsersSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const importedCount = await importUsers(actor, parsed.data);
    return { ok: true, data: { importedCount } };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function getCurrentUserProfileAction(): Promise<ActionResult<UserSummaryDto>> {
  try {
    const identity = await requireWebAuthIdentity();
    const data = await getCurrentUserProfile(identity);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function updateCurrentUserNameAction(
  input: unknown,
): Promise<ActionResult<UserSummaryDto>> {
  return runProfileMutation(input, updateCurrentUserNameSchema, updateCurrentUserName);
}

export async function updateCurrentUserNicknameAction(
  input: unknown,
): Promise<ActionResult<UserSummaryDto>> {
  return runProfileMutation(input, updateCurrentUserNicknameSchema, updateCurrentUserNickname);
}

export async function updateCurrentUserPersonnelAction(
  input: unknown,
): Promise<ActionResult<UserSummaryDto>> {
  return runProfileMutation(
    input,
    updateCurrentUserPersonnelSchema,
    updateCurrentUserPersonnelInfo,
  );
}

export async function setCurrentUserAvatarAction(
  input: unknown,
): Promise<ActionResult<UserSummaryDto>> {
  return runProfileMutation(input, setCurrentUserAvatarSchema, setCurrentUserAvatar);
}

export async function removeCurrentUserAvatarAction(): Promise<ActionResult<UserSummaryDto>> {
  try {
    const actor = await requireWebActor();
    const data = await removeCurrentUserAvatar(actor);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

async function runProfileMutation<T>(
  input: unknown,
  schema: ZodType<T>,
  mutation: (
    actor: Awaited<ReturnType<typeof requireWebActor>>,
    data: T,
  ) => Promise<UserSummaryDto>,
): Promise<ActionResult<UserSummaryDto>> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const data = await mutation(actor, parsed.data);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}
