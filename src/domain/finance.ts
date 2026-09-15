import { financeCommandSchema, type FinanceCommand } from "./commands";
import { accountIsAvailable, resolvePaymentAccountId, transactionAccountEffects, validateAccount, validateTransactionAccounts } from "./accounts";
import { DEFAULT_INVESTMENT_TYPES, DEFAULT_TAX_TYPES } from "./catalogDefaults";
import {
  deleteLinkedEntity,
  syncInvestmentPlan,
  syncRecurringLink,
  syncRecurringTransactions,
  upsertInvestmentEntryWithLinks,
  upsertPropertyExpenseWithLinks,
  upsertPropertyEntryWithAutomaticSharedExpense,
  upsertPropertyEntryWithLinks,
  upsertSharedExpenseWithLinks,
  upsertTransactionWithLinks,
  upsertVehicleEntryWithAutomaticSharedExpense,
  upsertVehicleEntryWithLinks,
} from "./linkedRecords";
import { isInvestmentCorrectionKind, portfolioValues } from "./investments";
import type { AnnualSummary, FinanceData } from "./models";
import { financeDataSchema } from "./models";
import { repairOperationalData } from "./operationalDataRepair";
import {
  assertConfirmedRatesUnchanged,
  recurringRateChangesFor,
  sortRecurringRateChanges,
} from "./recurringRates";
import {
  normalizeVehicleInstallment,
  validateVehicleInstallment,
  vehicleHasRecordedHistory,
  vehicleInstallmentHasConfirmedHistory,
  vehicleInstallmentPlan,
  vehicleInstallmentPlans,
} from "./vehicleInstallments";

const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);
const randomUUID = () => globalThis.crypto.randomUUID();

export function createEmptyFinanceData(year = new Date().getFullYear()): FinanceData {
  const timestamp = nowIso();
  const category = (nameIt: string, nameEn: string, kind: "income" | "expense" | "both") => ({ id: randomUUID(), nameIt, nameEn, kind, active: true });
  const payment = (name: string, kind: "cash" | "card" | "bank_transfer" | "direct_debit" | "digital_wallet" | "other") => ({ id: randomUUID(), name, kind, active: true });
  return financeDataSchema.parse({
    meta: { schemaVersion: 12, activeYear: year, createdAt: timestamp, updatedAt: timestamp },
    categories: [
      category("Stipendio", "Salary", "income"), category("Affitti", "Rent income", "income"),
      category("Alimentari", "Groceries", "expense"), category("Casa", "Home", "expense"),
      category("Trasporti", "Transport", "expense"), category("Salute", "Health", "expense"),
      category("Tempo libero", "Leisure", "expense"), category("Servizi e abbonamenti", "Services & subscriptions", "expense"),
      category("Investimenti", "Investments", "both"), category("Altro", "Other", "both"),
    ],
    paymentMethods: [
      payment("Conto corrente", "bank_transfer"), payment("Carta", "card"), payment("Contanti", "cash"),
      payment("Addebito diretto", "direct_debit"), payment("Wallet digitale", "digital_wallet"),
    ],
    investmentTypes: structuredClone(DEFAULT_INVESTMENT_TYPES),
    taxTypes: structuredClone(DEFAULT_TAX_TYPES),
    accounts: [], transactions: [], properties: [], propertyEntries: [], investments: [], investmentEntries: [],
    recurringItems: [], recurringRateChanges: [], sharedExpenses: [], vehicles: [], vehicleEntries: [], annualSummaries: [],
    propertyAnnualSummaries: [], investmentAnnualSummaries: [], vehicleAnnualSummaries: [],
  });
}

function ensureUnique(collection: Array<{ id: string }>, id: string): void {
  if (collection.some((item) => item.id === id)) throw new Error("DUPLICATE_ID");
}

function replace<T extends { id: string }>(collection: T[], value: T): void {
  const index = collection.findIndex((item) => item.id === value.id);
  if (index === -1) throw new Error("ENTITY_NOT_FOUND");
  collection[index] = value;
}

function ensureExists(collection: Array<{ id: string }>, id: string): void {
  if (!collection.some((item) => item.id === id)) throw new Error("ENTITY_NOT_FOUND");
}

function ensureEditableInvestmentType(data: FinanceData, typeId: string, code: string): void {
  const current = data.investmentTypes.find((item) => item.id === typeId);
  if (code === "pension" || current?.code === "pension") throw new Error("RESERVED_INVESTMENT_TYPE");
}

function normalizedName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function ensureUniqueTaxName(data: FinanceData, name: string, excludedId?: string): void {
  const normalized = normalizedName(name);
  if (data.taxTypes.some((item) => item.id !== excludedId && normalizedName(item.name) === normalized)) {
    throw new Error("DUPLICATE_TAX_NAME");
  }
}

function ensureValidPropertyTax(data: FinanceData, entry: FinanceData["propertyEntries"][number], allowInactive: boolean): void {
  if (!entry.taxTypeId) return;
  const taxType = data.taxTypes.find((item) => item.id === entry.taxTypeId);
  if (!taxType) throw new Error("TAX_TYPE_NOT_FOUND");
  if (!allowInactive && !taxType.active) throw new Error("TAX_TYPE_INACTIVE");
  const property = data.properties.find((item) => item.id === entry.propertyId);
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  if (!allowInactive && taxType.appliesTo !== "all" && property.usage !== taxType.appliesTo) throw new Error("TAX_TYPE_NOT_APPLICABLE");
  if (taxType.installments > 1 && !entry.taxInstallmentNumber) throw new Error("INVALID_TAX_INSTALLMENT");
  if (entry.taxInstallmentNumber && entry.taxInstallmentNumber > taxType.installments) throw new Error("INVALID_TAX_INSTALLMENT");
}

function ensureEntryAccount(data: FinanceData, value: { date: string; paymentMethodId?: string; accountId?: string }, monetary: boolean, currency = "EUR"): void {
  if (!monetary) return;
  if (!value.paymentMethodId) throw new Error("PAYMENT_METHOD_NOT_FOUND");
  value.accountId = resolvePaymentAccountId(data, value.paymentMethodId, value.accountId, value.date, currency);
}

