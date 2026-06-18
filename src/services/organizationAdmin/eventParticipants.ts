import type {
  EventMembershipStatus,
  EventRoleKey,
} from '@/features/organization-structure/permissions';
import { apiFetch } from '@/services/organizationAdmin/http';
import type {
  OrganizationEventParticipant,
  OrganizationEventParticipantCapabilities,
} from '@/services/organizationAdmin/types';

const EVENT_PARTICIPANTS_API = '/api/organization/event-participants';

export async function listOrganizationEventParticipants(eventId: string) {
  const params = new URLSearchParams({ eventId });
  const result = await apiFetch<{
    participants: OrganizationEventParticipant[];
    capabilities: OrganizationEventParticipantCapabilities;
  }>(`${EVENT_PARTICIPANTS_API}?${params.toString()}`);

  return result;
}

export async function addOrganizationEventParticipants(eventId: string, userIds: string[]) {
  await apiFetch(EVENT_PARTICIPANTS_API, {
    method: 'POST',
    body: { eventId, userIds },
  });
}

export async function updateOrganizationEventParticipantStatus(
  eventId: string,
  userId: string,
  status: EventMembershipStatus,
) {
  await apiFetch(EVENT_PARTICIPANTS_API, {
    method: 'PATCH',
    body: { action: 'update_status', eventId, userId, status },
  });
}

export async function assignOrganizationEventRole(
  eventId: string,
  userId: string,
  roleKey: EventRoleKey,
) {
  await apiFetch(EVENT_PARTICIPANTS_API, {
    method: 'PATCH',
    body: { action: 'assign_role', eventId, userId, roleKey },
  });
}

export async function revokeOrganizationEventRole(
  eventId: string,
  userId: string,
  roleKey: EventRoleKey,
) {
  await apiFetch(EVENT_PARTICIPANTS_API, {
    method: 'DELETE',
    body: { eventId, userId, roleKey },
  });
}

export async function transferOrganizationEventLead(eventId: string, targetUserId: string) {
  await apiFetch(EVENT_PARTICIPANTS_API, {
    method: 'PATCH',
    body: { action: 'transfer_lead', eventId, targetUserId },
  });
}
