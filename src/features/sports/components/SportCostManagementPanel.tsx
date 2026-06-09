'use client';

import {
  createSportCostItem,
  deleteSportCostItem,
  getSportCostManagement,
  resetSportPayment,
  updateSportCostItem,
  updateSportPayment,
} from '@/services/sports';
import type { SportCostManagement, SportPaymentStatus } from '@/features/sports/types';
import { CircleDollarSign, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface SportCostManagementPanelProps {
  gameId: string;
  canManageCosts: boolean;
  costSharingEnabled: boolean;
}

interface CostItemForm {
  label: string;
  amount: string;
}

interface PaymentForm {
  amountOverride: string;
  paymentStatus: SportPaymentStatus;
  paymentNote: string;
}

const paymentStatusLabels = {
  unpaid: 'Chưa trả',
  partial: 'Trả một phần',
  paid: 'Đã trả',
} as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(value);
}

function readAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : Number.NaN;
}

function getPaymentForms(costs: SportCostManagement): Record<string, PaymentForm> {
  return Object.fromEntries(
    costs.payments.map((payment) => [
      payment.memberId,
      {
        amountOverride:
          payment.amountOverride === null ? '' : String(Math.round(payment.amountOverride)),
        paymentStatus: payment.paymentStatus,
        paymentNote: payment.paymentNote,
      },
    ]),
  );
}

function getCostItemForms(costs: SportCostManagement): Record<string, CostItemForm> {
  return Object.fromEntries(
    costs.costItems.map((item) => [
      item.id,
      {
        label: item.label,
        amount: String(Math.round(item.amount)),
      },
    ]),
  );
}

