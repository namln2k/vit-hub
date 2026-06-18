import { jsonResponse } from '@/server/api';
import { AuthorizationError } from '@/features/organization-structure/server/authorization/types';

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return jsonResponse({ error: error.message }, error.status);
  }

  return null;
}
