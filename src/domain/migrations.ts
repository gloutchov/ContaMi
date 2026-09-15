import { DEFAULT_INVESTMENT_TYPES, DEFAULT_TAX_TYPES, investmentTypeIdForKind, taxTypeIdForLegacyDetailKind } from "./catalogDefaults";
import { financeDataSchema, type FinanceData } from "./models";

type RawRecord = Record<string, unknown>;

function list(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value.filter((item): item is RawRecord => Boolean(item) && typeof item === "object") : [];
}

function compatibleCategoryId(categories: RawRecord[], kind: "income" | "expense", name?: unknown): string {
  const normalized = typeof name === "string" ? name.trim().toLocaleLowerCase() : "";
  const named = categories.find((item) => [item.nameIt, item.nameEn].some((candidate) => typeof candidate === "string" && candidate.trim().toLocaleLowerCase() === normalized));
  const fallback = categories.find((item) => item.kind === kind || item.kind === "both");
  const id = named?.id ?? fallback?.id;
  if (typeof id !== "string") throw new Error("INVALID_WORKBOOK_SCHEMA");
  return id;
}

function migrateInvestmentCashAccounts(raw: RawRecord): void {
  const accounts = list(raw.accounts);
  const activeAccountIds = accounts
    .filter((account) => account.active === true && typeof account.id === "string")
    .map((account) => account.id as string);
  const soleActiveAccountId = activeAccountIds.length === 1 ? activeAccountIds[0] : undefined;
  const transactions = list(raw.transactions);
  const entries = list(raw.investmentEntries);
  const investments = list(raw.investments);
  const recurringItems = list(raw.recurringItems);
  const transactionById = new Map(transactions
    .filter((transaction) => typeof transaction.id === "string")
    .map((transaction) => [transaction.id as string, transaction]));
  const transactionsByEntryId = new Map<string, RawRecord[]>();
  for (const transaction of transactions) {
    if (typeof transaction.investmentEntryId !== "string") continue;
    const matches = transactionsByEntryId.get(transaction.investmentEntryId) ?? [];
    matches.push(transaction);
    transactionsByEntryId.set(transaction.investmentEntryId, matches);
  }

  for (const entry of entries) {
    if (entry.kind === "valuation") continue;
    const explicit = typeof entry.transactionId === "string"
      ? transactionById.get(entry.transactionId)
      : undefined;
    const reverseMatches = typeof entry.id === "string" ? transactionsByEntryId.get(entry.id) ?? [] : [];
    const transaction = explicit ?? (reverseMatches.length === 1 ? reverseMatches[0] : undefined);
    const accountId = typeof entry.accountId === "string"
      ? entry.accountId
      : typeof transaction?.accountId === "string"
        ? transaction.accountId
        : soleActiveAccountId;
    if (accountId) {
      entry.accountId = accountId;
      if (transaction && typeof transaction.accountId !== "string") transaction.accountId = accountId;
    }
  }

  for (const transaction of transactions) {
    if (transaction.kind !== "transfer" || typeof transaction.investmentId !== "string") continue;
    if (typeof transaction.accountId !== "string" && soleActiveAccountId) transaction.accountId = soleActiveAccountId;
  }

  const investmentById = new Map(investments
    .filter((investment) => typeof investment.id === "string")
    .map((investment) => [investment.id as string, investment]));
  for (const recurring of recurringItems) {
    if (recurring.kind !== "investment" || typeof recurring.investmentId !== "string") continue;
    const investment = investmentById.get(recurring.investmentId);
    const accountId = typeof recurring.accountId === "string"
      ? recurring.accountId
      : typeof investment?.periodicAccountId === "string"
        ? investment.periodicAccountId
        : soleActiveAccountId;
    if (accountId) {
      recurring.accountId = accountId;
      if (investment && typeof investment.periodicAccountId !== "string") investment.periodicAccountId = accountId;
    }
  }
  for (const investment of investments) {
    if (investment.periodicAmount && typeof investment.periodicAccountId !== "string" && soleActiveAccountId) {
      investment.periodicAccountId = soleActiveAccountId;
    }
  }

  raw.transactions = transactions;
  raw.investmentEntries = entries;
  raw.investments = investments;
  raw.recurringItems = recurringItems;
}

