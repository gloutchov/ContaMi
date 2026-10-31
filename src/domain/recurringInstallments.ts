import type { FinanceData, RecurringItem, Transaction } from "./models";
import { recurringOccurrenceDate } from "./recurringRates";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const monthSteps = { monthly: 1, quarterly: 3, yearly: 12 } as const;
const utcDate = (date: string) => new Date(`${date}T12:00:00Z`);
const monthsBetween = (first: Date, last: Date) => (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth();

function installmentCount(recurring: RecurringItem, transactions: readonly Transaction[]): number | undefined {
  if (!recurring.active || recurring.kind !== "installment" || recurring.remainingInstallments === 0) return 0;
  if (!recurring.endDate) return recurring.remainingInstallments;
  if (recurring.nextDueDate > recurring.endDate) return 0;
  const first = utcDate(recurring.nextDueDate);
  const last = utcDate(recurring.endDate);
  const anchorDay = transactions.reduce((day, item) => Math.max(day, Number(recurringOccurrenceDate(item).slice(8, 10))), first.getUTCDate());
  const dateAtMonthOffset = (offset: number): string => {
    if (offset === 0) return recurring.nextDueDate;
    const date = new Date(first);
    date.setUTCDate(1);
    date.setUTCMonth(first.getUTCMonth() + offset);
    const monthEnd = new Date(date);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(anchorDay, monthEnd.getUTCDate()));
    return date.toISOString().slice(0, 10);
  };
  let scheduledCount: number;
  const isScheduledDate = (date: string): boolean => {
    if (date < recurring.nextDueDate || date > recurring.endDate!) return false;
    const value = utcDate(date);
    if (recurring.frequency === "weekly") return (value.getTime() - first.getTime()) % WEEK_MS === 0;
    const offset = monthsBetween(first, value);
    return offset % monthSteps[recurring.frequency] === 0 && dateAtMonthOffset(offset) === date;
  };
  if (recurring.frequency === "weekly") scheduledCount = Math.floor((last.getTime() - first.getTime()) / WEEK_MS) + 1;
  else {
    const step = monthSteps[recurring.frequency];
    const lastOffset = Math.floor(monthsBetween(first, last) / step) * step;
    scheduledCount = lastOffset / step + 1 - Number(dateAtMonthOffset(lastOffset) > recurring.endDate);
  }
  const confirmedDates = new Set(transactions.filter((item) => !item.planned)
    .map(recurringOccurrenceDate).filter(isScheduledDate));
  const remainingThroughEnd = Math.max(0, scheduledCount - confirmedDates.size);
  return recurring.remainingInstallments === undefined
    ? remainingThroughEnd
    : Math.min(recurring.remainingInstallments, remainingThroughEnd);
}

/** Read-only counts through the entire plan, independent of the workbook's active year. */
export function summarizeRecurringInstallments(
  data: Pick<FinanceData, "transactions">,
  rows: readonly RecurringItem[],
) {
  const byRecurring = new Map<string, Transaction[]>();
  for (const transaction of data.transactions) {
    if (!transaction.recurringId) continue;
    const entries = byRecurring.get(transaction.recurringId) ?? [];
    entries.push(transaction);
    byRecurring.set(transaction.recurringId, entries);
  }
  const plans = rows.filter((item) => item.active && item.kind === "installment").map((item) => ({
    item, remaining: installmentCount(item, byRecurring.get(item.id) ?? []),
  }));
  const unknownCount = plans.filter((plan) => plan.remaining === undefined).length;
  return {
    total: unknownCount ? undefined : plans.reduce((sum, plan) => sum + (plan.remaining ?? 0), 0),
    unknownCount,
    plans: plans.filter((plan) => plan.remaining === undefined || plan.remaining > 0),
  };
}
