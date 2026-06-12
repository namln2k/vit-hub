import { jsonResponse, readJsonBody } from '@/server/api';
import {
  authorizationErrorResponse,
  canCreateEventForOwner,
  canManageEvent,
  requireOrganizationActor,
} from '@/features/organization-structure/server/authorization';
import {
  createEvent,
  deleteEvent,
  getEventSummary,
  isEventOwnerScopeType,
  isEventVisibility,
  listEvents,
  updateEvent,
  type EventSummary,
  type EventWriteInput,
} from '@/features/organization-structure/server/adminRepository';

export const runtime = 'nodejs';

interface EventBody {
  id?: unknown;
  name?: unknown;
  ownerScopeType?: unknown;
  ownerScopeId?: unknown;
  visibility?: unknown;
  showParticipantsPublicly?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  publicLocation?: unknown;
  publicDescription?: unknown;
  internalNotes?: unknown;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readRequiredIsoDate(value: unknown) {
  const rawValue = readString(value);

  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function readOptionalIsoDate(value: unknown) {
  const rawValue = readString(value);

  if (!rawValue) {
    return undefined;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function readEventInput(body: EventBody): EventWriteInput | { error: string } {
  const name = readString(body.name);
  const visibility = body.visibility;
  const startsAt = readRequiredIsoDate(body.startsAt);
  const endsAt = readOptionalIsoDate(body.endsAt);

  if (!name) {
    return { error: 'Tên sự kiện là bắt buộc.' };
  }

  if (!isEventVisibility(visibility)) {
    return { error: 'Visibility không hợp lệ.' };
  }

  if (!startsAt) {
    return { error: 'Thời điểm bắt đầu không hợp lệ.' };
  }

  if (endsAt === null) {
    return { error: 'Thời điểm kết thúc không hợp lệ.' };
  }

  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { error: 'Thời điểm kết thúc phải sau thời điểm bắt đầu.' };
  }

  return {
    name,
    visibility,
    showParticipantsPublicly: body.showParticipantsPublicly !== false,
    startsAt,
    endsAt: endsAt ?? null,
    publicLocation: readOptionalString(body.publicLocation),
    publicDescription: readOptionalString(body.publicDescription),
    internalNotes: readOptionalString(body.internalNotes),
  };
}

function knownErrorResponse(error: unknown, fallback: string) {
  const authResponse = authorizationErrorResponse(error);

  if (authResponse) {
    return authResponse;
  }

  return jsonResponse({ error: error instanceof Error ? error.message : fallback }, 500);
}

export async function GET(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const events = await listEvents();
    const manageableEvents: EventSummary[] = [];

    for (const event of events) {
      if (await canManageEvent(actor, event.id)) {
        manageableEvents.push(event);
      }
    }

    return jsonResponse({ events: manageableEvents });
  } catch (error) {
    return knownErrorResponse(error, 'Không thể tải danh sách sự kiện.');
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<EventBody>(request, 40_000);
    const ownerScopeType = body.ownerScopeType;
    const ownerScopeId = readString(body.ownerScopeId) || null;
    const input = readEventInput(body);

    if (!isEventOwnerScopeType(ownerScopeType)) {
      return jsonResponse({ error: 'Owner scope không hợp lệ.' }, 400);
    }

    if (ownerScopeType === 'organization' && ownerScopeId !== null) {
      return jsonResponse({ error: 'Event toàn Đội không được có owner scope id.' }, 400);
    }

    if (ownerScopeType !== 'organization' && !ownerScopeId) {
      return jsonResponse({ error: 'Event scope cần owner scope id.' }, 400);
    }

    if ('error' in input) {
      return jsonResponse({ error: input.error }, 400);
    }

    if (!(await canCreateEventForOwner(actor, { type: ownerScopeType, id: ownerScopeId }))) {
      return jsonResponse({ error: 'Bạn không có quyền tạo sự kiện cho owner scope này.' }, 403);
    }

    const event = await createEvent({ actorId: actor.id, ownerScopeType, ownerScopeId, input });
    return jsonResponse({ event }, 201);
  } catch (error) {
    return knownErrorResponse(error, 'Không thể tạo sự kiện.');
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<EventBody>(request, 40_000);
    const eventId = readString(body.id);
    const input = readEventInput(body);

    if (!eventId) {
      return jsonResponse({ error: 'Sự kiện không hợp lệ.' }, 400);
    }

    if ('error' in input) {
      return jsonResponse({ error: input.error }, 400);
    }

    const currentEvent = await getEventSummary(eventId);

    if (!currentEvent) {
      return jsonResponse({ error: 'Không tìm thấy sự kiện.' }, 404);
    }

    if (!(await canManageEvent(actor, eventId))) {
      return jsonResponse({ error: 'Bạn không có quyền cập nhật sự kiện này.' }, 403);
    }

    const event = await updateEvent({ actorId: actor.id, eventId, input });
    return jsonResponse({ event });
  } catch (error) {
    return knownErrorResponse(error, 'Không thể cập nhật sự kiện.');
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireOrganizationActor(request);
    const body = await readJsonBody<EventBody>(request, 20_000);
    const eventId = readString(body.id);

    if (!eventId) {
      return jsonResponse({ error: 'Sự kiện không hợp lệ.' }, 400);
    }

    const currentEvent = await getEventSummary(eventId);

    if (!currentEvent) {
      return jsonResponse({ error: 'Không tìm thấy sự kiện.' }, 404);
    }

    if (!(await canManageEvent(actor, eventId))) {
      return jsonResponse({ error: 'Bạn không có quyền xóa sự kiện này.' }, 403);
    }

    await deleteEvent(eventId);
    return jsonResponse({ ok: true });
  } catch (error) {
    return knownErrorResponse(error, 'Không thể xóa sự kiện.');
  }
}
