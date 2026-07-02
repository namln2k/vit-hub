import DeleteEventModal from '@/features/super-admin/components/event/DeleteEventModal';
import EventBasicDetailModal from '@/features/super-admin/components/event/EventBasicDetailModal';
import EventFormModal from '@/features/super-admin/components/event/EventFormModal';
import EventParticipantsModal from '@/features/super-admin/components/event/EventParticipantsModal';
import {
  TableCell,
  TableHeader,
} from '@/features/super-admin/components/event/EventTablePrimitives';
import {
  OWNER_SCOPE_LABELS,
  VISIBILITY_LABELS,
  formatDateTime,
  getEventDateState,
  normalizeSearch,
  sortEventsByStartDateDesc,
  type DateFilter,
  type ScopeOption,
} from '@/features/super-admin/components/event/eventManagementUtils';
import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import type {
  EventOwnerScopeType,
  EventVisibility,
} from '@/features/organization-structure/permissions';
import type { Club } from '@/services/clubs';
import type { Division } from '@/services/divisions';
import type { Group } from '@/services/groups';
import {
  formatOrganizationEventApiError,
  listOrganizationEvents,
  type OrganizationEvent,
} from '@/services/organizationAdmin';
import Sharingan from '@/shared/loading/Sharingan';
import { CalendarDays, Eye, Filter, Pencil, Plus, Search, Trash2, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface EventsManagementProps {
  divisions: Division[];
  groups: Group[];
  clubs: Club[];
}

export default function EventsManagement({ divisions, groups, clubs }: EventsManagementProps) {
  const [events, setEvents] = useState<OrganizationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | EventOwnerScopeType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | EventVisibility>('all');
  const [formEvent, setFormEvent] = useState<OrganizationEvent | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<OrganizationEvent | null>(null);
  const [basicDetailEvent, setBasicDetailEvent] = useState<OrganizationEvent | null>(null);
  const [participantsEvent, setParticipantsEvent] = useState<OrganizationEvent | null>(null);
  const [currentTime] = useState(() => Date.now());

  const scopeOptions = useMemo<ScopeOption[]>(
    () => [
      { type: 'organization', id: null, label: 'Toàn Đội', groupLabel: 'Toàn Đội' },
      ...divisions.map((division) => ({
        type: 'division' as const,
        id: division.id,
        label: division.name,
        groupLabel: 'Ban',
      })),
      ...groups.map((group) => ({
        type: 'group' as const,
        id: group.id,
        label: group.name,
        groupLabel: 'Nhóm',
      })),
      ...clubs
        .filter((club) => !club.archivedAt)
        .map((club) => ({
          type: 'club' as const,
          id: club.id,
          label: club.name,
          groupLabel: 'CLB/tổ',
        })),
    ],
    [clubs, divisions, groups],
  );

  const loadEvents = useCallback(async (isMounted: () => boolean = () => true) => {
    setIsLoading(true);
    setLoadError('');

    try {
      const nextEvents = await listOrganizationEvents();

      if (isMounted()) {
        setEvents(nextEvents);
      }
    } catch (error) {
      if (isMounted()) {
        const message = formatOrganizationEventApiError(error, 'Không thể tải danh sách sự kiện.');
        setLoadError(
          message
            ? `Không thể tải danh sách sự kiện: ${message}`
            : 'Không thể tải danh sách sự kiện.',
        );
        setEvents([]);
      }
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      void loadEvents(() => isMounted);
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);

    return events.filter((event) => {
      if (scopeFilter !== 'all' && event.ownerScopeType !== scopeFilter) {
        return false;
      }

      if (visibilityFilter !== 'all' && event.visibility !== visibilityFilter) {
        return false;
      }

      if (dateFilter !== 'all' && getEventDateState(event, currentTime) !== dateFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        event.name,
        event.ownerScopeName,
        event.publicLocation,
        event.publicDescription,
        event.internalNotes,
      ].some((value) => normalizeSearch(value).includes(normalizedSearch));
    });
  }, [currentTime, dateFilter, events, scopeFilter, search, visibilityFilter]);

  function handleEventSaved(event: OrganizationEvent) {
    setEvents((currentEvents) => {
      const existingIndex = currentEvents.findIndex((currentEvent) => currentEvent.id === event.id);

      if (existingIndex === -1) {
        return [event, ...currentEvents].sort(sortEventsByStartDateDesc);
      }

      return currentEvents
        .map((currentEvent) => (currentEvent.id === event.id ? event : currentEvent))
        .sort(sortEventsByStartDateDesc);
    });
    setIsCreateFormOpen(false);
    setFormEvent(null);
  }

  function handleEventDeleted(eventId: string) {
    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId));
    setEventToDelete(null);
  }

  const activeSection = ADMIN_SECTIONS.find((section) => section.id === 'events')!;

  return (
    <>
      <AdminContentPanel
        section={activeSection}
        title={
          <>
            <CalendarDays className="h-5 w-5" />
            Quản lý sự kiện
          </>
        }
        count={`${filteredEvents.length}/${events.length} sự kiện`}
        actions={
          <button
            type="button"
            onClick={() => setIsCreateFormOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Tạo sự kiện
          </button>
        }
      >
        <div className="border-b border-slate-200 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_170px_190px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500"
                placeholder="Tìm theo tên, owner scope, địa điểm"
              />
            </label>

            <SelectWithIcon
              icon={<Filter className="h-4 w-4" />}
              value={scopeFilter}
              onChange={(value) => setScopeFilter(value as 'all' | EventOwnerScopeType)}
              label="Owner scope"
            >
              <option value="all">Tất cả owner</option>
              <option value="organization">Toàn Đội</option>
              <option value="division">Ban</option>
              <option value="group">Nhóm</option>
              <option value="club">CLB/tổ</option>
            </SelectWithIcon>

            <SelectWithIcon
              icon={<CalendarDays className="h-4 w-4" />}
              value={dateFilter}
              onChange={(value) => setDateFilter(value as DateFilter)}
              label="Ngày"
            >
              <option value="all">Mọi thời gian</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="past">Đã qua</option>
            </SelectWithIcon>

            <SelectWithIcon
              icon={<Eye className="h-4 w-4" />}
              value={visibilityFilter}
              onChange={(value) => setVisibilityFilter(value as 'all' | EventVisibility)}
              label="Visibility"
            >
              <option value="all">Mọi visibility</option>
              <option value="organization">Toàn Đội</option>
              <option value="scope">Owner scope</option>
              <option value="managers">Managers</option>
            </SelectWithIcon>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center">
            <Sharingan size={34} label="Đang tải sự kiện" />
          </div>
        ) : loadError ? (
          <div className="p-5">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {loadError}
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có sự kiện phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHeader>Sự kiện</TableHeader>
                  <TableHeader>Owner scope</TableHeader>
                  <TableHeader>Thời gian</TableHeader>
                  <TableHeader>Visibility</TableHeader>
                  <TableHeader>Participants</TableHeader>
                  <TableHeader align="right" className="px-3">
                    Thao tác
                  </TableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="align-top">
                    <TableCell>
                      <div className="min-w-56">
                        <p className="font-semibold text-slate-950">{event.name}</p>
                        {event.publicLocation ? (
                          <p className="mt-1 text-sm text-slate-500">{event.publicLocation}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-44">
                        <p className="text-sm font-semibold text-slate-900">
                          {event.ownerScopeName}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {OWNER_SCOPE_LABELS[event.ownerScopeType]}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-44 text-sm font-medium text-slate-700">
                        <p>{formatDateTime(event.startsAt)}</p>
                        {event.endsAt ? (
                          <p className="text-slate-500">Đến {formatDateTime(event.endsAt)}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex w-max items-center whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {VISIBILITY_LABELS[event.visibility]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex w-max items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          event.showParticipantsPublicly
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {event.showParticipantsPublicly ? 'Công khai' : 'Ẩn danh sách'}
                      </span>
                    </TableCell>
                    <TableCell align="right" className="px-3">
                      <div className="mx-auto flex w-max flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBasicDetailEvent(event)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                          aria-label={`Xem basic detail ${event.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setParticipantsEvent(event)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                          aria-label={`Quản lý participants ${event.name}`}
                        >
                          <UsersRound className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormEvent(event)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                          aria-label={`Chỉnh sửa ${event.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventToDelete(event)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50"
                          aria-label={`Xóa ${event.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminContentPanel>

      {isCreateFormOpen ? (
        <EventFormModal
          mode="create"
          scopeOptions={scopeOptions}
          onClose={() => setIsCreateFormOpen(false)}
          onSaved={handleEventSaved}
        />
      ) : null}

      {formEvent ? (
        <EventFormModal
          mode="edit"
          event={formEvent}
          scopeOptions={scopeOptions}
          onClose={() => setFormEvent(null)}
          onSaved={handleEventSaved}
        />
      ) : null}

      {participantsEvent ? (
        <EventParticipantsModal
          event={participantsEvent}
          onClose={() => setParticipantsEvent(null)}
        />
      ) : null}

      {basicDetailEvent ? (
        <EventBasicDetailModal event={basicDetailEvent} onClose={() => setBasicDetailEvent(null)} />
      ) : null}

      {eventToDelete ? (
        <DeleteEventModal
          event={eventToDelete}
          onClose={() => setEventToDelete(null)}
          onDeleted={handleEventDeleted}
        />
      ) : null}
    </>
  );
}

interface SelectWithIconProps {
  icon: ReactNode;
  value: string;
  label: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

function SelectWithIcon({ icon, value, label, onChange, children }: SelectWithIconProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-emerald-500"
      >
        {children}
      </select>
    </label>
  );
}