export default function SportCostManagementPanel({
  gameId,
  canManageCosts,
  costSharingEnabled,
}: SportCostManagementPanelProps) {
  const [costs, setCosts] = useState<SportCostManagement | null>(null);
  const [newItem, setNewItem] = useState<CostItemForm>({ label: '', amount: '' });
  const [costItemForms, setCostItemForms] = useState<Record<string, CostItemForm>>({});
  const [paymentForms, setPaymentForms] = useState<Record<string, PaymentForm>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');

  const hasCosts = useMemo(() => (costs?.costItems.length ?? 0) > 0, [costs?.costItems.length]);

  const loadCosts = useCallback(async () => {
    if (!canManageCosts) {
      setCosts(null);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const nextCosts = await getSportCostManagement(gameId);
      setCosts(nextCosts);
      setCostItemForms(getCostItemForms(nextCosts));
      setPaymentForms(getPaymentForms(nextCosts));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải chia chi phí.');
      setCosts(null);
    } finally {
      setIsLoading(false);
    }
  }, [canManageCosts, gameId]);

  useEffect(() => {
    void loadCosts();
  }, [loadCosts]);

  async function runCostAction(
    actionId: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) {
    try {
      setPendingAction(actionId);
      await action();
      toast.success(successMessage, { id: `sports-cost-${actionId}-success` });
      await loadCosts();
    } catch (actionError) {
      toast.error(
        actionError instanceof Error ? actionError.message : 'Không thể cập nhật chia chi phí.',
        { id: `sports-cost-${actionId}-error` },
      );
    } finally {
      setPendingAction('');
    }
  }

  async function handleCreateCostItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const label = newItem.label.trim();
    const amount = readAmount(newItem.amount);

    if (!label || !Number.isFinite(amount) || amount < 0) {
      toast.error('Tên chi phí và số tiền phải hợp lệ.', {
        id: 'sports-cost-create-validation',
      });
      return;
    }

    await runCostAction(
      'create-item',
      () => createSportCostItem(gameId, { label, amount }),
      'Đã thêm chi phí.',
    );
    setNewItem({ label: '', amount: '' });
  }

  if (!costSharingEnabled) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Chia chi phí</h2>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Chia chi phí chưa được bật cho kèo này.
        </p>
      </section>
    );
  }

  if (!canManageCosts) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Chia chi phí</h2>
        <p className="mt-2 text-sm font-medium text-slate-600">
          Bạn không có quyền xem hoặc sửa chi phí của kèo này.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Chia chi phí</h2>
          {costs ? (
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Tổng {formatMoney(costs.totalCost)} đ · {costs.splitParticipantCount} người ·{' '}
              {formatMoney(costs.baseAmountDue)} đ/người
            </p>
          ) : null}
        </div>
        {isLoading ? <p className="text-sm font-semibold text-slate-500">Đang tải...</p> : null}
      </div>

      {error ? (
        <p className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-normal text-slate-500">Chi phí</h3>
            <form
              onSubmit={handleCreateCostItem}
              className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]"
            >
              <input
                value={newItem.label}
                onChange={(event) => setNewItem({ ...newItem, label: event.target.value })}
                placeholder="Tên chi phí"
                disabled={Boolean(pendingAction)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              <input
                type="number"
                min="0"
                step="1000"
                value={newItem.amount}
                onChange={(event) => setNewItem({ ...newItem, amount: event.target.value })}
                placeholder="Số tiền"
                disabled={Boolean(pendingAction)}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={Boolean(pendingAction)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </form>
          </div>

          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {costs?.costItems.map((item) => {
              const form = costItemForms[item.id] ?? {
                label: item.label,
                amount: String(item.amount),
              };

              return (
                <div key={item.id} className="space-y-3 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                    <input
                      value={form.label}
                      onChange={(event) =>
                        setCostItemForms({
                          ...costItemForms,
                          [item.id]: { ...form, label: event.target.value },
                        })
                      }
                      disabled={Boolean(pendingAction)}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.amount}
                      onChange={(event) =>
                        setCostItemForms({
                          ...costItemForms,
                          [item.id]: { ...form, amount: event.target.value },
                        })
                      }
                      disabled={Boolean(pendingAction)}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      Sửa cuối bởi {item.updatedByName || 'Không rõ'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void runCostAction(
                            `update-item-${item.id}`,
                            () =>
                              updateSportCostItem(gameId, item.id, {
                                label: form.label,
                                amount: readAmount(form.amount),
                              }),
                            'Đã cập nhật chi phí.',
                          )
                        }
                        disabled={Boolean(pendingAction)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runCostAction(
                            `delete-item-${item.id}`,
                            () => deleteSportCostItem(gameId, item.id),
                            'Đã xóa chi phí.',
                          )
                        }
                        disabled={Boolean(pendingAction)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!hasCosts ? (
              <p className="p-4 text-sm font-medium text-slate-500">Chưa có chi phí nào.</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-normal text-slate-500">Thanh toán</h3>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {costs?.payments.map((payment) => {
              const form = paymentForms[payment.memberId] ?? {
                amountOverride: '',
                paymentStatus: payment.paymentStatus,
                paymentNote: '',
              };

              return (
                <div key={payment.memberId} className="space-y-3 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="wrap-break-word text-sm font-bold text-slate-950">
                        {payment.participantName}
                        {payment.isGuest ? (
                          <span className="ml-2 text-xs font-bold text-slate-500">Khách</span>
                        ) : null}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        Mặc định {formatMoney(payment.amountDue)} đ · cần thu{' '}
                        {formatMoney(payment.effectiveAmountDue)} đ
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      <CircleDollarSign className="h-3.5 w-3.5" />
                      {paymentStatusLabels[payment.paymentStatus]}
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[140px_150px_1fr]">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.amountOverride}
                      onChange={(event) =>
                        setPaymentForms({
                          ...paymentForms,
                          [payment.memberId]: { ...form, amountOverride: event.target.value },
                        })
                      }
                      placeholder="Override"
                      disabled={Boolean(pendingAction)}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                    <select
                      value={form.paymentStatus}
                      onChange={(event) =>
                        setPaymentForms({
                          ...paymentForms,
                          [payment.memberId]: {
                            ...form,
                            paymentStatus: event.target.value as SportPaymentStatus,
                          },
                        })
                      }
                      disabled={Boolean(pendingAction)}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="unpaid">Chưa trả</option>
                      <option value="partial">Trả một phần</option>
                      <option value="paid">Đã trả</option>
                    </select>
                    <input
                      value={form.paymentNote}
                      onChange={(event) =>
                        setPaymentForms({
                          ...paymentForms,
                          [payment.memberId]: { ...form, paymentNote: event.target.value },
                        })
                      }
                      placeholder="Ghi chú"
                      disabled={Boolean(pendingAction)}
                      className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-slate-500">
                      {payment.updatedAt
                        ? `Sửa cuối bởi ${payment.updatedByName || 'Không rõ'}`
                        : 'Chưa có cập nhật thanh toán'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void runCostAction(
                            `update-payment-${payment.memberId}`,
                            () =>
                              updateSportPayment(gameId, payment.memberId, {
                                amountOverride: form.amountOverride
                                  ? readAmount(form.amountOverride)
                                  : null,
                                paymentStatus: form.paymentStatus,
                                paymentNote: form.paymentNote,
                              }),
                            'Đã cập nhật thanh toán.',
                          )
                        }
                        disabled={Boolean(pendingAction)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runCostAction(
                            `reset-payment-${payment.memberId}`,
                            () => resetSportPayment(gameId, payment.memberId),
                            'Đã reset thanh toán.',
                          )
                        }
                        disabled={Boolean(pendingAction)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
