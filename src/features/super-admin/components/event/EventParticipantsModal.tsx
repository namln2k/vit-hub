import type { UserSearchResultDto } from '@/features/users/types';
import {
  EVENT_ROLE_KEYS,
  ROLE_LABELS,
  type EventRoleKey,
} from '@/features/organization-structure/permissions';
import {
  DEFAULT_EVENT_PARTICIPANT_CAPABILITIES,
  EVENT_MEMBERSHIP_STATUS_LABELS,
  EVENT_MEMBERSHIP_STATUS_STYLES,
  getPersonName,
} from '@/features/super-admin/components/event/eventManagementUtils';
import {
  TableCell,
  TableHeader,
} from '@/features/super-admin/components/event/EventTablePrimitives';
import {
  EventLeadTransferModal,
  EventParticipantModeTabs,
  type EventParticipantMode,
} from '@/features/super-admin/components/event/EventParticipantOverlays';
import {
  addOrganizationEventParticipants,
  assignOrganizationEventRole,
  formatOrganizationEventParticipantApiError,
  listOrganizationEventParticipants,
  revokeOrganizationEventRole,
  transferOrganizationEventLead,
  updateOrganizationEventParticipantStatus,
  type OrganizationEvent,
  type OrganizationEventParticipant,
  type OrganizationEventParticipantCapabilities,
} from '@/services/organizationAdmin';
import { searchUsers } from '@/features/users/client/searchUsers';
import Avatar from '@/shared/layout/Avatar';
import Sharingan from '@/shared/loading/Sharingan';
import { Check, Search, UserPlus, UsersRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface EventParticipantsModalProps {
  event: OrganizationEvent;
  onClose: () => void;
}

export default function EventParticipantsModal({ event, onClose }: EventParticipantsModalProps) {
  const [participants, setParticipants] = useState<OrganizationEventParticipant[]>([]);
  const [capabilities, setCapabilities] = useState<OrganizationEventParticipantCapabilities>(
    DEFAULT_EVENT_PARTICIPANT_CAPABILITIES,
  );
  const [activeMode, setActiveMode] = useState<EventParticipantMode>('participants');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResultDto[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [transferTarget, setTransferTarget] = useState<OrganizationEventParticipant | null>(null);

  const participantIds = useMemo(
    () => new Set(participants.map((participant) => participant.uid)),
    [participants],
  );
  const currentLead = participants.find((participant) =>
    participant.roleAssignments.some((assignment) => assignment.roleKey === 'event_lead'),
  );

  const loadParticipants = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await listOrganizationEventParticipants(event.id);
      setParticipants(result.participants);
      setCapabilities(result.capabilities);
    } catch (error) {
      const message = formatOrganizationEventParticipantApiError(
        error,
        'Không thể tải participants.',
      );
      setLoadError(message);
      setParticipants([]);
      setCapabilities(DEFAULT_EVENT_PARTICIPANT_CAPABILITIES);
    } finally {
      setIsLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadParticipants();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadParticipants]);

  useEffect(() => {
    if (!capabilities.canManageMembers) {
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingUsers(true);

      try {
        const nextUsers = await searchUsers({
          search: userSearch.trim(),
          limit: userSearch.trim() ? 12 : 20,
        });

        if (isMounted) {
          setUserResults(
            nextUsers.filter((user) => user.status === 'active' && !participantIds.has(user.uid)),
          );
        }
      } catch {
        if (isMounted) {
          setUserResults([]);
        }
      } finally {
        if (isMounted) {
          setIsSearchingUsers(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [capabilities.canManageMembers, participantIds, userSearch]);

  async function runParticipantAction(
    actionId: string,
    action: () => Promise<void>,
    success: string,
  ) {
    setPendingAction(actionId);

    try {
      await action();
      await loadParticipants();
      toast.success(success, { id: `${actionId}-success` });
    } catch (error) {
      const message = formatOrganizationEventParticipantApiError(
        error,
        'Không thể cập nhật event.',
      );
      toast.error(message, { id: `${actionId}-error` });
    } finally {
      setPendingAction('');
    }
  }

  async function handleAddUser(user: UserSearchResultDto) {
    if (!capabilities.canManageMembers) {
      return;
    }

    await runParticipantAction(
      `add-${user.uid}`,
      () => addOrganizationEventParticipants(event.id, [user.uid]),
      'Đã thêm participant.',
    );
    setUserSearch('');
  }

  async function handleRoleClick(participant: OrganizationEventParticipant, roleKey: EventRoleKey) {
    const hasRole = participant.roleAssignments.some(
      (assignment) => assignment.roleKey === roleKey,
    );

    if ((hasRole && !capabilities.canRevokeRoles) || (!hasRole && !capabilities.canAssignRoles)) {
      return;
    }

    if (roleKey === 'event_lead' && !hasRole && currentLead) {
      setTransferTarget(participant);
      return;
    }

    await runParticipantAction(
      `${hasRole ? 'revoke' : 'assign'}-${participant.uid}-${roleKey}`,
      () =>
        hasRole
          ? revokeOrganizationEventRole(event.id, participant.uid, roleKey)
          : assignOrganizationEventRole(event.id, participant.uid, roleKey),
      hasRole ? 'Đã thu hồi event role.' : 'Đã bổ nhiệm event role.',
    );
  }

  async function handleStatusChange(
    participant: OrganizationEventParticipant,
    status: OrganizationEventParticipant['membership']['status'],
  ) {
    if (!capabilities.canUpdateAttendance) {
      return;
    }

    await runParticipantAction(
      `status-${participant.uid}`,
      () => updateOrganizationEventParticipantStatus(event.id, participant.uid, status),
      'Đã cập nhật trạng thái participant.',
    );
  }

  async function handleTransferLead() {
    if (!transferTarget || !capabilities.canAssignRoles || !capabilities.canRevokeRoles) {
      return;
    }

    await runParticipantAction(
      `transfer-lead-${transferTarget.uid}`,
      () => transferOrganizationEventLead(event.id, transferTarget.uid),
      'Đã chuyển giao event lead.',
    );
    setTransferTarget(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-participants-title"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget && !pendingAction) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="event-participants-title" className="text-lg font-bold text-slate-950">
              Event detail
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{event.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(pendingAction)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <EventParticipantModeTabs activeMode={activeMode} onChange={setActiveMode} />

        <div
          className={`grid min-h-0 flex-1 gap-0 overflow-hidden ${
            activeMode === 'participants' ? 'lg:grid-cols-[320px_minmax(0,1fr)]' : ''
          }`}
        >
          {activeMode === 'participants' ? (
            <aside className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={userSearch}
                  onChange={(changeEvent) => setUserSearch(changeEvent.target.value)}
                  disabled={Boolean(pendingAction) || !capabilities.canManageMembers}
                  className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  placeholder="Tìm account user đang active"
                />
              </label>

              <div className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto">
                {isSearchingUsers ? (
                  <div className="flex h-20 items-center justify-center">
                    <Sharingan size={24} label="Đang tìm user" />
                  </div>
                ) : !capabilities.canManageMembers ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
                    Bạn không có quyền thêm participant.
                  </p>
                ) : userResults.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
                    Không có account user phù hợp.
                  </p>
                ) : (
                  userResults.map((user) => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => void handleAddUser(user)}
                      disabled={Boolean(pendingAction)}
                      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Avatar src={user.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-950">
                          {getPersonName(user)}
                        </span>
                        <span className="block truncate text-xs font-medium text-slate-500">
                          {user.email}
                        </span>
                      </span>
                      {pendingAction === `add-${user.uid}` ? (
                        <Sharingan size={16} label="Đang thêm participant" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-emerald-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </aside>
          ) : null}

          <section className="min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center">
                <Sharingan size={34} label="Đang tải participants" />
              </div>
            ) : loadError ? (
              <div className="p-5">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {loadError}
                </div>
              </div>
            ) : participants.length === 0 ? (
              <div className="p-8 text-center">
                <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Event chưa có participant.
                </p>
              </div>
            ) : (
              <div>
                {activeMode === 'attendance' && !capabilities.canUpdateAttendance ? (
                  <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800">
                    Bạn đang xem attendance ở chế độ read-only.
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeader>Participant</TableHeader>
                        <TableHeader>
                          {activeMode === 'attendance' ? 'Attendance' : 'Status'}
                        </TableHeader>
                        <TableHeader>Roles</TableHeader>
                        {activeMode === 'participants' ? (
                          <TableHeader align="right">Assign/Revoke</TableHeader>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {participants.map((participant) => (
                        <tr key={participant.uid} className="align-top">
                          <TableCell>
                            <div className="flex min-w-60 items-center gap-3">
                              <Avatar src={participant.avatarUrl} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {getPersonName(participant)}
                                </p>
                                <p className="truncate text-xs font-medium text-slate-500">
                                  {participant.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {activeMode === 'attendance' ? (
                              <select
                                value={participant.membership.status}
                                onChange={(changeEvent) =>
                                  void handleStatusChange(
                                    participant,
                                    changeEvent.target
                                      .value as OrganizationEventParticipant['membership']['status'],
                                  )
                                }
                                disabled={
                                  Boolean(pendingAction) || !capabilities.canUpdateAttendance
                                }
                                className={`h-9 rounded-lg border px-2 text-xs font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                  EVENT_MEMBERSHIP_STATUS_STYLES[participant.membership.status]
                                }`}
                              >
                                {Object.entries(EVENT_MEMBERSHIP_STATUS_LABELS).map(
                                  ([status, label]) => (
                                    <option key={status} value={status}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex w-max items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  EVENT_MEMBERSHIP_STATUS_STYLES[participant.membership.status]
                                }`}
                              >
                                {EVENT_MEMBERSHIP_STATUS_LABELS[participant.membership.status]}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-52 flex-wrap gap-1.5">
                              {participant.roleAssignments.length === 0 ? (
                                <span className="text-sm font-medium text-slate-400">
                                  Không có role
                                </span>
                              ) : (
                                participant.roleAssignments.map((assignment) => (
                                  <span
                                    key={assignment.id}
                                    className="inline-flex w-max items-center whitespace-nowrap rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
                                  >
                                    {ROLE_LABELS[assignment.roleKey]}
                                  </span>
                                ))
                              )}
                            </div>
                          </TableCell>
                          {activeMode === 'participants' ? (
                            <TableCell align="right">
                              <div className="flex min-w-[28rem] flex-wrap justify-end gap-2">
                                {EVENT_ROLE_KEYS.map((roleKey) => {
                                  const hasRole = participant.roleAssignments.some(
                                    (assignment) => assignment.roleKey === roleKey,
                                  );
                                  const actionId = `${hasRole ? 'revoke' : 'assign'}-${participant.uid}-${roleKey}`;
                                  const isTransfer =
                                    roleKey === 'event_lead' && !hasRole && Boolean(currentLead);

                                  return (
                                    <button
                                      key={roleKey}
                                      type="button"
                                      onClick={() => void handleRoleClick(participant, roleKey)}
                                      disabled={
                                        Boolean(pendingAction) ||
                                        participant.status !== 'active' ||
                                        (hasRole
                                          ? !capabilities.canRevokeRoles
                                          : !capabilities.canAssignRoles)
                                      }
                                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                        hasRole
                                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      {pendingAction === actionId ? (
                                        <Sharingan size={14} label="Đang cập nhật role" />
                                      ) : hasRole ? (
                                        <X className="h-3.5 w-3.5" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5" />
                                      )}
                                      {isTransfer ? 'Transfer lead' : ROLE_LABELS[roleKey]}
                                    </button>
                                  );
                                })}
                              </div>
                            </TableCell>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {transferTarget ? (
        <EventLeadTransferModal
          currentLead={currentLead}
          transferTarget={transferTarget}
          pendingAction={pendingAction}
          onCancel={() => setTransferTarget(null)}
          onConfirm={() => void handleTransferLead()}
        />
      ) : null}
    </div>
  );
}
