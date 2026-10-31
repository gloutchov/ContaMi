import type { FinanceData, SharedExpense } from "./models";

/** Both explicit link directions are supported, including older workbook rows. */
export function plannedSharedExpenseIds(data: Pick<FinanceData, "transactions" | "sharedExpenses">): Set<string> {
  const plannedTransactions = data.transactions.filter((item) => item.planned);
  const transactionIds = new Set(plannedTransactions.map((item) => item.id));
  const sharedIds = new Set(plannedTransactions.flatMap((item) => item.sharedExpenseId ? [item.sharedExpenseId] : []));
  for (const expense of data.sharedExpenses) {
    if (expense.transactionId && transactionIds.has(expense.transactionId)) sharedIds.add(expense.id);
  }
  return sharedIds;
}

export function confirmedSharedExpenses(data: FinanceData): SharedExpense[] {
  const plannedIds = plannedSharedExpenseIds(data);
  return data.sharedExpenses.filter((item) => !plannedIds.has(item.id));
}

/** Summarize the selected rows in integer cents, keeping forecasts separate from actual debts. */
export function summarizeSharedExpenses(data: FinanceData, rows: readonly SharedExpense[] = data.sharedExpenses) {
  const plannedIds = plannedSharedExpenseIds(data);
  const confirmed = rows.filter((item) => !plannedIds.has(item.id));
  const pending = confirmed.filter((item) => !item.settled);
  const cents = (amount: number) => Math.round(amount * 100);
  const totalCents = rows.reduce((sum, item) => sum + cents(item.amount), 0);
  const confirmedTotalCents = confirmed.reduce((sum, item) => sum + cents(item.amount), 0);
  return {
    plannedIds,
    pending,
    total: totalCents / 100,
    confirmedTotal: confirmedTotalCents / 100,
    plannedTotal: (totalCents - confirmedTotalCents) / 100,
    balance: pending.reduce((sum, item) => sum + (item.paidBy === "owner" ? cents(item.partnerShare) : -cents(item.ownerShare)), 0) / 100,
    settledTotal: confirmed.filter((item) => item.settled).reduce((sum, item) => sum + cents(item.amount), 0) / 100,
    settledCount: confirmed.length - pending.length,
  };
}