function ensureInvestmentEntryAccount(
  data: FinanceData,
  value: FinanceData["investmentEntries"][number],
  previous?: FinanceData["investmentEntries"][number],
): void {
  const investment = data.investments.find((item) => item.id === value.investmentId);
  if (!investment) throw new Error("INVESTMENT_NOT_FOUND");
  if (value.kind === "valuation") return;
  const currency = investment.currency;
  try {
    ensureEntryAccount(data, value, true, currency);
    return;
  } catch (error) {
    const unchangedLegacyReference = previous
      && previous.kind !== "valuation"
      && previous.investmentId === value.investmentId
      && previous.date === value.date
      && previous.paymentMethodId === value.paymentMethodId
      && previous.accountId === value.accountId
      && Boolean(value.paymentMethodId && value.accountId);
    if (!(error instanceof Error) || error.message !== "ACCOUNT_REQUIRED" || !unchangedLegacyReference) throw error;

    const paymentMethod = data.paymentMethods.find((item) => item.id === value.paymentMethodId);
    const account = data.accounts.find((item) => item.id === value.accountId);
    if (!paymentMethod) throw new Error("PAYMENT_METHOD_NOT_FOUND", { cause: error });
    if (!account || account.currency !== currency) throw error;
    if (paymentMethod.kind === "cash" ? account.kind !== "cash" : account.kind === "cash") {
      throw new Error("ACCOUNT_PAYMENT_METHOD_MISMATCH", { cause: error });
    }
    // Imported historical rows can legitimately predate the account interval carried into the active workbook.
    // Permit edits to their financial fields without forcing a new date/account, but never accept a new invalid reference.
    value.accountId = previous.accountId;
  }
}

function ensureInvestmentTransactionAccounts(
  data: FinanceData,
  value: FinanceData["transactions"][number],
  previous?: FinanceData["transactions"][number],
): void {
  try {
    validateTransactionAccounts(data, value);
    return;
  } catch (error) {
    const unchangedLegacyReference = previous
      && Boolean(previous.investmentId || previous.investmentEntryId)
      && previous.investmentId === value.investmentId
      && previous.investmentEntryId === value.investmentEntryId
      && previous.date === value.date
      && previous.paymentMethodId === value.paymentMethodId
      && previous.accountId === value.accountId
      && previous.destinationAccountId === value.destinationAccountId
      && previous.currency === value.currency
      && Boolean(value.accountId);
    if (!(error instanceof Error) || error.message !== "ACCOUNT_REQUIRED" || !unchangedLegacyReference) throw error;

    const paymentMethod = data.paymentMethods.find((item) => item.id === value.paymentMethodId);
    const account = data.accounts.find((item) => item.id === value.accountId);
    if (!paymentMethod) throw new Error("PAYMENT_METHOD_NOT_FOUND", { cause: error });
    if (!account || account.currency !== value.currency || value.destinationAccountId) throw error;
    if (paymentMethod.kind === "cash" ? account.kind !== "cash" : account.kind === "cash") {
      throw new Error("ACCOUNT_PAYMENT_METHOD_MISMATCH", { cause: error });
    }
  }
}

interface InvestmentAnnualMovementEffect {
  investmentId: string;
  year: number;
  contributions: number;
  withdrawals: number;
}

function investmentEntryAnnualMovementEffect(
  data: FinanceData,
  entry: FinanceData["investmentEntries"][number] | undefined,
): InvestmentAnnualMovementEffect | undefined {
  if (!entry || isInvestmentCorrectionKind(entry.kind)) return undefined;
  const transaction = entry.transactionId
    ? data.transactions.find((item) => item.id === entry.transactionId)
    : data.transactions.find((item) => item.investmentEntryId === entry.id);
  if (transaction?.planned) return undefined;
  return {
    investmentId: entry.investmentId,
    year: Number(entry.date.slice(0, 4)),
    contributions: entry.kind === "contribution" ? entry.amount : 0,
    withdrawals: entry.kind === "withdrawal" ? entry.amount : 0,
  };
}

function adjustInvestmentAnnualSummary(
  data: FinanceData,
  before: InvestmentAnnualMovementEffect | undefined,
  after: InvestmentAnnualMovementEffect | undefined,
): void {
  for (const [effect, direction] of [[before, -1], [after, 1]] as const) {
    if (!effect) continue;
    const affectedInvestmentIds = new Set([effect.investmentId]);
    let investmentId: string | undefined = effect.investmentId;
    for (let depth = 0; depth < data.investments.length && investmentId; depth += 1) {
      const parentId = data.investments.find((item) => item.id === investmentId)?.parentInvestmentId;
      if (!parentId || affectedInvestmentIds.has(parentId)) break;
      affectedInvestmentIds.add(parentId);
      investmentId = parentId;
    }
    data.investmentAnnualSummaries
      .filter((item) => affectedInvestmentIds.has(item.investmentId) && item.year === effect.year)
      .forEach((summary) => {
        if (summary.investmentId === effect.investmentId) {
          summary.contributions = Math.max(0, summary.contributions + effect.contributions * direction);
          summary.withdrawals = Math.max(0, summary.withdrawals + effect.withdrawals * direction);
        }
        summary.returnRate = undefined;
        summary.returnMethod = undefined;
        summary.returnCoverage = undefined;
        summary.returnPartialPeriod = undefined;
      });
  }
}

function linkedInvestmentEntryForTransaction(
  data: FinanceData,
  transaction: FinanceData["transactions"][number] | undefined,
) {
  if (!transaction) return undefined;
  return data.investmentEntries.find((entry) => (
    entry.id === transaction.investmentEntryId || entry.transactionId === transaction.id
  ));
}

