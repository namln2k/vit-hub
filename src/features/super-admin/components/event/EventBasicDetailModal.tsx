import {
  formatDateTime,
  getPersonName,
} from '@/features/super-admin/components/event/eventManagementUtils';
import {
  formatOrganizationEventApiError,
  getOrganizationEventBasicDetail,
  type OrganizationEvent,
  type OrganizationEventBasicDetail,
} from '@/services/organizationAdmin';
import Avatar from '@/shared/layout/Avatar';
import Sharingan from '@/shared/loading/Sharingan';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EventBasicDetailModalProps {
  event: OrganizationEvent;
  onClose: () => void;
}

export default function EventBasicDetailModal({ event, onClose }: EventBasicDetailModalProps) {
  const [detail, setDetail] = useState<OrganizationEventBasicDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError('');

      try {
        const nextDetail = await getOrganizationEventBasicDetail(event.id, true);

        if (isMounted) {
          setDetail(nextDetail);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(formatOrganizationEventApiError(loadError, 'Không thể tải basic event detail.'));
          setDetail(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [event.id]);

  const visibleEvent = detail?.event ?? event;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-basic-detail-title"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="event-basic-detail-title" className="text-lg font-bold text-slate-950">
              Basic event detail
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{visibleEvent.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center">
              <Sharingan size={34} label="Đang tải basic event detail" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <EventDetailField label="Owner scope" value={visibleEvent.ownerScopeName} />
                <EventDetailField label="Thời gian" value={formatDateTime(visibleEvent.startsAt)} />
                <EventDetailField
                  label="Kết thúc"
                  value={visibleEvent.endsAt ? formatDateTime(visibleEvent.endsAt) : 'Chưa đặt'}
                />
                <EventDetailField
                  label="Địa điểm"
                  value={visibleEvent.publicLocation || 'Chưa đặt'}
                />
              </div>

              {visibleEvent.publicDescription ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Mô tả công khai
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                    {visibleEvent.publicDescription}
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border border-slate-200">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-bold text-slate-950">Participants</p>
                  {!detail.capabilities.canViewPrivate ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      Public data only
                    </span>
                  ) : null}
                </div>
                {!detail.capabilities.canShowParticipants ? (
                  <p className="px-4 py-4 text-sm font-semibold text-amber-700">
                    Danh sách participant đang ẩn khỏi basic event views.
                  </p>
                ) : detail.participants.length === 0 ? (
                  <p className="px-4 py-4 text-sm font-medium text-slate-500">
                    Chưa có participant hiển thị.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {detail.participants.map((participant) => (
                      <div key={participant.uid} className="flex items-center gap-3 px-4 py-3">
                        <Avatar src={participant.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {getPersonName(participant)}
                          </p>
                          {'email' in participant && participant.email ? (
                            <p className="truncate text-xs font-medium text-slate-500">
                              {participant.email}
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-amber-700">
                              Contact restricted
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-bold text-slate-950">Private management data</p>
                {detail.capabilities.canViewPrivate ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
                    {visibleEvent.internalNotes || 'Không có ghi chú nội bộ.'}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-amber-700">
                    Ghi chú nội bộ và dữ liệu vận hành bị ẩn theo quyền event.view_private.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EventDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
