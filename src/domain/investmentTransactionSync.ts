import { financeDataSchema, type FinanceData, type InvestmentEntry, type Transaction } from "./models";
import { isLinkedInvestmentMovementKind, type LinkedInvestmentMovementKind } from "./investments";

export type InvestmentTransactionRepairKind =
  | "create_transaction"
  | "create_entry"
  | "link_pair"
  | "normalize_pair";

export interface InvestmentTransactionRepair {
  kind: InvestmentTransactionRepairKind;
  investmentEntryId: string;
  transactionId: string;
}

export interface InvestmentTransactionReconciliation {
  data: FinanceData;
  repairs: InvestmentTransactionRepair[];
  ambiguousEntries: number;
  ambiguousTransactions: number;
}

interface ReconciliationOptions {
  idFactory?: () => string;
  now?: () => string;
}

const defaultIdFactory = () => globalThis.crypto.randomUUID();
const defaultNow = () => new Date().toISOString();

function normalizedDescription(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function sameAmount(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.01;
}

export function investmentEntryKindForTransaction(transaction: Transaction): LinkedInvestmentMovementKind | undefined {
  if (transaction.kind === "transfer") {
    if (transaction.cashFlowDirection === "outflow") return "contribution";
    if (transaction.cashFlowDirection === "inflow") return "withdrawal";
    return undefined;
  }
  return transaction.kind === "expense" ? "contribution" : "withdrawal";
}

function transactionConflictsWithEntry(transaction: Transaction, entry: InvestmentEntry): boolean {
  return Boolean(
    (transaction.investmentId && transaction.investmentId !== entry.investmentId)
    || (transaction.investmentEntryId && transaction.investmentEntryId !== entry.id)
    || (transaction.accountId && entry.accountId && transaction.accountId !== entry.accountId)
    || transaction.propertyId
    || transaction.propertyEntryId
    || transaction.vehicleId
    || transaction.vehicleEntryId
    || transaction.sharedExpenseId,
  );
}

function transactionMatchesEntry(transaction: Transaction, entry: InvestmentEntry): boolean {
  return !transactionConflictsWithEntry(transaction, entry)
    && investmentEntryKindForTransaction(transaction) === entry.kind
    && transaction.date === entry.date
    && sameAmount(transaction.amount, entry.amount)
    && normalizedDescription(transaction.description) === normalizedDescription(entry.description)
    && transaction.categoryId === entry.categoryId
    && transaction.paymentMethodId === entry.paymentMethodId;
}

export function transactionFromInvestmentEntry(
  data: FinanceData,
  entry: InvestmentEntry,
  existing?: Transaction,
  options: ReconciliationOptions = {},
): Transaction {
  if (!isLinkedInvestmentMovementKind(entry.kind)) throw new Error("INVALID_INVESTMENT_TRANSACTION_ENTRY");
  const idFactory = options.idFactory ?? defaultIdFactory;
  const now = (options.now ?? defaultNow)();
  return {
    id: existing?.id ?? entry.transactionId ?? idFactory(),
    date: entry.date,
    dueDate: existing?.dueDate,
    description: entry.description,
    categoryId: entry.categoryId!,
    paymentMethodId: entry.paymentMethodId!,
    accountId: entry.accountId ?? existing?.accountId,
    kind: "transfer",
    cashFlowDirection: entry.kind === "contribution" ? "outflow" : "inflow",
    amount: entry.amount,
    currency: data.investments.find((item) => item.id === entry.investmentId)?.currency ?? existing?.currency ?? "EUR",
    recurringId: existing?.recurringId,
    investmentId: entry.investmentId,
    investmentEntryId: entry.id,
    shared: existing?.shared ?? false,
    planned: existing?.planned,
    sharedPaidBy: existing?.sharedPaidBy ?? "owner",
    sharedSettled: existing?.sharedSettled ?? false,
    notes: entry.notes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function investmentEntryFromTransaction(
  transaction: Transaction,
  existing?: InvestmentEntry,
  options: ReconciliationOptions = {},
): InvestmentEntry | undefined {
  const kind = investmentEntryKindForTransaction(transaction);
  if (!kind || !transaction.investmentId) return undefined;
  const idFactory = options.idFactory ?? defaultIdFactory;
  return {
    id: existing?.id ?? transaction.investmentEntryId ?? idFactory(),
    investmentId: transaction.investmentId,
    date: transaction.date,
    kind,
    amount: transaction.amount,
    quantity: existing?.kind === kind ? existing.quantity : undefined,
    description: transaction.description,
    categoryId: transaction.categoryId,
    paymentMethodId: transaction.paymentMethodId,
    accountId: transaction.accountId,
    transactionId: transaction.id,
    notes: transaction.notes,
  };
}

function sameRecord<T>(left: T, right: T): boolean {
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
  return [...keys].every((key) => Object.is(leftRecord[key], rightRecord[key]));
}

export function reconcileInvestmentTransactions(
  source: FinanceData,
  options: ReconciliationOptions = {},
): InvestmentTransactionReconciliation {
  const next = structuredClone(source);
  const idFactory = options.idFactory ?? defaultIdFactory;
  const now = options.now ?? defaultNow;
  const repairs: InvestmentTransactionRepair[] = [];
  const claimedEntryIds = new Set<string>();
  const claimedTransactionIds = new Set<string>();
  let ambiguousEntries = 0;
  let ambiguousTransactions = 0;

  const pair = (entry: InvestmentEntry, transaction: Transaction, repairKind: InvestmentTransactionRepairKind) => {
    const entryIndex = next.investmentEntries.findIndex((item) => item.id === entry.id);
    const transactionIndex = next.transactions.findIndex((item) => item.id === transaction.id);
    if (entryIndex < 0 || transactionIndex < 0) return;
    const proposedTransaction = transactionFromInvestmentEntry(next, entry, transaction, { idFactory, now });
    const stableTransaction = { ...proposedTransaction, updatedAt: transaction.updatedAt };
    const stableEntry = investmentEntryFromTransaction(stableTransaction, entry, { idFactory, now });
    if (!stableEntry) return;
    const changed = !sameRecord(entry, stableEntry) || !sameRecord(transaction, stableTransaction);
    const canonicalTransaction = changed ? proposedTransaction : stableTransaction;
    next.transactions[transactionIndex] = canonicalTransaction;
    next.investmentEntries[entryIndex] = stableEntry;
    claimedEntryIds.add(stableEntry.id);
    claimedTransactionIds.add(canonicalTransaction.id);
    if (changed) {
      repairs.push({ kind: repairKind, investmentEntryId: stableEntry.id, transactionId: canonicalTransaction.id });
    }
  };

  for (const currentEntry of [...next.investmentEntries]) {
    if (!isLinkedInvestmentMovementKind(currentEntry.kind) || currentEntry.amount <= 0) continue;
    if (!next.investments.some((item) => item.id === currentEntry.investmentId)) {
      ambiguousEntries += 1;
      continue;
    }
    const explicit = next.transactions.filter((transaction) =>
      transaction.id === currentEntry.transactionId || transaction.investmentEntryId === currentEntry.id);
    const uniqueExplicit = [...new Map(explicit.map((transaction) => [transaction.id, transaction])).values()];
    if (uniqueExplicit.length > 1 || (uniqueExplicit[0] && transactionConflictsWithEntry(uniqueExplicit[0], currentEntry))) {
      ambiguousEntries += 1;
      continue;
    }
    if (uniqueExplicit.length === 1) {
      pair(currentEntry, uniqueExplicit[0]!, "normalize_pair");
      continue;
    }
    const exactCandidates = next.transactions.filter((transaction) =>
      !claimedTransactionIds.has(transaction.id)
      && !transaction.investmentEntryId
      && transactionMatchesEntry(transaction, currentEntry));
    if (exactCandidates.length > 1) {
      ambiguousEntries += 1;
      continue;
    }
    if (exactCandidates.length === 1) {
      pair(currentEntry, exactCandidates[0]!, "link_pair");
      continue;
    }
    const transaction = transactionFromInvestmentEntry(next, currentEntry, undefined, { idFactory, now });
    next.transactions.push(transaction);
    const entryIndex = next.investmentEntries.findIndex((item) => item.id === currentEntry.id);
    next.investmentEntries[entryIndex] = { ...currentEntry, transactionId: transaction.id };
    claimedEntryIds.add(currentEntry.id);
    claimedTransactionIds.add(transaction.id);
    repairs.push({ kind: "create_transaction", investmentEntryId: currentEntry.id, transactionId: transaction.id });
  }

  for (const currentTransaction of [...next.transactions]) {
    if (claimedTransactionIds.has(currentTransaction.id)) continue;
    const kind = investmentEntryKindForTransaction(currentTransaction);
    if (!kind || currentTransaction.amount <= 0) continue;
    if (!currentTransaction.investmentId) {
      if (currentTransaction.investmentEntryId) ambiguousTransactions += 1;
      continue;
    }
    if (!next.investments.some((item) => item.id === currentTransaction.investmentId)) {
      ambiguousTransactions += 1;
      continue;
    }
    const explicitEntry = currentTransaction.investmentEntryId
      ? next.investmentEntries.find((entry) => entry.id === currentTransaction.investmentEntryId)
      : undefined;
    if (explicitEntry) {
      if (claimedEntryIds.has(explicitEntry.id) || !isLinkedInvestmentMovementKind(explicitEntry.kind) || transactionConflictsWithEntry(currentTransaction, explicitEntry)) {
        ambiguousTransactions += 1;
        continue;
      }
      pair(explicitEntry, currentTransaction, "normalize_pair");
      continue;
    }
    const exactCandidates = next.investmentEntries.filter((entry) =>
      !claimedEntryIds.has(entry.id)
      && isLinkedInvestmentMovementKind(entry.kind)
      && !entry.transactionId
      && transactionMatchesEntry(currentTransaction, entry));
    if (exactCandidates.length > 1) {
      ambiguousTransactions += 1;
      continue;
    }
    if (exactCandidates.length === 1) {
      pair(exactCandidates[0]!, currentTransaction, "link_pair");
      continue;
    }
    const entry = investmentEntryFromTransaction(currentTransaction, undefined, { idFactory, now });
    if (!entry) continue;
    next.investmentEntries.push(entry);
    const transactionIndex = next.transactions.findIndex((item) => item.id === currentTransaction.id);
    next.transactions[transactionIndex] = { ...currentTransaction, investmentEntryId: entry.id };
    claimedEntryIds.add(entry.id);
    claimedTransactionIds.add(currentTransaction.id);
    repairs.push({ kind: "create_entry", investmentEntryId: entry.id, transactionId: currentTransaction.id });
  }

  return {
    data: financeDataSchema.parse(next),
    repairs,
    ambiguousEntries,
    ambiguousTransactions,
  };
}