function migrateLinkedRecordAccounts(raw: RawRecord): void {
  const transactions = list(raw.transactions);
  const transactionById = new Map(transactions
    .filter((transaction) => typeof transaction.id === "string")
    .map((transaction) => [transaction.id as string, transaction]));
  const migrateCollection = (key: "propertyEntries" | "sharedExpenses" | "vehicleEntries", reverseKey: "propertyEntryId" | "sharedExpenseId" | "vehicleEntryId") => {
    const rows = list(raw[key]);
    const transactionsByEntryId = new Map<string, RawRecord[]>();
    for (const transaction of transactions) {
      const entryId = transaction[reverseKey];
      if (typeof entryId !== "string") continue;
      const matches = transactionsByEntryId.get(entryId) ?? [];
      matches.push(transaction);
      transactionsByEntryId.set(entryId, matches);
    }
    for (const row of rows) {
      const explicit = typeof row.transactionId === "string" ? transactionById.get(row.transactionId) : undefined;
      const reverseMatches = typeof row.id === "string" ? transactionsByEntryId.get(row.id) ?? [] : [];
      const transaction = explicit ?? (reverseMatches.length === 1 ? reverseMatches[0] : undefined);
      const accountId = typeof row.accountId === "string"
        ? row.accountId
        : typeof transaction?.accountId === "string"
          ? transaction.accountId
          : undefined;
      if (accountId) {
        row.accountId = accountId;
        if (transaction && typeof transaction.accountId !== "string") transaction.accountId = accountId;
      }
    }
    raw[key] = rows;
  };
  migrateCollection("propertyEntries", "propertyEntryId");
  migrateCollection("sharedExpenses", "sharedExpenseId");
  migrateCollection("vehicleEntries", "vehicleEntryId");
  raw.transactions = transactions;
}

function migrateRecurringDueDates(raw: RawRecord): void {
  const transactions = list(raw.transactions);
  const transactionById = new Map(transactions
    .filter((transaction) => typeof transaction.id === "string")
    .map((transaction) => [transaction.id as string, transaction]));
  const transactionsByPropertyEntryId = new Map(transactions
    .filter((transaction) => typeof transaction.propertyEntryId === "string")
    .map((transaction) => [transaction.propertyEntryId as string, transaction]));

  for (const transaction of transactions) {
    if (transaction.planned === true
      && typeof transaction.recurringId === "string"
      && typeof transaction.date === "string") {
      transaction.dueDate = transaction.date;
    }
  }
  const recurringItems = list(raw.recurringItems);
  for (const recurring of recurringItems) {
    if (typeof recurring.accountId === "string" || typeof recurring.id !== "string") continue;
    const accountIds = new Set(transactions
      .filter((transaction) => transaction.recurringId === recurring.id && typeof transaction.accountId === "string")
      .map((transaction) => transaction.accountId as string));
    if (accountIds.size === 1) recurring.accountId = [...accountIds][0];
  }
  const propertyEntries = list(raw.propertyEntries);
  for (const entry of propertyEntries) {
    const transaction = typeof entry.transactionId === "string"
      ? transactionById.get(entry.transactionId)
      : typeof entry.id === "string"
        ? transactionsByPropertyEntryId.get(entry.id)
        : undefined;
    if (transaction && typeof transaction.dueDate === "string") entry.dueDate = transaction.dueDate;
  }
  raw.transactions = transactions;
  raw.propertyEntries = propertyEntries;
  raw.recurringItems = recurringItems;
}

