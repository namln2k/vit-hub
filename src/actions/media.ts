'use server';

import { requireWebActor } from '@/server/auth/actor';
import { createAvatarUploadIntent, deleteAvatarObject } from '@/server/services/media/avatarMedia';
import {
  createPostImageUploadIntent,
  deletePostImageObjects,
} from '@/server/services/media/postImageMedia';
import {
  createAvatarUploadIntentSchema,
  deleteAvatarObjectSchema,
} from '@/features/profile/schemas/avatarMedia';
import {
  createPostImageUploadIntentSchema,
  deletePostImageObjectsSchema,
} from '@/features/posts/schemas/postImageMedia';
import {
  serviceErrorToActionResult,
  zodFieldErrorsToActionResult,
} from '@/actions/shared/errorMapping';
import type { ActionResult } from '@/actions/shared/actionResult';

interface AvatarUploadIntentDto {
  uploadUrl: string;
  avatarKey: string;
  avatarUrl: string;
  maxUploadBytes: number;
}

interface PostImageUploadIntentDto {
  uploadUrl: string;
  postImageKey: string;
  postImageUrl: string;
  maxUploadBytes: number;
}

export async function createAvatarUploadIntentAction(
  input: unknown,
): Promise<ActionResult<AvatarUploadIntentDto>> {
  const parsed = createAvatarUploadIntentSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const data = await createAvatarUploadIntent(actor, parsed.data);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function deleteAvatarObjectAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = deleteAvatarObjectSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    await deleteAvatarObject(actor, parsed.data.avatarKey);
    return { ok: true, data: null };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function createPostImageUploadIntentAction(
  input: unknown,
): Promise<ActionResult<PostImageUploadIntentDto>> {
  const parsed = createPostImageUploadIntentSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const data = await createPostImageUploadIntent(actor, parsed.data);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function deletePostImageObjectsAction(
  input: unknown,
): Promise<ActionResult<{ deleted: number }>> {
  const parsed = deletePostImageObjectsSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const deleted = await deletePostImageObjects(actor, parsed.data.images);
    return { ok: true, data: { deleted } };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}
