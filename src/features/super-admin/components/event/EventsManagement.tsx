import AdminContentPanel from '@/features/super-admin/components/common/AdminContentPanel';
import { ADMIN_SECTIONS } from '@/features/super-admin/constants/adminSections';
import {
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} from '@/features/super-admin/lib/vietnamDateTime';
import type {
  EventOwnerScopeType,
  EventVisibility,
} from '@/features/organization-structure/permissions';
import type { Club } from '@/services/clubs';
import type { Division } from '@/services/divisions';
import type { Group } from '@/services/groups';
import {
  createOrganizationEvent,
  deleteOrganizationEvent,
  formatOrganizationEventApiError,
  listOrganizationEvents,
  updateOrganizationEvent,
  type OrganizationEvent,
  type OrganizationEventCreateInput,
  type OrganizationEventWriteInput,
} from '@/services/organizationAdmin';
import Sharingan from '@/shared/loading/Sharingan';
import {
  CalendarDays,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface EventsManagementProps {
  divisions: Division[];
  groups: Group[];
  clubs: Club[];
}

interface ScopeOption {
  type: EventOwnerScopeType;
  id: string | null;
  label: string;
  groupLabel: string;
}

type DateFilter = 'all' | 'upcoming' | 'ongoing' | 'past';

const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  organization: 'Toàn Đội',
  scope: 'Trong owner scope',
  managers: 'Managers',
};

const OWNER_SCOPE_LABELS: Record<EventOwnerScopeType, string> = {
  organization: 'Toàn Đội',
  division: 'Ban',
  group: 'Nhóm',
  club: 'CLB/tổ',
};

