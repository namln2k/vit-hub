import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceErrorToActionResult, zodFieldErrorsToActionResult } from './errorMapping';
import { ForbiddenError } from '@/server/services/shared/errors';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('action error mapping', () => {
  it('maps safe service errors without logging them', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(serviceErrorToActionResult(new ForbiddenError('Không có quyền.'))).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Không có quyền.',
      },
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('hides unexpected errors and logs them once', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(serviceErrorToActionResult(new Error('database secret'))).toEqual({
      ok: false,
      error: {
        code: 'INFRASTRUCTURE',
        message: 'Không thể hoàn tất thao tác lúc này.',
      },
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('normalizes Zod field errors', () => {
    expect(
      zodFieldErrorsToActionResult({
        userId: ['Mã nhân sự không hợp lệ.'],
        status: undefined,
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'DOMAIN_VALIDATION',
        message: 'Dữ liệu không hợp lệ.',
        fieldErrors: {
          userId: ['Mã nhân sự không hợp lệ.'],
        },
      },
    });
  });
});
