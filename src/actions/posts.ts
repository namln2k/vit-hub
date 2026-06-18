'use server';

import { requireWebActor } from '@/server/auth/actor';
import {
  createPost,
  deletePost,
  setHomeFeaturedPosts,
  updatePost,
} from '@/server/services/posts/posts';
import {
  deletePostSchema,
  postWriteSchema,
  setHomeFeaturedPostsSchema,
  updatePostSchema,
} from '@/features/posts/schemas/posts';
import {
  serviceErrorToActionResult,
  zodFieldErrorsToActionResult,
} from '@/actions/shared/errorMapping';
import type { ActionResult } from '@/actions/shared/actionResult';
import type { PostDto } from '@/features/posts/types';

export async function createPostAction(input: unknown): Promise<ActionResult<PostDto>> {
  const parsed = postWriteSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const data = await createPost(actor, parsed.data);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function updatePostAction(input: unknown): Promise<ActionResult<PostDto>> {
  const parsed = updatePostSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    const data = await updatePost(actor, parsed.data.postId, parsed.data.post);
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function deletePostAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = deletePostSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    await deletePost(actor, parsed.data.postId);
    return { ok: true, data: null };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}

export async function setHomeFeaturedPostsAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = setHomeFeaturedPostsSchema.safeParse(input);

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  try {
    const actor = await requireWebActor();
    await setHomeFeaturedPosts(actor, parsed.data.postIds);
    return { ok: true, data: null };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}