function ensureInvestmentCorrectionTarget(
  data: FinanceData,
  value: FinanceData["investmentEntries"][number],
  previous?: FinanceData["investmentEntries"][number],
): void {
  if (!isInvestmentCorrectionKind(value.kind)) throw new Error("INVALID_INVESTMENT_CORRECTION");
  const investment = data.investments.find((item) => item.id === value.investmentId);
  if (!investment) throw new Error("INVESTMENT_NOT_FOUND");
  if (data.investments.some((item) => item.parentInvestmentId === investment.id)) throw new Error("INVESTMENT_CORRECTION_REQUIRES_LEAF");
  if (previous && (!isInvestmentCorrectionKind(previous.kind) || previous.investmentId !== value.investmentId)) {
    throw new Error("INVALID_INVESTMENT_CORRECTION");
  }
}

function updateInvestmentIsin(
  data: FinanceData,
  investmentId: string,
  isin: string | undefined,
): void {
  const investment = data.investments.find((item) => item.id === investmentId);
  if (!investment) throw new Error("INVESTMENT_NOT_FOUND");
  investment.isin = isin;
}

function ensureInvestmentPlanAccount(data: FinanceData, value: FinanceData["investments"][number]): void {
  if (!value.periodicAmount) return;
  if (!value.periodicPaymentMethodId || !value.periodicNextDueDate) throw new Error("PAYMENT_METHOD_NOT_FOUND");
  value.periodicAccountId = resolvePaymentAccountId(data, value.periodicPaymentMethodId, value.periodicAccountId, value.periodicNextDueDate, value.currency);
}

function recurringBaseAmountIsLocked(data: FinanceData, recurringId: string): boolean {
  return data.recurringRateChanges.some((item) => item.recurringId === recurringId)
    || data.transactions.some((item) => item.recurringId === recurringId && !item.planned);
}

function syncRecurringRateChange(data: FinanceData, recurringId: string): void {
  const recurring = data.recurringItems.find((item) => item.id === recurringId);
  if (!recurring) throw new Error("RECURRING_ITEM_NOT_FOUND");
  syncRecurringTransactions(data, recurring);
  syncRecurringLink(data, recurring);
}

function ensureDistinctRateMonth(data: FinanceData, recurringId: string, effectiveFrom: string, excludedId?: string): void {
  if (data.recurringRateChanges.some((item) => item.id !== excludedId
    && item.recurringId === recurringId
    && item.effectiveFrom === effectiveFrom)) throw new Error("DUPLICATE_RATE_CHANGE_MONTH");
}

function prepareVehicleInstallment(data: FinanceData, value: FinanceData["recurringItems"][number]): FinanceData["recurringItems"][number] {
  if (!value.vehicleId
    || value.kind !== "installment"
    || value.direction !== "expense"
    || value.propertyId
    || value.investmentId) throw new Error("INVALID_VEHICLE_INSTALLMENT");
  let recurring = normalizeVehicleInstallment(data, value);
  const vehicle = data.vehicles.find((item) => item.id === recurring.vehicleId)!;
  recurring = {
    ...recurring,
    active: vehicle.active && recurring.remainingInstallments !== 0,
    closedAt: vehicle.active && recurring.remainingInstallments !== 0
      ? undefined
      : (recurring.closedAt ?? vehicle.disposalDate ?? todayIso()),
  };
  recurring.accountId = resolvePaymentAccountId(data, recurring.paymentMethodId, recurring.accountId, recurring.nextDueDate);
  return recurring;
}

function syncVehicleInstallmentLifecycle(data: FinanceData, vehicleId: string, reopen: boolean): void {
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");
  const selected = vehicleInstallmentPlan(data, vehicleId);
  for (const current of vehicleInstallmentPlans(data, vehicleId)) {
    const recurring = normalizeVehicleInstallment(data, current);
    if (!vehicle.active) {
      recurring.active = false;
      recurring.closedAt ??= vehicle.disposalDate ?? todayIso();
    } else if (reopen && current.id === selected?.id && current.remainingInstallments !== 0
      && (!current.endDate || current.endDate >= todayIso())) {
      recurring.active = true;
      recurring.closedAt = undefined;
    }
    replace(data.recurringItems, recurring);
    syncRecurringTransactions(data, recurring);
  }
}

function cancelVehicleInstallment(data: FinanceData, vehicleId: string): void {
  const recurring = vehicleInstallmentPlan(data, vehicleId);
  if (!recurring) return;
  if (!vehicleInstallmentHasConfirmedHistory(data, recurring.id)) {
    deleteLinkedEntity(data, "recurringItem", recurring.id);
    return;
  }
  recurring.active = false;
  recurring.closedAt = todayIso();
  recurring.remainingInstallments = 0;
  syncRecurringTransactions(data, recurring);
}

function saveVehicleWithInstallment(
  data: FinanceData,
  value: Extract<FinanceCommand, { type: "addVehicleWithInstallment" | "updateVehicleWithInstallment" }>["value"],
  update: boolean,
): void {
  if (update) replace(data.vehicles, value.vehicle);
  else {
    ensureUnique(data.vehicles, value.vehicle.id);
    data.vehicles.push(value.vehicle);
  }
  if (!value.installment) {
    if (update) cancelVehicleInstallment(data, value.vehicle.id);
    return;
  }
  const recurring = prepareVehicleInstallment(data, value.installment);
  const previous = data.recurringItems.find((item) => item.id === recurring.id);
  if (previous && previous.vehicleId !== value.vehicle.id) throw new Error("INVALID_VEHICLE_INSTALLMENT");
  if (previous && Math.abs(previous.amount - recurring.amount) > 0.005
    && recurringBaseAmountIsLocked(data, previous.id)) throw new Error("RECURRING_BASE_AMOUNT_LOCKED");
  validateVehicleInstallment(data, recurring, previous?.id);
  if (previous) replace(data.recurringItems, recurring);
  else {
    ensureUnique(data.recurringItems, recurring.id);
    data.recurringItems.push(recurring);
  }
  syncRecurringTransactions(data, recurring, Number(recurring.nextDueDate.slice(8, 10)));
}

