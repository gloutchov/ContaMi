import type { FinanceData, Investment, InvestmentEntry, PropertyEntry, RecurringItem, SharedExpense, Transaction, VehicleEntry } from "./models";
import { isLinkedInvestmentMovementKind } from "./investments";
import { catalogUsageCount } from "./catalogUsage";
import { investmentEntryFromTransaction, transactionFromInvestmentEntry } from "./investmentTransactionSync";
import { recurringOccurrenceDate, recurringRateAt } from "./recurringRates";

export interface SharedExpenseSplit {
  id: string;
  ownerShare: number;
  partnerShare: number;
  paidBy: SharedExpense["paidBy"];
  settled: boolean;
}

export interface AutomaticSharedExpense {
  paidBy: SharedExpense["paidBy"];
  settled: boolean;
}

const nowIso = () => new Date().toISOString();
const randomUUID = () => globalThis.crypto.randomUUID();

function replaceOrAdd<T extends { id: string }>(items: T[], value: T): void {
  const index = items.findIndex((item) => item.id === value.id);
  if (index === -1) items.push(value);
  else items[index] = value;
}

function categoryName(data: FinanceData, id: string): string {
  return data.categories.find((item) => item.id === id)?.nameIt ?? "Altro";
}

function transactionForProperty(entry: PropertyEntry, existing?: Transaction): Transaction {
  const timestamp = nowIso();
  return {
    id: existing?.id ?? entry.transactionId ?? randomUUID(),
    date: entry.date,
    dueDate: entry.dueDate ?? existing?.dueDate,
    description: entry.description,
    categoryId: entry.categoryId!,
    paymentMethodId: entry.paymentMethodId!,
    accountId: entry.accountId ?? existing?.accountId,
    kind: entry.kind as "income" | "expense",
    amount: entry.amount,
    currency: existing?.currency ?? "EUR",
    recurringId: existing?.recurringId,
    propertyId: entry.propertyId,
    propertyEntryId: entry.id,
    shared: existing?.shared ?? false,
    planned: existing?.planned,
    sharedPaidBy: existing?.sharedPaidBy ?? "owner",
    sharedSettled: existing?.sharedSettled ?? false,
    notes: entry.notes,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function transactionForShared(entry: SharedExpense, existing?: Transaction): Transaction {
  const timestamp = nowIso();
  return {
    id: existing?.id ?? entry.transactionId ?? randomUUID(),
    date: entry.date,
    dueDate: existing?.dueDate,
    description: entry.description,
    categoryId: entry.categoryId,
    paymentMethodId: entry.paymentMethodId,
    accountId: entry.accountId ?? existing?.accountId,
    kind: "expense",
    amount: entry.amount,
    currency: existing?.currency ?? "EUR",
    recurringId: existing?.recurringId,
    propertyId: existing?.propertyId,
    propertyEntryId: existing?.propertyEntryId,
    investmentId: existing?.investmentId,
    investmentEntryId: existing?.investmentEntryId,
    vehicleId: existing?.vehicleId,
    vehicleEntryId: existing?.vehicleEntryId,
    sharedExpenseId: entry.id,
    planned: existing?.planned,
    shared: true,
    sharedPaidBy: entry.paidBy,
    sharedSettled: entry.settled,
    notes: entry.notes,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function transactionForVehicle(entry: VehicleEntry, existing?: Transaction): Transaction {
  const timestamp = nowIso();
  return {
    id: existing?.id ?? entry.transactionId ?? randomUUID(), date: entry.date, dueDate: existing?.dueDate, description: entry.description,
    categoryId: entry.categoryId!, paymentMethodId: entry.paymentMethodId!, accountId: entry.accountId ?? existing?.accountId,
    kind: "expense", amount: entry.amount, currency: existing?.currency ?? "EUR", recurringId: existing?.recurringId,
    vehicleId: entry.vehicleId, vehicleEntryId: entry.id, shared: existing?.shared ?? false, planned: existing?.planned,
    sharedPaidBy: existing?.sharedPaidBy ?? "owner", sharedSettled: existing?.sharedSettled ?? false,
    notes: entry.notes, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp,
  };
}

export function upsertTransactionWithLinks(data: FinanceData, value: Transaction): void {
  const previous = data.transactions.find((item) => item.id === value.id);
  const vehicleInstallment = value.recurringId
    ? data.recurringItems.find((item) => item.id === value.recurringId && item.kind === "installment" && item.vehicleId)
    : undefined;
  const transaction = {
    ...value,
    ...(vehicleInstallment ? {
      kind: "expense" as const,
      cashFlowDirection: undefined,
      vehicleId: vehicleInstallment.vehicleId,
    } : {}),
    updatedAt: nowIso(),
  };
  replaceOrAdd(data.transactions, transaction);

  const previousPropertyEntryId = previous?.propertyEntryId;
  if (previousPropertyEntryId && (!transaction.propertyId || transaction.kind === "transfer")) {
    data.propertyEntries = data.propertyEntries.filter((item) => item.id !== previousPropertyEntryId);
    transaction.propertyEntryId = undefined;
  }
  if (transaction.propertyId && transaction.kind !== "transfer") {
    const existing = data.propertyEntries.find((item) => item.id === transaction.propertyEntryId || item.transactionId === transaction.id);
    const entry: PropertyEntry = {
      ...existing,
      id: existing?.id ?? randomUUID(), propertyId: transaction.propertyId, date: transaction.date, dueDate: transaction.dueDate,
      kind: transaction.kind, category: categoryName(data, transaction.categoryId), categoryId: transaction.categoryId,
      description: transaction.description, amount: transaction.amount, paymentMethodId: transaction.paymentMethodId,
      accountId: transaction.accountId,
      transactionId: transaction.id, isCommonExpense: existing?.isCommonExpense ?? false, notes: transaction.notes,
    };
    replaceOrAdd(data.propertyEntries, entry);
    transaction.propertyEntryId = entry.id;
  }

  const previousInvestmentEntryId = previous?.investmentEntryId;
  if (previousInvestmentEntryId && (!transaction.investmentId || (transaction.kind === "transfer" && transaction.cashFlowDirection === "neutral"))) {
    data.investmentEntries = data.investmentEntries.filter((item) => item.id !== previousInvestmentEntryId);
    transaction.investmentEntryId = undefined;
  }
  if (transaction.investmentId && (transaction.kind !== "transfer" || transaction.cashFlowDirection === "inflow" || transaction.cashFlowDirection === "outflow")) {
    const existing = data.investmentEntries.find((item) => item.id === transaction.investmentEntryId || item.transactionId === transaction.id);
    const entry = investmentEntryFromTransaction(transaction, existing);
    if (entry) {
      replaceOrAdd(data.investmentEntries, entry);
      transaction.investmentEntryId = entry.id;
    }
  }

  const previousVehicleEntryId = previous?.vehicleEntryId;
  if (previousVehicleEntryId && (!transaction.vehicleId || transaction.kind !== "expense")) {
    data.vehicleEntries = data.vehicleEntries.filter((item) => item.id !== previousVehicleEntryId);
    transaction.vehicleEntryId = undefined;
  }
  if (transaction.vehicleId && transaction.kind === "expense") {
    const existing = data.vehicleEntries.find((item) => item.id === transaction.vehicleEntryId || item.transactionId === transaction.id);
    const entry: VehicleEntry = {
      id: existing?.id ?? randomUUID(), vehicleId: transaction.vehicleId, date: transaction.date,
      kind: vehicleInstallment ? "installment" : (existing?.kind ?? "other"), description: transaction.description, amount: transaction.amount,
      odometerKm: existing?.odometerKm, distanceKm: existing?.distanceKm, fuelLiters: existing?.fuelLiters,
      fuelUnitPrice: existing?.fuelUnitPrice, fuelType: existing?.fuelType, vendor: existing?.vendor,
      categoryId: transaction.categoryId, paymentMethodId: transaction.paymentMethodId, accountId: transaction.accountId,
      transactionId: transaction.id, notes: transaction.notes,
    };
    replaceOrAdd(data.vehicleEntries, entry);
    transaction.vehicleEntryId = entry.id;
  }

  const previousSharedId = previous?.sharedExpenseId;
  if (previousSharedId && !transaction.shared) {
    data.sharedExpenses = data.sharedExpenses.filter((item) => item.id !== previousSharedId);
    transaction.sharedExpenseId = undefined;
  }
  if (transaction.shared && transaction.kind === "expense") {
    const existing = data.sharedExpenses.find((item) => item.id === transaction.sharedExpenseId || item.transactionId === transaction.id);
    const ownerRatio = existing && existing.amount > 0 ? existing.ownerShare / existing.amount : 0.5;
    const ownerShare = existing && Math.abs(existing.amount - transaction.amount) <= 0.01
      ? existing.ownerShare
      : Math.round(transaction.amount * ownerRatio * 100) / 100;
    const entry: SharedExpense = {
      id: existing?.id ?? randomUUID(), date: transaction.date, description: transaction.description,
      categoryId: transaction.categoryId, paymentMethodId: transaction.paymentMethodId, accountId: transaction.accountId, amount: transaction.amount,
      ownerShare, partnerShare: existing && Math.abs(existing.amount - transaction.amount) <= 0.01
        ? existing.partnerShare
        : Math.round((transaction.amount - ownerShare) * 100) / 100,
      paidBy: transaction.sharedPaidBy ?? "owner", settled: transaction.sharedSettled ?? false, transactionId: transaction.id, notes: transaction.notes,
    };
    replaceOrAdd(data.sharedExpenses, entry);
    transaction.sharedExpenseId = entry.id;
  }
  replaceOrAdd(data.transactions, transaction);
  confirmRecurringOccurrence(data, previous, transaction);
  reconcileConfirmedRecurringEdit(data, previous, transaction);
}

export function upsertPropertyEntryWithLinks(data: FinanceData, value: PropertyEntry): void {
  const previous = data.propertyEntries.find((item) => item.id === value.id);
  replaceOrAdd(data.propertyEntries, value);
  if (value.kind === "income" || value.kind === "expense") {
    const existing = data.transactions.find((item) => item.id === value.transactionId || item.propertyEntryId === value.id);
    const transaction = transactionForProperty(value, existing);
    value.transactionId = transaction.id;
    replaceOrAdd(data.propertyEntries, value);
    upsertTransactionWithLinks(data, transaction);
  } else if (previous?.transactionId) {
    data.transactions = data.transactions.filter((item) => item.id !== previous.transactionId);
    value.transactionId = undefined;
    replaceOrAdd(data.propertyEntries, value);
  }
}

export function upsertPropertyExpenseWithLinks(data: FinanceData, value: PropertyEntry, shared?: SharedExpenseSplit): void {
  upsertPropertyEntryWithLinks(data, value);
  const transaction = data.transactions.find((item) => item.id === value.transactionId || item.propertyEntryId === value.id);
  if (!transaction) throw new Error("TRANSACTION_NOT_FOUND");
  if (shared) {
    upsertSharedExpenseWithLinks(data, {
      id: shared.id,
      date: value.date,
      description: value.description,
      categoryId: value.categoryId!,
      paymentMethodId: value.paymentMethodId!,
      accountId: value.accountId,
      amount: value.amount,
      ownerShare: shared.ownerShare,
      partnerShare: shared.partnerShare,
      paidBy: shared.paidBy,
      settled: shared.settled,
      transactionId: transaction.id,
      notes: value.notes,
    });
  } else if (transaction.shared || transaction.sharedExpenseId) {
    upsertTransactionWithLinks(data, { ...transaction, shared: false, sharedExpenseId: transaction.sharedExpenseId });
  }
}

function removeDetachedSharedExpense(data: FinanceData, transaction?: Transaction): void {
  if (!transaction) return;
  data.sharedExpenses = data.sharedExpenses.filter((item) => item.id !== transaction.sharedExpenseId && item.transactionId !== transaction.id);
}

function syncAutomaticSharedExpense(data: FinanceData, transaction: Transaction, shared?: AutomaticSharedExpense): void {
  if (shared) {
    upsertTransactionWithLinks(data, {
      ...transaction,
      shared: true,
      sharedPaidBy: shared.paidBy,
      sharedSettled: shared.settled,
    });
  } else if (transaction.shared || transaction.sharedExpenseId) {
    upsertTransactionWithLinks(data, { ...transaction, shared: false });
  }
}

export function upsertPropertyEntryWithAutomaticSharedExpense(data: FinanceData, value: PropertyEntry, shared?: AutomaticSharedExpense): void {
  const previousTransaction = data.transactions.find((item) => item.id === value.transactionId || item.propertyEntryId === value.id);
  upsertPropertyEntryWithLinks(data, value);
  const transaction = data.transactions.find((item) => item.id === value.transactionId || item.propertyEntryId === value.id);
  if (!transaction) {
    removeDetachedSharedExpense(data, previousTransaction);
    return;
  }
  syncAutomaticSharedExpense(data, transaction, shared);
}

export function upsertInvestmentEntryWithLinks(data: FinanceData, value: InvestmentEntry): void {
  const previous = data.investmentEntries.find((item) => item.id === value.id);
  replaceOrAdd(data.investmentEntries, value);
  if (isLinkedInvestmentMovementKind(value.kind)) {
    const existing = data.transactions.find((item) => item.id === value.transactionId || item.investmentEntryId === value.id);
    const transaction = transactionFromInvestmentEntry(data, value, existing);
    value.transactionId = transaction.id;
    replaceOrAdd(data.investmentEntries, value);
    upsertTransactionWithLinks(data, transaction);
  } else if (previous?.transactionId) {
    data.transactions = data.transactions.filter((item) => item.id !== previous.transactionId);
    value.transactionId = undefined;
    replaceOrAdd(data.investmentEntries, value);
  }
}

export function upsertSharedExpenseWithLinks(data: FinanceData, value: SharedExpense): void {
  const existing = data.transactions.find((item) => item.id === value.transactionId || item.sharedExpenseId === value.id);
  const transaction = transactionForShared(value, existing);
  value.transactionId = transaction.id;
  replaceOrAdd(data.sharedExpenses, value);
  upsertTransactionWithLinks(data, transaction);
}

export function upsertVehicleEntryWithLinks(data: FinanceData, value: VehicleEntry): void {
  const previous = data.vehicleEntries.find((item) => item.id === value.id);
  const existing = data.transactions.find((item) => item.id === value.transactionId || item.vehicleEntryId === value.id);
  const managedInstallment = existing?.recurringId
    ? data.recurringItems.some((item) => item.id === existing.recurringId && item.kind === "installment" && item.vehicleId === value.vehicleId)
    : false;
  const entry = managedInstallment ? { ...value, kind: "installment" as const } : value;
  replaceOrAdd(data.vehicleEntries, entry);
  if (entry.kind !== "valuation" && entry.amount > 0 && entry.categoryId && entry.paymentMethodId) {
    const transaction = transactionForVehicle(entry, existing);
    entry.transactionId = transaction.id;
    replaceOrAdd(data.vehicleEntries, entry);
    upsertTransactionWithLinks(data, transaction);
  } else if (previous?.transactionId) {
    data.transactions = data.transactions.filter((item) => item.id !== previous.transactionId);
    entry.transactionId = undefined;
    replaceOrAdd(data.vehicleEntries, entry);
  }
}

export function upsertVehicleEntryWithAutomaticSharedExpense(data: FinanceData, value: VehicleEntry, shared?: AutomaticSharedExpense): void {
  const previousTransaction = data.transactions.find((item) => item.id === value.transactionId || item.vehicleEntryId === value.id);
  upsertVehicleEntryWithLinks(data, value);
  const transaction = data.transactions.find((item) => item.id === value.transactionId || item.vehicleEntryId === value.id);
  if (!transaction) {
    removeDetachedSharedExpense(data, previousTransaction);
    return;
  }
  syncAutomaticSharedExpense(data, transaction, shared);
}

function periodicRecurring(data: FinanceData, investment: Investment, existing?: RecurringItem): RecurringItem | undefined {
  if (!investment.periodicAmount || !investment.periodicFrequency || !investment.periodicNextDueDate || !investment.periodicCategoryId || !investment.periodicPaymentMethodId) return undefined;
  const preserveBase = existing && (data.recurringRateChanges.some((item) => item.recurringId === existing.id)
    || data.transactions.some((item) => item.recurringId === existing.id && !item.planned));
  return {
    id: existing?.id ?? randomUUID(), name: investment.name, kind: "investment", direction: "expense",
    amount: preserveBase ? existing.amount : investment.periodicAmount, frequency: investment.periodicFrequency, categoryId: investment.periodicCategoryId,
    paymentMethodId: investment.periodicPaymentMethodId, accountId: investment.periodicAccountId ?? existing?.accountId,
    investmentId: investment.id, nextDueDate: investment.periodicNextDueDate,
    active: investment.active, closedAt: investment.closedAt, notes: investment.notes,
  };
}

export function syncInvestmentPlan(data: FinanceData, investment: Investment): void {
  const existing = data.recurringItems.find((item) => item.investmentId === investment.id && item.kind === "investment");
  const recurring = periodicRecurring(data, investment, existing);
  if (recurring) {
    replaceOrAdd(data.recurringItems, recurring);
    syncRecurringTransactions(data, recurring, dayOfMonth(recurring.nextDueDate));
    syncRecurringLink(data, recurring);
  }
  else if (existing) deleteLinkedEntity(data, "recurringItem", existing.id);
}

export function syncRecurringLink(data: FinanceData, recurring: RecurringItem): void {
  if (recurring.investmentId) {
    const investment = data.investments.find((item) => item.id === recurring.investmentId);
    if (investment) {
      investment.periodicAmount = recurringRateAt(data, recurring, recurring.nextDueDate);
      investment.periodicFrequency = recurring.frequency === "yearly" ? "yearly" : "monthly";
      investment.periodicNextDueDate = recurring.nextDueDate;
      investment.periodicCategoryId = recurring.categoryId;
      investment.periodicPaymentMethodId = recurring.paymentMethodId;
      investment.periodicAccountId = recurring.accountId;
    }
  }
  if (recurring.propertyId && recurring.direction === "income" && recurring.frequency === "monthly") {
    const property = data.properties.find((item) => item.id === recurring.propertyId);
    if (property) {
      property.usage = "rental";
      property.expectedMonthlyRent = recurringRateAt(data, recurring, recurring.nextDueDate);
      property.rentDueDay = Number(recurring.nextDueDate.slice(8, 10));
    }
  }
}

function addFrequency(date: Date, frequency: RecurringItem["frequency"], anchorDay = date.getUTCDate()): void {
  if (frequency === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  else {
    const monthStep = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
    const targetMonth = date.getUTCMonth() + monthStep;
    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    date.setUTCFullYear(targetYear, normalizedMonth, Math.min(anchorDay, lastDay));
  }
}

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function recurrenceAnchorDay(data: FinanceData, recurring: RecurringItem): number {
  if (recurring.frequency === "weekly") return dayOfMonth(recurring.nextDueDate);
  return Math.max(dayOfMonth(recurring.nextDueDate), ...data.transactions
    .filter((item) => item.recurringId === recurring.id)
    .map((item) => dayOfMonth(recurringOccurrenceDate(item))));
}

function confirmRecurringOccurrence(data: FinanceData, previous: Transaction | undefined, transaction: Transaction): void {
  if (!previous?.planned || transaction.planned || !transaction.recurringId) return;
  const recurring = data.recurringItems.find((item) => item.id === transaction.recurringId);
  if (!recurring) return;

  if (recurring.kind === "installment" && recurring.remainingInstallments !== undefined) {
    recurring.remainingInstallments = Math.max(0, recurring.remainingInstallments - 1);
  }
  const anchorDay = recurrenceAnchorDay(data, recurring);
  const nextPlanned = data.transactions
    .filter((item) => item.recurringId === recurring.id && item.planned)
    .sort((left, right) => recurringOccurrenceDate(left).localeCompare(recurringOccurrenceDate(right)))[0];
  recurring.nextDueDate = nextPlanned
    ? recurringOccurrenceDate(nextPlanned)
    : nextOccurrenceWithAnchor(recurringOccurrenceDate(transaction), recurring.frequency, anchorDay);

  if ((recurring.kind === "installment" && recurring.remainingInstallments === 0)
    || (recurring.endDate && recurring.nextDueDate > recurring.endDate)) {
    if (recurring.kind === "installment") recurring.remainingInstallments = 0;
    recurring.active = false;
    recurring.closedAt = transaction.date;
  }
  syncRecurringLink(data, recurring);
  syncRecurringTransactions(data, recurring, anchorDay);
}

function reconcileConfirmedRecurringEdit(data: FinanceData, previous: Transaction | undefined, transaction: Transaction): void {
  if (!previous || previous.planned || transaction.planned || !transaction.recurringId
    || previous.recurringId !== transaction.recurringId
    || recurringOccurrenceDate(previous) === recurringOccurrenceDate(transaction)) return;
  const recurring = data.recurringItems.find((item) => item.id === transaction.recurringId);
  if (!recurring) return;
  const anchorDay = recurrenceAnchorDay(data, recurring);
  recurring.nextDueDate = [recurring.nextDueDate, recurringOccurrenceDate(previous), recurringOccurrenceDate(transaction)].sort()[0]!;
  syncRecurringTransactions(data, recurring, anchorDay);
  syncRecurringLink(data, recurring);
}

function nextOccurrenceWithAnchor(date: string, frequency: RecurringItem["frequency"], anchorDay: number): string {
  const next = new Date(`${date}T12:00:00Z`);
  addFrequency(next, frequency, anchorDay);
  return next.toISOString().slice(0, 10);
}

function plannedRecurringTransactionMatches(
  existing: Transaction,
  expected: Pick<Transaction,
    "date" | "dueDate" | "description" | "categoryId" | "paymentMethodId" | "accountId" | "kind"
    | "cashFlowDirection" | "amount" | "recurringId" | "propertyId" | "investmentId" | "vehicleId" | "notes">,
): boolean {
  return existing.date === expected.date
    && existing.dueDate === expected.dueDate
    && existing.description === expected.description
    && existing.categoryId === expected.categoryId
    && existing.paymentMethodId === expected.paymentMethodId
    && existing.accountId === expected.accountId
    && existing.kind === expected.kind
    && existing.cashFlowDirection === expected.cashFlowDirection
    && Math.abs(existing.amount - expected.amount) <= 0.005
    && existing.recurringId === expected.recurringId
    && existing.propertyId === expected.propertyId
    && existing.investmentId === expected.investmentId
    && existing.vehicleId === expected.vehicleId
    && existing.notes === expected.notes;
}

export function syncRecurringTransactions(data: FinanceData, recurring: RecurringItem, anchorDayOverride?: number): void {
  const planned = data.transactions.filter((item) => item.recurringId === recurring.id && item.planned);
  if (!recurring.active) {
    for (const transaction of planned) deleteLinkedEntity(data, "transaction", transaction.id);
    return;
  }
  const cursor = new Date(`${recurring.nextDueDate}T12:00:00Z`);
  const anchorDay = anchorDayOverride ?? recurrenceAnchorDay(data, recurring);
  const yearEnd = new Date(`${data.meta.activeYear}-12-31T12:00:00Z`);
  const endDate = recurring.endDate ? new Date(`${recurring.endDate}T12:00:00Z`) : yearEnd;
  const scheduleEnd = endDate < yearEnd ? endDate : yearEnd;
  const installmentLimit = recurring.kind === "installment" ? recurring.remainingInstallments : undefined;
  const expectedDates = new Set<string>();
  let unpaidOccurrences = 0;
  let iterations = 0;
  while (cursor <= scheduleEnd && iterations < 370 && (installmentLimit === undefined || unpaidOccurrences < installmentLimit)) {
    const date = cursor.toISOString().slice(0, 10);
    if (date.startsWith(String(data.meta.activeYear))) {
      expectedDates.add(date);
      const occurrenceAmount = recurringRateAt(data, recurring, date);
      const direction = recurring.direction ?? "expense";
      const transactionKind = recurring.kind === "investment" ? "transfer" : direction;
      const cashFlowDirection = recurring.kind === "investment" ? (direction === "income" ? "inflow" : "outflow") : undefined;
      const matchingPlanned = data.transactions.filter((item) => item.recurringId === recurring.id && recurringOccurrenceDate(item) === date && item.planned);
      const existing = data.transactions.find((item) => item.recurringId === recurring.id && recurringOccurrenceDate(item) === date && !item.planned)
        ?? matchingPlanned[0]
        ?? data.transactions.find((item) => !item.recurringId && item.date === date && item.kind === transactionKind && item.cashFlowDirection === cashFlowDirection && Math.abs(item.amount - occurrenceAmount) < 0.01 && item.description.toLocaleLowerCase().includes(recurring.name.toLocaleLowerCase()));
      if (existing && !existing.planned) {
        existing.recurringId = recurring.id;
        existing.dueDate ??= date;
        if (recurring.kind === "installment" && recurring.vehicleId) {
          existing.vehicleId = recurring.vehicleId;
          upsertTransactionWithLinks(data, existing);
        }
        const propertyEntry = data.propertyEntries.find((item) => item.id === existing.propertyEntryId || item.transactionId === existing.id);
        if (propertyEntry) propertyEntry.dueDate = existing.dueDate;
        for (const duplicate of matchingPlanned) deleteLinkedEntity(data, "transaction", duplicate.id);
      } else if (existing) {
        const expected: Transaction = {
          ...existing,
          date,
          dueDate: date,
          description: recurring.name,
          categoryId: recurring.categoryId,
          paymentMethodId: recurring.paymentMethodId,
          accountId: recurring.accountId ?? existing.accountId,
          kind: transactionKind,
          cashFlowDirection,
          amount: occurrenceAmount,
          recurringId: recurring.id,
          propertyId: recurring.propertyId,
          investmentId: recurring.investmentId,
          vehicleId: recurring.vehicleId,
          notes: recurring.notes,
        };
        if (!plannedRecurringTransactionMatches(existing, expected)) {
          upsertTransactionWithLinks(data, { ...expected, updatedAt: nowIso() });
        } else if (recurring.kind === "installment" && recurring.vehicleId) {
          const vehicleEntry = data.vehicleEntries.find((item) => item.id === existing.vehicleEntryId || item.transactionId === existing.id);
          if (vehicleEntry && vehicleEntry.kind !== "installment") vehicleEntry.kind = "installment";
        }
        unpaidOccurrences += 1;
        for (const duplicate of matchingPlanned.slice(1)) deleteLinkedEntity(data, "transaction", duplicate.id);
      }
      else {
        const timestamp = nowIso();
        upsertTransactionWithLinks(data, {
          id: randomUUID(), date, dueDate: date, description: recurring.name, categoryId: recurring.categoryId,
          paymentMethodId: recurring.paymentMethodId, accountId: recurring.accountId,
          kind: transactionKind, cashFlowDirection, amount: occurrenceAmount, currency: "EUR",
          recurringId: recurring.id, propertyId: recurring.propertyId, investmentId: recurring.investmentId, vehicleId: recurring.vehicleId,
          planned: true, shared: false, sharedPaidBy: "owner", sharedSettled: false,
          notes: recurring.notes, createdAt: timestamp, updatedAt: timestamp,
        });
        unpaidOccurrences += 1;
      }
    }
    iterations += 1;
    addFrequency(cursor, recurring.frequency, anchorDay);
  }
  const stalePlanned = data.transactions.filter((item) => item.recurringId === recurring.id
    && item.planned
    && recurringOccurrenceDate(item) >= recurring.nextDueDate
    && recurringOccurrenceDate(item).startsWith(String(data.meta.activeYear))
    && !expectedDates.has(recurringOccurrenceDate(item)));
  for (const transaction of stalePlanned) deleteLinkedEntity(data, "transaction", transaction.id);
  const nextPlanned = data.transactions
    .filter((item) => item.recurringId === recurring.id && item.planned)
    .sort((left, right) => recurringOccurrenceDate(left).localeCompare(recurringOccurrenceDate(right)))[0];
  if (nextPlanned) recurring.nextDueDate = recurringOccurrenceDate(nextPlanned);
}

export function deleteLinkedEntity(data: FinanceData, entity: string, id: string): void {
  if (entity === "transaction") {
    const item = data.transactions.find((candidate) => candidate.id === id);
    if (!item) throw new Error("ENTITY_NOT_FOUND");
    data.transactions = data.transactions.filter((candidate) => candidate.id !== id);
    if (item.propertyEntryId) data.propertyEntries = data.propertyEntries.filter((candidate) => candidate.id !== item.propertyEntryId);
    if (item.investmentEntryId) data.investmentEntries = data.investmentEntries.filter((candidate) => candidate.id !== item.investmentEntryId);
    if (item.vehicleEntryId) data.vehicleEntries = data.vehicleEntries.filter((candidate) => candidate.id !== item.vehicleEntryId);
    if (item.sharedExpenseId) data.sharedExpenses = data.sharedExpenses.filter((candidate) => candidate.id !== item.sharedExpenseId);
    return;
  }
  if (entity === "propertyEntry") {
    const item = data.propertyEntries.find((candidate) => candidate.id === id);
    if (!item) throw new Error("ENTITY_NOT_FOUND");
    if (item.transactionId && data.transactions.some((candidate) => candidate.id === item.transactionId)) deleteLinkedEntity(data, "transaction", item.transactionId);
    else data.propertyEntries = data.propertyEntries.filter((candidate) => candidate.id !== id);
    return;
  }
  if (entity === "propertyWaterReading") {
    if (!data.propertyWaterReadings.some((candidate) => candidate.id === id)) throw new Error("ENTITY_NOT_FOUND");
    data.propertyWaterReadings = data.propertyWaterReadings.filter((candidate) => candidate.id !== id);
    return;
  }
  if (entity === "investmentEntry") {
    const item = data.investmentEntries.find((candidate) => candidate.id === id);
    if (!item) throw new Error("ENTITY_NOT_FOUND");
    if (item.transactionId && data.transactions.some((candidate) => candidate.id === item.transactionId)) deleteLinkedEntity(data, "transaction", item.transactionId);
    else data.investmentEntries = data.investmentEntries.filter((candidate) => candidate.id !== id);
    return;
  }
  if (entity === "sharedExpense") {
    const item = data.sharedExpenses.find((candidate) => candidate.id === id);
    if (!item) throw new Error("ENTITY_NOT_FOUND");
    if (item.transactionId && data.transactions.some((candidate) => candidate.id === item.transactionId)) deleteLinkedEntity(data, "transaction", item.transactionId);
    else data.sharedExpenses = data.sharedExpenses.filter((candidate) => candidate.id !== id);
    return;
  }
  if (entity === "vehicleEntry") {
    const item = data.vehicleEntries.find((candidate) => candidate.id === id);
    if (!item) throw new Error("ENTITY_NOT_FOUND");
    if (item.transactionId && data.transactions.some((candidate) => candidate.id === item.transactionId)) deleteLinkedEntity(data, "transaction", item.transactionId);
    else data.vehicleEntries = data.vehicleEntries.filter((candidate) => candidate.id !== id);
    return;
  }
  if (entity === "property") {
    const recurringIds = new Set(data.recurringItems.filter((item) => item.propertyId === id).map((item) => item.id));
    const entryIds = new Set(data.propertyEntries.filter((item) => item.propertyId === id).map((item) => item.id));
    const transactionIds = data.transactions.filter((item) => item.propertyId === id || (item.propertyEntryId && entryIds.has(item.propertyEntryId))).map((item) => item.id);
    transactionIds.forEach((transactionId) => deleteLinkedEntity(data, "transaction", transactionId));
    data.propertyEntries = data.propertyEntries.filter((item) => item.propertyId !== id);
    data.propertyWaterReadings = data.propertyWaterReadings.filter((item) => item.propertyId !== id);
    data.recurringItems = data.recurringItems.filter((item) => item.propertyId !== id);
    data.recurringRateChanges = data.recurringRateChanges.filter((item) => !recurringIds.has(item.recurringId));
    data.properties = data.properties.filter((item) => item.id !== id);
    data.propertyAnnualSummaries = data.propertyAnnualSummaries.filter((item) => item.propertyId !== id);
    return;
  }
  if (entity === "investment") {
    const ids = new Set([id, ...data.investments.filter((item) => item.parentInvestmentId === id).map((item) => item.id)]);
    const entryIds = new Set(data.investmentEntries.filter((item) => ids.has(item.investmentId)).map((item) => item.id));
    const transactionIds = data.transactions.filter((item) => (item.investmentId && ids.has(item.investmentId)) || (item.investmentEntryId && entryIds.has(item.investmentEntryId))).map((item) => item.id);
    transactionIds.forEach((transactionId) => deleteLinkedEntity(data, "transaction", transactionId));
    data.investmentEntries = data.investmentEntries.filter((item) => !ids.has(item.investmentId));
    const recurringIds = new Set(data.recurringItems.filter((item) => item.investmentId && ids.has(item.investmentId)).map((item) => item.id));
    data.recurringItems = data.recurringItems.filter((item) => !item.investmentId || !ids.has(item.investmentId));
    data.recurringRateChanges = data.recurringRateChanges.filter((item) => !recurringIds.has(item.recurringId));
    data.investments = data.investments.filter((item) => !ids.has(item.id));
    data.investmentAnnualSummaries = data.investmentAnnualSummaries.filter((item) => !ids.has(item.investmentId));
    return;
  }
  if (entity === "vehicle") {
    const recurringIds = new Set(data.recurringItems.filter((item) => item.vehicleId === id).map((item) => item.id));
    const entryIds = new Set(data.vehicleEntries.filter((item) => item.vehicleId === id).map((item) => item.id));
    const transactionIds = data.transactions.filter((item) => item.vehicleId === id || (item.vehicleEntryId && entryIds.has(item.vehicleEntryId))).map((item) => item.id);
    transactionIds.forEach((transactionId) => deleteLinkedEntity(data, "transaction", transactionId));
    data.vehicleEntries = data.vehicleEntries.filter((item) => item.vehicleId !== id);
    data.recurringItems = data.recurringItems.filter((item) => item.vehicleId !== id);
    data.recurringRateChanges = data.recurringRateChanges.filter((item) => !recurringIds.has(item.recurringId));
    data.vehicleAnnualSummaries = data.vehicleAnnualSummaries.filter((item) => item.vehicleId !== id);
    data.vehicles = data.vehicles.filter((item) => item.id !== id);
    return;
  }
  const collections = {
    account: data.accounts,
    recurringItem: data.recurringItems,
    category: data.categories,
    paymentMethod: data.paymentMethods,
    investmentType: data.investmentTypes,
    taxType: data.taxTypes,
  } as const;
  const collection = collections[entity as keyof typeof collections];
  if (!collection?.some((item) => item.id === id)) throw new Error("ENTITY_NOT_FOUND");
  const inUse = entity === "account" ? (
    data.transactions.some((item) => item.accountId === id || item.destinationAccountId === id)
    || data.accounts.some((item) => item.defaultFundingAccountId === id)
    || data.propertyEntries.some((item) => item.accountId === id)
    || data.investmentEntries.some((item) => item.accountId === id)
    || data.recurringItems.some((item) => item.accountId === id)
    || data.sharedExpenses.some((item) => item.accountId === id)
    || data.vehicleEntries.some((item) => item.accountId === id)
    || data.investments.some((item) => item.periodicAccountId === id)
  )
    : entity === "category" ? catalogUsageCount(data, "category", id) > 0
      : entity === "paymentMethod" ? catalogUsageCount(data, "paymentMethod", id) > 0
        : entity === "investmentType" ? data.investments.some((item) => item.typeId === id)
          : entity === "taxType" ? catalogUsageCount(data, "taxType", id) > 0
          : false;
  if (inUse) throw new Error("ENTITY_IN_USE");
  if (entity === "recurringItem") {
    const plannedIds = data.transactions.filter((item) => item.recurringId === id && item.planned).map((item) => item.id);
    plannedIds.forEach((transactionId) => deleteLinkedEntity(data, "transaction", transactionId));
    data.transactions.forEach((item) => { if (item.recurringId === id) item.recurringId = undefined; });
    data.recurringRateChanges = data.recurringRateChanges.filter((item) => item.recurringId !== id);
  }
  (collection as Array<{ id: string }>).splice((collection as Array<{ id: string }>).findIndex((item) => item.id === id), 1);
}
