import { supabaseFetch } from '@/server/supabase';
import type { EventOwnerScopeType } from '@/features/organization-structure/permissions';
import {
  EventRow,
  EventSummary,
  EventWriteInput,
} from '@/features/organization-structure/server/adminRepository/types';
import { mapEventRows } from '@/features/organization-structure/server/adminRepository/helpers';
import { getRestErrorMessage } from '@/features/organization-structure/server/adminRepository/errors';

export async function listEvents(): Promise<EventSummary[]> {
  const { response, data } = await supabaseFetch<EventRow[]>(
    '/rest/v1/events?select=id,name,owner_scope_type,owner_scope_id,visibility,show_participants_publicly,starts_at,ends_at,public_location,public_description,internal_notes,created_by,updated_by,created_at,updated_at&order=starts_at.desc',
  );

  if (!response.ok) {
    throw new Error('Không thể tải danh sách sự kiện.');
  }

  return mapEventRows(Array.isArray(data) ? data : []);
}

export async function getEventSummary(eventId: string) {
  const query = new URLSearchParams({
    select:
      'id,name,owner_scope_type,owner_scope_id,visibility,show_participants_publicly,starts_at,ends_at,public_location,public_description,internal_notes,created_by,updated_by,created_at,updated_at',
    id: `eq.${eventId}`,
    limit: '1',
  });
  const { response, data } = await supabaseFetch<EventRow[]>(`/rest/v1/events?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Không thể tải sự kiện.');
  }

  const event = Array.isArray(data) ? data[0] : null;

  if (!event) {
    return null;
  }

  const events = await mapEventRows([event]);
  return events[0] ?? null;
}

export async function createEvent({
  actorId,
  ownerScopeType,
  ownerScopeId,
  input,
}: {
  actorId: string;
  ownerScopeType: EventOwnerScopeType;
  ownerScopeId: string | null;
  input: EventWriteInput;
}) {
  const { response, data } = await supabaseFetch<EventRow[]>('/rest/v1/events', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      name: input.name,
      owner_scope_type: ownerScopeType,
      owner_scope_id: ownerScopeId,
      visibility: input.visibility,
      show_participants_publicly: input.showParticipantsPublicly,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      public_location: input.publicLocation || null,
      public_description: input.publicDescription || null,
      internal_notes: input.internalNotes || null,
      created_by: actorId,
      updated_by: actorId,
    },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể tạo sự kiện.'));
  }

  const event = Array.isArray(data) ? data[0] : null;

  if (!event) {
    throw new Error('Không thể tạo sự kiện.');
  }

  const events = await mapEventRows([event]);
  return events[0];
}

export async function updateEvent({
  actorId,
  eventId,
  input,
}: {
  actorId: string;
  eventId: string;
  input: EventWriteInput;
}) {
  const updatedAt = new Date().toISOString();
  const query = new URLSearchParams({ id: `eq.${eventId}` });
  const { response, data } = await supabaseFetch<EventRow[]>(
    `/rest/v1/events?${query.toString()}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: {
        name: input.name,
        visibility: input.visibility,
        show_participants_publicly: input.showParticipantsPublicly,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        public_location: input.publicLocation || null,
        public_description: input.publicDescription || null,
        internal_notes: input.internalNotes || null,
        updated_by: actorId,
        updated_at: updatedAt,
      },
    },
  );

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể cập nhật sự kiện.'));
  }

  const event = Array.isArray(data) ? data[0] : null;

  if (!event) {
    throw new Error('Không tìm thấy sự kiện.');
  }

  const events = await mapEventRows([event]);
  return events[0];
}

export async function deleteEvent(eventId: string) {
  const query = new URLSearchParams({ id: `eq.${eventId}` });
  const { response, data } = await supabaseFetch(`/rest/v1/events?${query.toString()}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

  if (!response.ok) {
    throw new Error(getRestErrorMessage(data, 'Không thể xóa sự kiện.'));
  }
}
