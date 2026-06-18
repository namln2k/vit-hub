import type { AppUser } from '@/contexts/auth';
import type {
  EventOwnerScopeType,
  EventVisibility,
} from '@/features/organization-structure/permissions';
import { toVietnamDateTimeLocalValue } from '@/features/super-admin/lib/vietnamDateTime';
import type {
  OrganizationEvent,
  OrganizationEventParticipantCapabilities,
} from '@/services/organizationAdmin';

export interface ScopeOption {
  type: EventOwnerScopeType;
  id: string | null;
  label: string;
  groupLabel: string;
}

export type DateFilter = 'all' | 'upcoming' | 'ongoing' | 'past';

export const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  organization: 'Toàn Đội',
  scope: 'Trong owner scope',
  managers: 'Managers',
};

export const EVENT_MEMBERSHIP_STATUS_LABELS = {
  going: 'Going',
  checked_in: 'Checked in',
  absent: 'Absent',
} as const;

export const EVENT_MEMBERSHIP_STATUS_STYLES = {
  going: 'border-sky-200 bg-sky-50 text-sky-700',
  checked_in: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  absent: 'border-amber-200 bg-amber-50 text-amber-700',
} as const;

export const DEFAULT_EVENT_PARTICIPANT_CAPABILITIES: OrganizationEventParticipantCapabilities = {
  canManage: false,
  canManageMembers: false,
  canAssignRoles: false,
  canRevokeRoles: false,
  canUpdateAttendance: false,
};

export const OWNER_SCOPE_LABELS: Record<EventOwnerScopeType, string> = {
  organization: 'Toàn Đội',
  division: 'Ban',
  group: 'Nhóm',
  club: 'CLB/tổ',
};

export const DEFAULT_FORM_STATE = {
  name: '',
  ownerScopeKey: 'organization:',
  visibility: 'organization' as EventVisibility,
  showParticipantsPublicly: true,
  startsAt: toVietnamDateTimeLocalValue(new Date()),
  endsAt: '',
  publicLocation: '',
  publicDescription: '',
  internalNotes: '',
};

export function getInitialFormState(event?: OrganizationEvent) {
  if (!event) {
    return DEFAULT_FORM_STATE;
  }

  return {
    name: event.name,
    ownerScopeKey: `${event.ownerScopeType}:${event.ownerScopeId ?? ''}`,
    visibility: event.visibility,
    showParticipantsPublicly: event.showParticipantsPublicly,
    startsAt: toVietnamDateTimeLocalValue(new Date(event.startsAt)),
    endsAt: event.endsAt ? toVietnamDateTimeLocalValue(new Date(event.endsAt)) : '',
    publicLocation: event.publicLocation,
    publicDescription: event.publicDescription,
    internalNotes: event.internalNotes,
  };
}

export function getScopeKey(option: ScopeOption) {
  return `${option.type}:${option.id ?? ''}`;
}

export function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN');
}

export function getPersonName(
  user: Pick<AppUser, 'firstName' | 'middleName' | 'lastName' | 'nickname' | 'username'>,
) {
  const fullName = [user.lastName, user.middleName, user.firstName].filter(Boolean).join(' ');
  return user.nickname || fullName || user.username;
}

export function getEventDateState(
  event: OrganizationEvent,
  now: number,
): Exclude<DateFilter, 'all'> {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = event.endsAt ? new Date(event.endsAt).getTime() : null;

  if (startsAt > now) {
    return 'upcoming';
  }

  if (!endsAt || endsAt > now) {
    return 'ongoing';
  }

  return 'past';
}

export function sortEventsByStartDateDesc(first: OrganizationEvent, second: OrganizationEvent) {
  return new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime();
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}