function applyFinanceCommandInPlace(next: FinanceData, command: FinanceCommand): void {
  switch (command.type) {
    case "addTransaction": {
      ensureUnique(next.transactions, command.value.id);
      ensureInvestmentTransactionAccounts(next, command.value);
      upsertTransactionWithLinks(next, command.value);
      const transaction = next.transactions.find((item) => item.id === command.value.id);
      adjustInvestmentAnnualSummary(next, undefined, investmentEntryAnnualMovementEffect(next, linkedInvestmentEntryForTransaction(next, transaction)));
      break;
    }
    case "updateTransaction": {
      const previousTransaction = next.transactions.find((item) => item.id === command.value.id);
      if (!previousTransaction) throw new Error("ENTITY_NOT_FOUND");
      const before = investmentEntryAnnualMovementEffect(next, linkedInvestmentEntryForTransaction(next, previousTransaction));
      ensureInvestmentTransactionAccounts(next, command.value, previousTransaction);
      upsertTransactionWithLinks(next, command.value);
      const transaction = next.transactions.find((item) => item.id === command.value.id);
      adjustInvestmentAnnualSummary(next, before, investmentEntryAnnualMovementEffect(next, linkedInvestmentEntryForTransaction(next, transaction)));
      break;
    }
    case "addAccount": ensureUnique(next.accounts, command.value.id); validateAccount(next, command.value); next.accounts.push(command.value); break;
    case "updateAccount": validateAccount(next, command.value); replace(next.accounts, command.value); break;
    case "addProperty": ensureUnique(next.properties, command.value.id); next.properties.push(command.value); break;
    case "updateProperty": replace(next.properties, command.value); break;
    case "addPropertyEntry":
      ensureUnique(next.propertyEntries, command.value.id);
      if (!next.properties.some((item) => item.id === command.value.propertyId)) throw new Error("PROPERTY_NOT_FOUND");
      ensureValidPropertyTax(next, command.value, false);
      ensureEntryAccount(next, command.value, command.value.kind === "income" || command.value.kind === "expense");
      upsertPropertyEntryWithLinks(next, command.value); break;
    case "addPropertyRentRecurring": {
      ensureUnique(next.propertyEntries, command.value.entry.id);
      ensureUnique(next.recurringItems, command.value.recurring.id);
      const property = next.properties.find((item) => item.id === command.value.entry.propertyId);
      if (!property) throw new Error("PROPERTY_NOT_FOUND");
      if (property.usage !== "rental") throw new Error("PROPERTY_NOT_RENTAL");
      ensureEntryAccount(next, command.value.entry, true);
      command.value.recurring.accountId = resolvePaymentAccountId(next, command.value.recurring.paymentMethodId, command.value.recurring.accountId, command.value.recurring.nextDueDate);
      command.value.entry.dueDate = command.value.recurring.nextDueDate;
      upsertPropertyEntryWithLinks(next, command.value.entry);
      next.recurringItems.push(command.value.recurring);
      const transaction = next.transactions.find((item) => item.id === command.value.entry.transactionId || item.propertyEntryId === command.value.entry.id);
      if (transaction) {
        transaction.recurringId = command.value.recurring.id;
        transaction.dueDate = command.value.recurring.nextDueDate;
      }
      syncRecurringLink(next, command.value.recurring);
      syncRecurringTransactions(next, command.value.recurring, Number(command.value.recurring.nextDueDate.slice(8, 10)));
      break;
    }
    case "updatePropertyEntry":
      ensureExists(next.propertyEntries, command.value.id);
      ensureValidPropertyTax(next, command.value, true);
      ensureEntryAccount(next, command.value, command.value.kind === "income" || command.value.kind === "expense");
      upsertPropertyEntryWithLinks(next, command.value); break;
    case "addPropertyEntryWithSharedExpense":
      ensureUnique(next.propertyEntries, command.value.entry.id);
      if (!next.properties.some((item) => item.id === command.value.entry.propertyId)) throw new Error("PROPERTY_NOT_FOUND");
      ensureValidPropertyTax(next, command.value.entry, false);
      ensureEntryAccount(next, command.value.entry, command.value.entry.kind === "income" || command.value.entry.kind === "expense");
      upsertPropertyEntryWithAutomaticSharedExpense(next, command.value.entry, command.value.shared); break;
    case "updatePropertyEntryWithSharedExpense":
      ensureExists(next.propertyEntries, command.value.entry.id);
      ensureValidPropertyTax(next, command.value.entry, true);
      ensureEntryAccount(next, command.value.entry, command.value.entry.kind === "income" || command.value.entry.kind === "expense");
      upsertPropertyEntryWithAutomaticSharedExpense(next, command.value.entry, command.value.shared); break;
    case "addPropertyExpense":
      ensureUnique(next.propertyEntries, command.value.entry.id);
      if (!next.properties.some((item) => item.id === command.value.entry.propertyId)) throw new Error("PROPERTY_NOT_FOUND");
      if (command.value.shared) ensureUnique(next.sharedExpenses, command.value.shared.id);
      ensureValidPropertyTax(next, command.value.entry, false);
      ensureEntryAccount(next, command.value.entry, true);
      upsertPropertyExpenseWithLinks(next, command.value.entry, command.value.shared); break;
    case "updatePropertyExpense":
      ensureExists(next.propertyEntries, command.value.entry.id);
      ensureValidPropertyTax(next, command.value.entry, true);
      ensureEntryAccount(next, command.value.entry, true);
      upsertPropertyExpenseWithLinks(next, command.value.entry, command.value.shared); break;
    case "addInvestment":
      ensureUnique(next.investments, command.value.id); ensureInvestmentPlanAccount(next, command.value); next.investments.push(command.value); syncInvestmentPlan(next, command.value); break;
    case "addInvestmentWithInitialContribution":
      ensureUnique(next.investments, command.value.investment.id);
      ensureUnique(next.investmentEntries, command.value.initialContribution.id);
      ensureInvestmentPlanAccount(next, command.value.investment);
      ensureEntryAccount(next, command.value.initialContribution, true, command.value.investment.currency);
      next.investments.push(command.value.investment);
      syncInvestmentPlan(next, command.value.investment);
      upsertInvestmentEntryWithLinks(next, command.value.initialContribution);
      adjustInvestmentAnnualSummary(next, undefined, investmentEntryAnnualMovementEffect(next, command.value.initialContribution));
      break;
    case "updateInvestment": {
      ensureInvestmentPlanAccount(next, command.value);
      const existingPlan = next.recurringItems.find((item) => item.investmentId === command.value.id && item.kind === "investment");
      const previous = next.investments.find((item) => item.id === command.value.id);
      if (existingPlan && previous?.periodicAmount !== command.value.periodicAmount
        && recurringBaseAmountIsLocked(next, existingPlan.id)) throw new Error("RECURRING_BASE_AMOUNT_LOCKED");
      replace(next.investments, command.value); syncInvestmentPlan(next, command.value); break;
    }
    case "addInvestmentEntry":
      ensureUnique(next.investmentEntries, command.value.id);
      if (!next.investments.some((item) => item.id === command.value.investmentId)) throw new Error("INVESTMENT_NOT_FOUND");
      ensureInvestmentEntryAccount(next, command.value);
      upsertInvestmentEntryWithLinks(next, command.value);
      adjustInvestmentAnnualSummary(next, undefined, investmentEntryAnnualMovementEffect(next, command.value));
      break;
    case "updateInvestmentEntry": {
      const previous = next.investmentEntries.find((item) => item.id === command.value.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      const before = investmentEntryAnnualMovementEffect(next, previous);
      ensureInvestmentEntryAccount(next, command.value, previous);
      upsertInvestmentEntryWithLinks(next, command.value);
      adjustInvestmentAnnualSummary(next, before, investmentEntryAnnualMovementEffect(next, command.value));
      break;
    }
    case "addInvestmentCorrection":
      ensureUnique(next.investmentEntries, command.value.id);
      ensureInvestmentCorrectionTarget(next, command.value);
      next.investmentEntries.push(command.value);
      break;
    case "updateInvestmentCorrection": {
      const previous = next.investmentEntries.find((item) => item.id === command.value.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      ensureInvestmentCorrectionTarget(next, command.value, previous);
      replace(next.investmentEntries, command.value);
      break;
    }
    case "addInvestmentCorrectionWithIsin":
      ensureUnique(next.investmentEntries, command.value.correction.id);
      ensureInvestmentCorrectionTarget(next, command.value.correction);
      next.investmentEntries.push(command.value.correction);
      updateInvestmentIsin(next, command.value.correction.investmentId, command.value.isin);
      break;
    case "updateInvestmentCorrectionWithIsin": {
      const previous = next.investmentEntries.find((item) => item.id === command.value.correction.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      ensureInvestmentCorrectionTarget(next, command.value.correction, previous);
      replace(next.investmentEntries, command.value.correction);
      updateInvestmentIsin(next, command.value.correction.investmentId, command.value.isin);
      break;
    }
    case "addRecurringItem": {
      ensureUnique(next.recurringItems, command.value.id);
      const recurring = command.value.vehicleId ? prepareVehicleInstallment(next, command.value) : command.value;
      if (recurring.vehicleId) validateVehicleInstallment(next, recurring);
      recurring.accountId = resolvePaymentAccountId(next, recurring.paymentMethodId, recurring.accountId, recurring.nextDueDate);
      next.recurringItems.push(recurring);
      syncRecurringLink(next, recurring);
      syncRecurringTransactions(next, recurring, Number(recurring.nextDueDate.slice(8, 10)));
      break;
    }
    case "updateRecurringItem": {
      const previous = next.recurringItems.find((item) => item.id === command.value.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      if (previous.vehicleId && previous.vehicleId !== command.value.vehicleId) throw new Error("INVALID_VEHICLE_INSTALLMENT");
      const recurring = command.value.vehicleId ? prepareVehicleInstallment(next, command.value) : command.value;
      if (recurring.vehicleId) validateVehicleInstallment(next, recurring, recurring.id);
      if (Math.abs(previous.amount - recurring.amount) > 0.005
        && recurringBaseAmountIsLocked(next, command.value.id)) throw new Error("RECURRING_BASE_AMOUNT_LOCKED");
      recurring.accountId = resolvePaymentAccountId(next, recurring.paymentMethodId, recurring.accountId, recurring.nextDueDate);
      replace(next.recurringItems, recurring); syncRecurringLink(next, recurring); syncRecurringTransactions(next, recurring, Number(recurring.nextDueDate.slice(8, 10))); break;
    }
    case "addRecurringRateChange": {
      ensureUnique(next.recurringRateChanges, command.value.id);
      ensureExists(next.recurringItems, command.value.recurringId);
      ensureDistinctRateMonth(next, command.value.recurringId, command.value.effectiveFrom);
      const candidate = [...recurringRateChangesFor(next, command.value.recurringId), command.value]
        .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));
      assertConfirmedRatesUnchanged(next, command.value.recurringId, candidate);
      next.recurringRateChanges = sortRecurringRateChanges([...next.recurringRateChanges, command.value]);
      syncRecurringRateChange(next, command.value.recurringId);
      break;
    }
    case "updateRecurringRateChange": {
      const previous = next.recurringRateChanges.find((item) => item.id === command.value.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      if (previous.recurringId !== command.value.recurringId) throw new Error("INVALID_RATE_CHANGE_RECURRING_ITEM");
      ensureDistinctRateMonth(next, command.value.recurringId, command.value.effectiveFrom, command.value.id);
      const candidate = recurringRateChangesFor(next, command.value.recurringId)
        .map((item) => item.id === command.value.id ? command.value : item)
        .sort((left, right) => left.effectiveFrom.localeCompare(right.effectiveFrom));
      assertConfirmedRatesUnchanged(next, command.value.recurringId, candidate);
      next.recurringRateChanges = sortRecurringRateChanges(next.recurringRateChanges
        .map((item) => item.id === command.value.id ? command.value : item));
      syncRecurringRateChange(next, command.value.recurringId);
      break;
    }
    case "deleteRecurringRateChange": {
      const previous = next.recurringRateChanges.find((item) => item.id === command.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      const candidate = recurringRateChangesFor(next, previous.recurringId).filter((item) => item.id !== previous.id);
      assertConfirmedRatesUnchanged(next, previous.recurringId, candidate);
      next.recurringRateChanges = next.recurringRateChanges.filter((item) => item.id !== previous.id);
      syncRecurringRateChange(next, previous.recurringId);
      break;
    }
    case "addSharedExpense": ensureUnique(next.sharedExpenses, command.value.id); ensureEntryAccount(next, command.value, true); upsertSharedExpenseWithLinks(next, command.value); break;
    case "updateSharedExpense": ensureExists(next.sharedExpenses, command.value.id); ensureEntryAccount(next, command.value, true); upsertSharedExpenseWithLinks(next, command.value); break;
    case "addVehicle": ensureUnique(next.vehicles, command.value.id); next.vehicles.push(command.value); break;
    case "updateVehicle": {
      const previous = next.vehicles.find((item) => item.id === command.value.id);
      if (!previous) throw new Error("ENTITY_NOT_FOUND");
      replace(next.vehicles, command.value);
      syncVehicleInstallmentLifecycle(next, command.value.id, !previous.active && command.value.active);
      break;
    }
    case "addVehicleWithInstallment": saveVehicleWithInstallment(next, command.value, false); break;
    case "updateVehicleWithInstallment": saveVehicleWithInstallment(next, command.value, true); break;
    case "addVehicleEntry":
      ensureUnique(next.vehicleEntries, command.value.id);
      if (!next.vehicles.some((item) => item.id === command.value.vehicleId)) throw new Error("VEHICLE_NOT_FOUND");
      ensureEntryAccount(next, command.value, command.value.kind !== "valuation" && command.value.amount > 0);
      upsertVehicleEntryWithLinks(next, command.value); break;
    case "updateVehicleEntry": ensureExists(next.vehicleEntries, command.value.id); ensureEntryAccount(next, command.value, command.value.kind !== "valuation" && command.value.amount > 0); upsertVehicleEntryWithLinks(next, command.value); break;
    case "addVehicleEntryWithSharedExpense":
      ensureUnique(next.vehicleEntries, command.value.entry.id);
      if (!next.vehicles.some((item) => item.id === command.value.entry.vehicleId)) throw new Error("VEHICLE_NOT_FOUND");
      ensureEntryAccount(next, command.value.entry, command.value.entry.kind !== "valuation" && command.value.entry.amount > 0);
      upsertVehicleEntryWithAutomaticSharedExpense(next, command.value.entry, command.value.shared); break;
    case "updateVehicleEntryWithSharedExpense":
      ensureExists(next.vehicleEntries, command.value.entry.id);
      ensureEntryAccount(next, command.value.entry, command.value.entry.kind !== "valuation" && command.value.entry.amount > 0);
      upsertVehicleEntryWithAutomaticSharedExpense(next, command.value.entry, command.value.shared); break;
    case "addCategory": ensureUnique(next.categories, command.value.id); next.categories.push(command.value); break;
    case "updateCategory": replace(next.categories, command.value); break;
    case "addPaymentMethod": ensureUnique(next.paymentMethods, command.value.id); next.paymentMethods.push(command.value); break;
    case "updatePaymentMethod": replace(next.paymentMethods, command.value); break;
    case "addInvestmentType":
      ensureEditableInvestmentType(next, command.value.id, command.value.code);
      ensureUnique(next.investmentTypes, command.value.id); next.investmentTypes.push(command.value); break;
    case "updateInvestmentType":
      ensureEditableInvestmentType(next, command.value.id, command.value.code);
      replace(next.investmentTypes, command.value); break;
    case "addTaxType":
      ensureUniqueTaxName(next, command.value.name);
      ensureUnique(next.taxTypes, command.value.id);
      next.taxTypes.push(command.value); break;
    case "updateTaxType":
      ensureUniqueTaxName(next, command.value.name, command.value.id);
      if (next.propertyEntries.some((item) => item.taxTypeId === command.value.id && (item.taxInstallmentNumber ?? 1) > command.value.installments)) {
        throw new Error("INVALID_TAX_INSTALLMENT");
      }
      replace(next.taxTypes, command.value); break;
    case "deleteEntity":
      if (command.entity === "investmentType") {
        const type = next.investmentTypes.find((item) => item.id === command.id);
        if (type?.code === "pension") throw new Error("RESERVED_INVESTMENT_TYPE");
      }
      if (command.entity === "vehicle" && vehicleHasRecordedHistory(next, command.id)) throw new Error("ENTITY_IN_USE");
      if (command.entity === "recurringItem"
        && next.recurringItems.some((item) => item.id === command.id && item.vehicleId && item.kind === "installment")) {
        throw new Error("VEHICLE_INSTALLMENT_MANAGED");
      }
      {
        const entry = command.entity === "investmentEntry"
          ? next.investmentEntries.find((item) => item.id === command.id)
          : command.entity === "transaction"
            ? linkedInvestmentEntryForTransaction(next, next.transactions.find((item) => item.id === command.id))
            : undefined;
        const before = investmentEntryAnnualMovementEffect(next, entry);
        deleteLinkedEntity(next, command.entity, command.id);
        adjustInvestmentAnnualSummary(next, before, undefined);
      }
      break;
    case "setActive": {
      if (command.entity === "taxType") {
        const item = next.taxTypes.find((candidate) => candidate.id === command.id);
        if (!item) throw new Error("ENTITY_NOT_FOUND");
        item.active = command.active;
      } else if (command.entity === "recurringItem") {
        const item = next.recurringItems.find((candidate) => candidate.id === command.id);
        if (!item) throw new Error("ENTITY_NOT_FOUND");
        if (item.vehicleId && item.kind === "installment") throw new Error("VEHICLE_INSTALLMENT_MANAGED");
        item.active = command.active;
        item.closedAt = command.active ? undefined : (command.closedAt ?? todayIso());
        syncRecurringTransactions(next, item);
      } else if (command.entity === "investment") {
        const item = next.investments.find((candidate) => candidate.id === command.id);
        if (!item) throw new Error("ENTITY_NOT_FOUND");
        const linkedIds = new Set([item.id]);
        for (let pass = 0; pass < next.investments.length; pass += 1) {
          let changed = false;
          next.investments.forEach((candidate) => {
            if (candidate.parentInvestmentId && linkedIds.has(candidate.parentInvestmentId) && !linkedIds.has(candidate.id)) {
              linkedIds.add(candidate.id); changed = true;
            }
          });
          if (!changed) break;
        }
        next.investments.filter((candidate) => linkedIds.has(candidate.id)).forEach((candidate) => {
          candidate.active = command.active;
          candidate.closedAt = command.active ? undefined : (command.closedAt ?? todayIso());
        });
        next.recurringItems.filter((candidate) => candidate.investmentId && linkedIds.has(candidate.investmentId) && candidate.kind === "investment").forEach((recurring) => {
          recurring.active = command.active;
          recurring.closedAt = command.active ? undefined : (command.closedAt ?? todayIso());
          syncRecurringTransactions(next, recurring);
        });
      } else if (command.entity === "vehicle") {
        const item = next.vehicles.find((candidate) => candidate.id === command.id);
        if (!item) throw new Error("ENTITY_NOT_FOUND");
        item.active = command.active;
        item.disposalDate = command.active ? undefined : (command.closedAt ?? todayIso());
        syncVehicleInstallmentLifecycle(next, item.id, command.active);
      } else {
        const collection = command.entity === "account" ? next.accounts : next.properties;
        const item = collection.find((candidate) => candidate.id === command.id);
        if (!item) throw new Error("ENTITY_NOT_FOUND");
        item.active = command.active;
        item.closedAt = command.active ? undefined : (command.closedAt ?? todayIso());
      }
      break;
    }
    case "setSharedExpenseSettled": {
      const item = next.sharedExpenses.find((candidate) => candidate.id === command.id);
      if (!item) throw new Error("SHARED_EXPENSE_NOT_FOUND");
      item.settled = command.settled;
      const transaction = next.transactions.find((candidate) => candidate.id === item.transactionId);
      if (transaction) transaction.sharedSettled = command.settled;
      break;
    }
    case "settleSharedExpenseMonth":
      next.sharedExpenses.filter((item) => item.date.startsWith(command.month)).forEach((item) => {
        item.settled = command.settled;
        const transaction = next.transactions.find((candidate) => candidate.id === item.transactionId);
        if (transaction) transaction.sharedSettled = command.settled;
      });
      break;
  }
}

export function applyFinanceCommands(data: FinanceData, commands: readonly FinanceCommand[]): FinanceData {
  const next = structuredClone(data);
  for (const rawCommand of commands) {
    applyFinanceCommandInPlace(next, financeCommandSchema.parse(rawCommand));
  }
  const repaired = repairOperationalData(next);
  repaired.data.meta.updatedAt = nowIso();
  return financeDataSchema.parse(repaired.data);
}

export function applyFinanceCommand(data: FinanceData, command: FinanceCommand): FinanceData {
  return applyFinanceCommands(data, [command]);
}

export const monthlyAmount = (amount: number, frequency: "weekly" | "monthly" | "quarterly" | "yearly") => ({
  weekly: amount * 52 / 12, monthly: amount, quarterly: amount / 3, yearly: amount / 12,
})[frequency];

export interface HistoricalMetric {
  year: number;
  netWorth: number;
  liquidBalance: number;
  propertyValue: number;
  investmentValue: number;
  income: number;
  expenses: number;
  monthlyRecurring: number;
}

export interface DashboardMetrics {
  netWorth: number; netWorthExcludingProperties: number; liquidBalance: number; cashRegisterBalance: number; propertyValue: number; investmentValue: number; pensionValue: number;
  yearIncome: number; yearExpenses: number; monthlyRecurring: number; sharedBalance: number;
  propertyIncome: number; propertyExpenses: number;
  months: Array<{ month: string; income: number; expenses: number }>;
  categories: Array<{ id: string; nameIt: string; nameEn: string; amount: number }>;
  history: HistoricalMetric[];
}

export function transactionCashTotals(items: readonly FinanceData["transactions"][number][]) {
  return items.reduce((totals, item) => {
    if (item.kind === "income" || (item.kind === "transfer" && item.cashFlowDirection === "inflow")) {
      totals.inflows += item.amount;
    } else if (item.kind === "expense" || (item.kind === "transfer" && item.cashFlowDirection === "outflow")) {
      totals.outflows += item.amount;
    }
    totals.net = totals.inflows - totals.outflows;
    return totals;
  }, { inflows: 0, outflows: 0, net: 0 });
}

export function accountOpeningBalance(data: FinanceData, throughDate?: string): number {
  return data.accounts
    .filter((account) => !throughDate || account.openedAt <= throughDate)
    .reduce((sum, account) => sum + account.openingBalance, 0);
}

export type TransactionAccountGroup = "account" | "cashRegister";

export interface TransactionAccountTotals {
  inflows: number;
  outflows: number;
  net: number;
  openingBalance: number;
  balance: number;
}

function accountBelongsToGroup(account: FinanceData["accounts"][number], group: TransactionAccountGroup): boolean {
  return group === "cashRegister" ? account.kind === "cash" : account.kind !== "cash";
}

export function transactionAccountTotals(
  data: FinanceData,
  items: readonly FinanceData["transactions"][number][],
  group: TransactionAccountGroup,
  options: { includePlanned?: boolean; includeOpeningBalance?: boolean; openingThroughDate?: string } = {},
): TransactionAccountTotals {
  const accounts = new Map(data.accounts.map((account) => [account.id, account]));
  const openingBalance = data.accounts
    .filter((account) => accountBelongsToGroup(account, group))
    .filter((account) => !options.openingThroughDate || account.openedAt <= options.openingThroughDate)
    .reduce((sum, account) => sum + account.openingBalance, 0);
  let inflows = 0;
  let outflows = 0;
  for (const item of items) {
    for (const effect of transactionAccountEffects(item, { includePlanned: options.includePlanned })) {
      const account = accounts.get(effect.accountId);
      if (!account || !accountBelongsToGroup(account, group) || !accountIsAvailable(account, item.date)) continue;
      if (effect.amount >= 0) inflows += effect.amount;
      else outflows += Math.abs(effect.amount);
    }
  }
  const net = inflows - outflows;
  const balance = (options.includeOpeningBalance === false ? 0 : openingBalance) + net;
  return { inflows, outflows, net, openingBalance, balance };
}

export function computeDashboard(data: FinanceData): DashboardMetrics {
  const year = String(data.meta.activeYear);
  let yearIncome = 0;
  let yearExpenses = 0;
  const accountMovements = new Map<string, number>();
  const categoryExpenses = new Map<string, number>();
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: `${year}-${String(index + 1).padStart(2, "0")}`,
    income: 0,
    expenses: 0,
  }));
  for (const item of data.transactions) {
    if (item.planned) continue;
    for (const effect of transactionAccountEffects(item)) {
      const account = data.accounts.find((candidate) => candidate.id === effect.accountId);
      if (account && accountIsAvailable(account, item.date)) {
        accountMovements.set(effect.accountId, (accountMovements.get(effect.accountId) ?? 0) + effect.amount);
      }
    }
    if (!item.date.startsWith(year)) continue;
    const month = months[Number(item.date.slice(5, 7)) - 1];
    if (item.kind === "income") {
      yearIncome += item.amount;
      if (month) month.income += item.amount;
    } else if (item.kind === "expense") {
      yearExpenses += item.amount;
      if (month) month.expenses += item.amount;
      categoryExpenses.set(item.categoryId, (categoryExpenses.get(item.categoryId) ?? 0) + item.amount);
    }
  }
  const liquidBalance = accountOpeningBalance(data) + data.accounts.reduce((sum, account) => sum + (accountMovements.get(account.id) ?? 0), 0);
  const cashRegisterBalance = data.accounts
    .filter((account) => account.kind === "cash")
    .reduce((sum, account) => sum + account.openingBalance + (accountMovements.get(account.id) ?? 0), 0);
  const latestPropertyValues = new Map<string, { date: string; amount: number }>();
  let propertyIncome = 0;
  let propertyExpenses = 0;
  for (const item of data.propertyEntries) {
    if (item.kind === "valuation") {
      const current = latestPropertyValues.get(item.propertyId);
      if (!current || item.date > current.date) latestPropertyValues.set(item.propertyId, { date: item.date, amount: item.amount });
    }
    if (!item.date.startsWith(year)) continue;
    if (data.transactions.find((transaction) => transaction.id === item.transactionId)?.planned) continue;
    if (item.kind === "income") propertyIncome += item.amount;
    else if (item.kind === "expense") propertyExpenses += item.amount;
  }
  const propertyValue = data.properties.filter((item) => item.active)
    .reduce((sum, item) => sum + ((latestPropertyValues.get(item.id)?.amount ?? 0) || item.purchasePrice) * item.ownershipShare, 0);
  const { investments: investmentValue, pensions: pensionValue, combined: combinedInvestmentValue } = portfolioValues(data);
  const monthlyRecurring = data.recurringItems.filter((item) => item.active && item.direction !== "income").reduce((sum, item) => sum + monthlyAmount(item.amount, item.frequency), 0);
  const sharedBalance = data.sharedExpenses.filter((item) => !item.settled).reduce((sum, item) => item.paidBy === "owner" ? sum + item.partnerShare : sum - item.ownerShare, 0);
  const categories = data.categories.map((category) => ({
    id: category.id, nameIt: category.nameIt, nameEn: category.nameEn,
    amount: categoryExpenses.get(category.id) ?? 0,
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 6);
  const netWorth = liquidBalance + propertyValue + combinedInvestmentValue;
  const netWorthExcludingProperties = netWorth - propertyValue;
  const history = [
    ...data.annualSummaries.map((item) => ({ year: item.year, netWorth: item.closingNetWorth, liquidBalance: item.liquidBalance, propertyValue: item.propertyValue, investmentValue: item.investmentValue, income: item.income, expenses: item.expenses, monthlyRecurring: item.monthlyRecurring })),
    { year: data.meta.activeYear, netWorth, liquidBalance, propertyValue, investmentValue: combinedInvestmentValue, income: yearIncome, expenses: yearExpenses, monthlyRecurring },
  ].sort((a, b) => a.year - b.year);
  return { netWorth, netWorthExcludingProperties, liquidBalance, cashRegisterBalance, propertyValue, investmentValue, pensionValue, yearIncome, yearExpenses, monthlyRecurring, sharedBalance, propertyIncome, propertyExpenses, months, categories, history };
}

export function createAnnualSummary(data: FinanceData): AnnualSummary {
  const metrics = computeDashboard(data);
  return {
    year: data.meta.activeYear, income: metrics.yearIncome, expenses: metrics.yearExpenses,
    netCashFlow: metrics.yearIncome - metrics.yearExpenses, closingNetWorth: metrics.netWorth,
    liquidBalance: metrics.liquidBalance, propertyValue: metrics.propertyValue,
    investmentValue: metrics.investmentValue, pensionValue: metrics.pensionValue, monthlyRecurring: metrics.monthlyRecurring,
    vehicleCosts: data.vehicleEntries.filter((item) => item.date.startsWith(String(data.meta.activeYear)) && item.kind !== "valuation").reduce((sum, item) => sum + item.amount, 0),
  };
}
