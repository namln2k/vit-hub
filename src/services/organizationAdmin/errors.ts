import { ApiError } from '@/services/organizationAdmin/http';

export function formatTransferLeadApiError(error: unknown, fallback: string) {
  return formatApiError(error, fallback, [403, 409]);
}

export function formatOrganizationRoleApiError(error: unknown, fallback: string) {
  return formatApiError(error, fallback, [403, 409]);
}

export function formatOrganizationEventApiError(error: unknown, fallback: string) {
  return formatApiError(error, fallback, [403, 404, 409]);
}

export function formatOrganizationEventParticipantApiError(error: unknown, fallback: string) {
  return formatApiError(error, fallback, [403, 404, 409]);
}

function formatApiError(error: unknown, fallback: string, visibleStatuses: number[]) {
  const message = error instanceof Error ? error.message : fallback;

  if (error instanceof ApiError && visibleStatuses.includes(error.status)) {
    return `${error.status} ${getHttpStatusLabel(error.status)}: ${message}`;
  }

  return message;
}

function getHttpStatusLabel(status: number) {
  if (status === 403) {
    return 'Forbidden';
  }

  if (status === 409) {
    return 'Conflict';
  }

  if (status === 404) {
    return 'Not Found';
  }

  return 'Error';
}
