import type { ExpenseSchedule } from "./commands";
import { deleteLinkedEntity, syncRecurringTransactions } from "./linkedRecords";
import type { FinanceData, RecurringItem, Transaction } from "./models";
import { recurringOccurrenceDate } from "./recurringRates";
import { validatePaymentAccount } from "./accounts";

/** Explicit linking replaces a planned placeholder, never another confirmed payment. */
export function prepareExpenseOccurrence(data: FinanceData, transaction: Transaction): Transaction | undefined {
  if (!transaction.recurringId) return;
  const recurring = data.recurringItems.find((item) => item.id === transaction.recurringId);
  if (!recurring || (recurring.direction ?? "expense") !== "expense" || recurring.kind === "investment"
    || transaction.kind !== "expense" || transaction.investmentId) throw new Error("INVALID_EXPENSE_RECURRENCE");
  if (!transaction.dueDate) throw new Error("INVALID_EXPENSE_RECURRENCE");
  const duplicates = data.transactions.filter((item) => item.id !== transaction.id
    && item.recurringId === recurring.id && recurringOccurrenceDate(item) === transaction.dueDate);
  if (duplicates.some((item) => !item.planned)) throw new Error("DUPLICATE_RECURRING_OCCURRENCE");
  for (const item of duplicates) deleteLinkedEntity(data, "transaction", item.id);
  return duplicates[0];
}

export function syncExplicitExpenseLink(data: FinanceData, transaction: Transaction, previousRecurringId?: string): void {
  if (transaction.kind !== "expense" || transaction.investmentId || !transaction.recurringId || transaction.recurringId === previousRecurringId) return;
  const recurring = data.recurringItems.find((item) => item.id === transaction.recurringId)!;
  syncRecurringTransactions(data, recurring);
}

/** Called inside the same cloned-data command as the first recorded expense. */
export function createExpenseSchedule(data: FinanceData, transaction: Transaction, schedule: ExpenseSchedule): void {
  if (data.recurringItems.some((item) => item.id === schedule.id)) throw new Error("DUPLICATE_ID");
  if (transaction.kind !== "expense" || transaction.investmentId || transaction.recurringId) throw new Error("INVALID_EXPENSE_RECURRENCE");
  validatePaymentAccount(data, transaction.paymentMethodId, transaction.accountId, schedule.nextDueDate, transaction.currency);
  const shared = data.sharedExpenses.find((item) => item.transactionId === transaction.id);
  const recurring: RecurringItem = {
    ...schedule, name: transaction.description, kind: "other", direction: "expense",
    amount: transaction.amount, categoryId: transaction.categoryId, paymentMethodId: transaction.paymentMethodId,
    accountId: transaction.accountId, propertyId: transaction.propertyId, vehicleId: transaction.vehicleId,
    shared: transaction.shared, sharedPaidBy: transaction.sharedPaidBy ?? "owner",
    sharedOwnerRatio: shared ? shared.ownerShare / shared.amount : 0.5,
    active: true, notes: transaction.notes,
  };
  // Generic vehicle expenses are not financing plans.
  data.recurringItems.push(recurring);
  transaction.recurringId = recurring.id;
  transaction.dueDate = schedule.nextDueDate;
  const propertyEntry = data.propertyEntries.find((item) => item.transactionId === transaction.id);
  if (propertyEntry) propertyEntry.dueDate = transaction.dueDate;
  syncRecurringTransactions(data, recurring, Number(schedule.nextDueDate.slice(8, 10)));
}

export function confirmedSharedExpenses(data: FinanceData): FinanceData["sharedExpenses"] {
  const planned = new Set(data.transactions.filter((item) => item.planned).map((item) => item.id));
  return data.sharedExpenses.filter((item) => !item.transactionId || !planned.has(item.transactionId));
}
