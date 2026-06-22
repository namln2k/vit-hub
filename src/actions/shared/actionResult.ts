import type { ServiceErrorCode } from '@/server/services/shared/errors';

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: ServiceErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
