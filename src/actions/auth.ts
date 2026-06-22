'use server';

import { APP_ROUTES } from '@/constants/routes';
import { registerSchema } from '@/features/auth/schemas/register';
import { registerAppUser } from '@/server/services/auth/registerAppUser';
import {
  serviceErrorToActionResult,
  zodFieldErrorsToActionResult,
} from '@/actions/shared/errorMapping';
import type { ActionResult } from '@/actions/shared/actionResult';
import { getRequestOrigin } from '@/server/requestOrigin';

export interface RegisterAppUserActionResult {
  needsEmailConfirmation: boolean;
  session: {
    accessToken: string;
    refreshToken: string;
  } | null;
}

export async function registerAppUserAction(
  formData: FormData,
): Promise<ActionResult<RegisterAppUserActionResult>> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    middleName: formData.get('middleName') ?? undefined,
    nickname: formData.get('nickname') ?? undefined,
    username: formData.get('username'),
  });

  if (!parsed.success) {
    return zodFieldErrorsToActionResult(parsed.error.flatten().fieldErrors);
  }

  const avatarValue = formData.get('avatar');

  if (avatarValue !== null && !(avatarValue instanceof File)) {
    return zodFieldErrorsToActionResult({
      avatar: ['Ảnh đại diện không hợp lệ.'],
    });
  }

  const avatar =
    avatarValue instanceof File && avatarValue.size > 0
      ? {
          contentType: avatarValue.type,
          declaredSize: avatarValue.size,
          bytes: new Uint8Array(await avatarValue.arrayBuffer()),
        }
      : null;

  try {
    const requestOrigin = await getRequestOrigin();
    const data = await registerAppUser({
      ...parsed.data,
      emailRedirectTo: `${requestOrigin}${APP_ROUTES.login}`,
      avatar,
    });
    return { ok: true, data };
  } catch (error) {
    return serviceErrorToActionResult(error);
  }
}
