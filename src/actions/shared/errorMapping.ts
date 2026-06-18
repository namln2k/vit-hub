import 'server-only';

import {
  DomainValidationError,
  InfrastructureError,
  ServiceError,
  type ServiceErrorCode,
} from '@/server/services/shared/errors';
import type { ActionResult } from '@/actions/shared/actionResult';

const GENERIC_ERROR_MESSAGE = 'Không thể hoàn tất thao tác lúc này.';

export function serviceErrorToActionResult(error: unknown): ActionResult<never> {
  if (error instanceof ServiceError) {
    if (error instanceof InfrastructureError) {
      console.error('Server infrastructure error.', error);
    }

    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof DomainValidationError && error.fieldErrors
          ? { fieldErrors: error.fieldErrors }
          : {}),
      },
    };
  }

  console.error('Unexpected server action error.', error);
  return {
    ok: false,
    error: {
      code: 'INFRASTRUCTURE' satisfies ServiceErrorCode,
      message: GENERIC_ERROR_MESSAGE,
    },
  };
}

export function zodFieldErrorsToActionResult(
  fieldErrors: Record<string, string[] | undefined>,
  message = 'Dữ liệu không hợp lệ.',
): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: 'DOMAIN_VALIDATION',
      message,
      fieldErrors: Object.fromEntries(
        Object.entries(fieldErrors).filter((entry): entry is [string, string[]] =>
          Array.isArray(entry[1]),
        ),
      ),
    },
  };
}
