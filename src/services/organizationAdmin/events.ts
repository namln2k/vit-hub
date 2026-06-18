import { apiFetch } from '@/services/organizationAdmin/http';
import type {
  OrganizationEvent,
  OrganizationEventBasicDetail,
  OrganizationEventCreateInput,
  OrganizationEventWriteInput,
} from '@/services/organizationAdmin/types';

const EVENTS_API = '/api/organization/events';

export async function listOrganizationEvents() {
  const result = await apiFetch<{ events: OrganizationEvent[] }>(EVENTS_API);

  return result.events;
}

export async function createOrganizationEvent(input: OrganizationEventCreateInput) {
  const result = await apiFetch<{ event: OrganizationEvent }>(EVENTS_API, {
    method: 'POST',
    body: input,
  });

  return result.event;
}

export async function updateOrganizationEvent(eventId: string, input: OrganizationEventWriteInput) {
  const result = await apiFetch<{ event: OrganizationEvent }>(EVENTS_API, {
    method: 'PATCH',
    body: { id: eventId, ...input },
  });

  return result.event;
}

export async function deleteOrganizationEvent(eventId: string) {
  await apiFetch(EVENTS_API, {
    method: 'DELETE',
    body: { id: eventId },
  });
}

export async function getOrganizationEventBasicDetail(eventId: string, includeParticipants = true) {
  const params = new URLSearchParams({
    view: 'basic',
    id: eventId,
    includeParticipants: includeParticipants ? 'true' : 'false',
  });

  return apiFetch<OrganizationEventBasicDetail>(`${EVENTS_API}?${params.toString()}`);
}