const DEFAULT_FORM_STATE = {
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
                  <TableHeader align="right">Thao tác</TableHeader>
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
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {VISIBILITY_LABELS[event.visibility]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          event.showParticipantsPublicly
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {event.showParticipantsPublicly ? 'Công khai' : 'Ẩn danh sách'}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex justify-end gap-2">
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

interface EventFormModalProps {
  mode: 'create' | 'edit';
  event?: OrganizationEvent;
  scopeOptions: ScopeOption[];
  onClose: () => void;
  onSaved: (event: OrganizationEvent) => void;
}

function EventFormModal({ mode, event, scopeOptions, onClose, onSaved }: EventFormModalProps) {
  const isEditing = mode === 'edit';
  const [formState, setFormState] = useState(() => getInitialFormState(event));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedScope = scopeOptions.find(
    (option) => getScopeKey(option) === formState.ownerScopeKey,
  );
  const selectedScopeType =
    isEditing && event ? event.ownerScopeType : (selectedScope?.type ?? 'organization');

  function setField<Key extends keyof typeof formState>(key: Key, value: (typeof formState)[Key]) {
    setFormState((currentState) => ({ ...currentState, [key]: value }));
    setError('');
  }

  function handleOwnerScopeChange(scopeKey: string) {
    const nextScope = scopeOptions.find((option) => getScopeKey(option) === scopeKey);

    setFormState((currentState) => ({
      ...currentState,
      ownerScopeKey: scopeKey,
      visibility: nextScope?.type === 'organization' ? 'organization' : 'scope',
    }));
    setError('');
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();

    if (!formState.name.trim()) {
      setError('Tên sự kiện là bắt buộc.');
      return;
    }

    if (!formState.startsAt) {
      setError('Thời điểm bắt đầu là bắt buộc.');
      return;
    }

    if (!isEditing && !selectedScope) {
      setError('Owner scope không hợp lệ.');
      return;
    }

    const input: OrganizationEventWriteInput = {
      name: formState.name.trim(),
      visibility: formState.visibility,
      showParticipantsPublicly: formState.showParticipantsPublicly,
      startsAt: fromVietnamDateTimeLocalValue(formState.startsAt),
      endsAt: formState.endsAt ? fromVietnamDateTimeLocalValue(formState.endsAt) : null,
      publicLocation: formState.publicLocation.trim(),
      publicDescription: formState.publicDescription.trim(),
      internalNotes: formState.internalNotes.trim(),
    };

    if (input.endsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
      setError('Thời điểm kết thúc phải sau thời điểm bắt đầu.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const savedEvent =
        isEditing && event
          ? await updateOrganizationEvent(event.id, input)
          : selectedScope
            ? await createOrganizationEvent({
                ...input,
                ownerScopeType: selectedScope.type,
                ownerScopeId: selectedScope.id,
              } satisfies OrganizationEventCreateInput)
            : null;

      if (!savedEvent) {
        setError('Owner scope không hợp lệ.');
        return;
      }

      onSaved(savedEvent);
      toast.success(isEditing ? 'Đã cập nhật sự kiện.' : 'Đã tạo sự kiện.', {
        id: isEditing ? 'event-update-success' : 'event-create-success',
      });
    } catch (saveError) {
      const actionText = isEditing ? 'cập nhật' : 'tạo';
      const message = formatOrganizationEventApiError(
        saveError,
        `Không thể ${actionText} sự kiện.`,
      );
      toast.error(
        message
          ? `Không thể ${actionText} sự kiện: ${message}`
          : `Không thể ${actionText} sự kiện.`,
        { id: isEditing ? 'event-update-error' : 'event-create-error' },
      );
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  const modalTitle = isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện';
  const modalTitleId = isEditing ? 'edit-event-title' : 'create-event-title';
  const submitText = isEditing ? 'Lưu thay đổi' : 'Tạo sự kiện';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id={modalTitleId} className="text-lg font-bold text-slate-950">
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-12rem)] space-y-5 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Tên sự kiện</span>
            <input
              autoFocus
              value={formState.name}
              onChange={(changeEvent) => setField('name', changeEvent.target.value)}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="VD: Training tháng 6"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            {isEditing && event ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase text-slate-500">Owner scope</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{event.ownerScopeName}</p>
                <p className="text-xs font-medium text-slate-500">
                  {OWNER_SCOPE_LABELS[event.ownerScopeType]} - immutable
                </p>
              </div>
            ) : (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Owner scope</span>
                <select
                  value={formState.ownerScopeKey}
                  onChange={(changeEvent) => handleOwnerScopeChange(changeEvent.target.value)}
                  disabled={isSaving}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {scopeOptions.map((option) => (
                    <option key={getScopeKey(option)} value={getScopeKey(option)}>
                      {option.groupLabel}: {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Visibility</span>
              <select
                value={formState.visibility}
                onChange={(changeEvent) =>
                  setField('visibility', changeEvent.target.value as EventVisibility)
                }
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="organization">Toàn Đội</option>
                <option value="scope">
                  {selectedScopeType === 'organization' ? 'Toàn Đội scope' : 'Owner scope'}
                </option>
                <option value="managers">Managers</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Bắt đầu</span>
              <input
                type="datetime-local"
                value={formState.startsAt}
                onChange={(changeEvent) => setField('startsAt', changeEvent.target.value)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Kết thúc</span>
              <input
                type="datetime-local"
                value={formState.endsAt}
                onChange={(changeEvent) => setField('endsAt', changeEvent.target.value)}
                disabled={isSaving}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
            <input
              type="checkbox"
              checked={formState.showParticipantsPublicly}
              onChange={(changeEvent) =>
                setField('showParticipantsPublicly', changeEvent.target.checked)
              }
              disabled={isSaving}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
            />
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <UsersRound className="h-4 w-4 text-slate-400" />
              Hiển thị danh sách participants công khai
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Địa điểm</span>
            <input
              value={formState.publicLocation}
              onChange={(changeEvent) => setField('publicLocation', changeEvent.target.value)}
              disabled={isSaving}
              className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="Địa điểm hiển thị công khai"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Mô tả công khai
              </span>
              <textarea
                value={formState.publicDescription}
                onChange={(changeEvent) => setField('publicDescription', changeEvent.target.value)}
                disabled={isSaving}
                className="min-h-28 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Ghi chú nội bộ
              </span>
              <textarea
                value={formState.internalNotes}
                onChange={(changeEvent) => setField('internalNotes', changeEvent.target.value)}
                disabled={isSaving}
                className="min-h-28 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSaving ? (
              <Sharingan size={16} label="Đang lưu sự kiện" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {submitText}
          </button>
        </div>
      </form>
    </div>
  );
}

interface DeleteEventModalProps {
  event: OrganizationEvent;
  onClose: () => void;
  onDeleted: (eventId: string) => void;
}

function DeleteEventModal({ event, onClose, onDeleted }: DeleteEventModalProps) {
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmation === event.name;

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteOrganizationEvent(event.id);
      onDeleted(event.id);
      toast.success('Đã xóa sự kiện.', { id: 'event-delete-success' });
    } catch (deleteError) {
      const message = formatOrganizationEventApiError(deleteError, 'Không thể xóa sự kiện.');
      toast.error(message ? `Không thể xóa sự kiện: ${message}` : 'Không thể xóa sự kiện.', {
        id: 'event-delete-error',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-event-title"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="delete-event-title" className="text-lg font-bold text-slate-950">
            Xóa sự kiện
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm font-medium text-slate-600">
            Sự kiện <span className="font-semibold text-slate-950">{event.name}</span> sẽ bị xóa
            vĩnh viễn. Event memberships và role assignments phụ thuộc sẽ bị xóa theo cascade.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Nhập chính xác tên sự kiện để xác nhận
            </span>
            <input
              value={confirmation}
              onChange={(changeEvent) => setConfirmation(changeEvent.target.value)}
              disabled={isDeleting}
              className="h-11 w-full rounded-lg border border-red-200 px-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-red-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder={event.name}
            />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isDeleting ? (
              <Sharingan size={16} label="Đang xóa sự kiện" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa vĩnh viễn
          </button>
        </div>
      </div>
    </div>
  );
}

function TableHeader({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <td className={`px-4 py-4 ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</td>
  );
}

function getInitialFormState(event?: OrganizationEvent) {
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

function getScopeKey(option: ScopeOption) {
  return `${option.type}:${option.id ?? ''}`;
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function getEventDateState(event: OrganizationEvent, now: number): Exclude<DateFilter, 'all'> {
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

function sortEventsByStartDateDesc(first: OrganizationEvent, second: OrganizationEvent) {
  return new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}