export function migrateFinanceData(rawValue: unknown): FinanceData {
  if (!rawValue || typeof rawValue !== "object") throw new Error("INVALID_WORKBOOK_SCHEMA");
  const raw = structuredClone(rawValue) as RawRecord;
  const meta = raw.meta as RawRecord | undefined;
  const version = Number(meta?.schemaVersion);
  if (version === 12) return financeDataSchema.parse(raw);
  if ((version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6 && version !== 7 && version !== 8 && version !== 9 && version !== 10 && version !== 11) || !meta) throw new Error("INVALID_WORKBOOK_SCHEMA");

  if (version === 1) {
    const categories = list(raw.categories);
    raw.investmentTypes = structuredClone(DEFAULT_INVESTMENT_TYPES);
    raw.properties = list(raw.properties).map((item) => ({ usage: "other", address: "", ...item }));
    raw.propertyEntries = list(raw.propertyEntries).map((item) => {
      const kind = item.kind === "income" ? "income" : "expense";
      return {
        ...item,
        categoryId: item.kind === "income" || item.kind === "expense" ? compatibleCategoryId(categories, kind, item.category) : undefined,
        isCommonExpense: false,
      };
    });
    raw.investments = list(raw.investments).map((item) => ({ ...item, typeId: investmentTypeIdForKind(String(item.kind)) }));
    raw.investmentEntries = list(raw.investmentEntries).map((item) => {
      const legacyKind = String(item.kind);
      const kind = legacyKind === "valuation" ? "valuation" : legacyKind === "withdrawal" || legacyKind === "income" ? "withdrawal" : "contribution";
      return {
        ...item,
        kind,
        categoryId: kind === "valuation" ? undefined : compatibleCategoryId(categories, kind === "withdrawal" ? "income" : "expense", "Investimenti"),
      };
    });
    raw.recurringItems = list(raw.recurringItems).map((item) => ({ direction: "expense", ...item }));
    raw.sharedExpenses = list(raw.sharedExpenses);
    raw.annualSummaries = list(raw.annualSummaries).map((item) => ({
      ...item,
      liquidBalance: 0,
      propertyValue: 0,
      investmentValue: Math.max(0, Number(item.closingNetWorth) || 0),
      monthlyRecurring: 0,
    }));
  }
  if (version === 1 || version === 2) {
    raw.transactions = list(raw.transactions).map((item) => ({ ...item }));
    raw.recurringItems = list(raw.recurringItems).map((item) => ({ ...item }));
    raw.vehicles = [];
    raw.vehicleEntries = [];
    raw.propertyAnnualSummaries = [];
    raw.investmentAnnualSummaries = [];
    raw.vehicleAnnualSummaries = [];
    raw.annualSummaries = list(raw.annualSummaries).map((item) => ({ pensionValue: 0, vehicleCosts: 0, ...item }));
  }
  if (version <= 3) {
    raw.taxTypes = structuredClone(DEFAULT_TAX_TYPES);
    raw.propertyEntries = list(raw.propertyEntries).map((item) => {
      const legacyDetailKind = typeof item.detailKind === "string" ? item.detailKind : "";
      const taxTypeId = taxTypeIdForLegacyDetailKind(legacyDetailKind);
      const legacyInstallment = item.taxInstallment;
      const taxInstallmentNumber = taxTypeId
        ? legacyInstallment === "second" ? 2 : 1
        : undefined;
      const migrated = { ...item };
      delete migrated.taxInstallment;
      return {
        ...migrated,
        detailKind: taxTypeId ? undefined : item.detailKind,
        taxTypeId,
        taxInstallmentNumber,
      };
    });
  }
  raw.propertyAnnualSummaries = list(raw.propertyAnnualSummaries).map((item) => ({
    phoneInternetCost: 0,
    condominiumCost: 0,
    ...item,
  }));
  if (version <= 7) {
    migrateInvestmentCashAccounts(raw);
    migrateLinkedRecordAccounts(raw);
    migrateRecurringDueDates(raw);
  }
  if (version <= 8) raw.recurringRateChanges = [];
  if (version <= 11) {
    raw.investments = list(raw.investments).map((item) => ({ ...item, isin: undefined }));
  }
  meta.schemaVersion = 12;
  return financeDataSchema.parse(raw);
}
