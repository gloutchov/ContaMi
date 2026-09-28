import { randomUUID } from "node:crypto";
import { accountBalance } from "./accounts";
import { createAnnualSummary, createEmptyFinanceData } from "./finance";
import {
  createInvestmentAnnualSummaries,
  createPropertyAnnualSummaries,
  createVehicleAnnualSummaries,
  propertyAnnualSummariesWithLateIncome,
} from "./annualHistory";
import { investmentReturnSeries } from "./assetReturns";
import { investmentUnitBalance, isInvestmentCorrectionKind, ROLLOVER_OPENING_VALUATION_DESCRIPTION } from "./investments";
import { recurrenceAnchorDay, syncRecurringLink, syncRecurringTransactions, upsertTransactionWithLinks } from "./linkedRecords";
import type { FinanceData, InvestmentEntry, PropertyEntry, RecurringItem } from "./models";

function latestEntry<T extends PropertyEntry | InvestmentEntry>(entries: T[], id: string, foreignKey: "propertyId" | "investmentId"): T | undefined {
  return entries
    .filter((entry) => entry[foreignKey as keyof T] === id && entry.kind === "valuation")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function advanceRecurringDate(date: Date, frequency: RecurringItem["frequency"], anchorDay: number): void {
  if (frequency === "weekly") {
    date.setUTCDate(date.getUTCDate() + 7);
    return;
  }
  const monthStep = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const targetMonth = date.getUTCMonth() + monthStep;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  date.setUTCFullYear(targetYear, normalizedMonth, Math.min(anchorDay, lastDay));
}

function advanceDueDate(date: string, frequency: RecurringItem["frequency"], year: number, anchorDay: number): string {
  const threshold = new Date(Date.UTC(year, 0, 1));
  const current = new Date(`${date}T00:00:00Z`);
  while (current < threshold) advanceRecurringDate(current, frequency, anchorDay);
  return current.toISOString().slice(0, 10);
}

export function createRolloverFinanceData(current: FinanceData, nextYear = current.meta.activeYear + 1): FinanceData {
  if (nextYear <= current.meta.activeYear) throw new Error("INVALID_ROLLOVER_YEAR");
  const next = createEmptyFinanceData(nextYear);
  next.categories = structuredClone(current.categories);
  next.paymentMethods = structuredClone(current.paymentMethods);
  next.investmentTypes = structuredClone(current.investmentTypes);
  next.taxTypes = structuredClone(current.taxTypes);
  next.accounts = current.accounts.filter((item) => item.active).map((item) => ({
    ...structuredClone(item), openingBalance: accountBalance(current, item.id), closedAt: undefined,
  }));
  const activeAccountIds = new Set(next.accounts.map((item) => item.id));
  next.accounts.forEach((item) => {
    if (item.defaultFundingAccountId && !activeAccountIds.has(item.defaultFundingAccountId)) item.defaultFundingAccountId = undefined;
  });
  next.properties = structuredClone(current.properties.filter((item) => item.active));
  next.investments = structuredClone(current.investments.filter((item) => item.active));
  next.vehicles = structuredClone(current.vehicles.filter((item) => item.active));
  const nextVehicleIds = new Set(next.vehicles.map((item) => item.id));
  const recurrenceAnchors = new Map(current.recurringItems.map((item) => [item.id, recurrenceAnchorDay(current, item)]));
  next.recurringItems = current.recurringItems
    .filter((item) => item.active
      && item.remainingInstallments !== 0
      && (!item.endDate || item.endDate >= `${nextYear}-01-01`)
      && (!item.vehicleId || nextVehicleIds.has(item.vehicleId)))
    .map((item) => ({
      ...structuredClone(item),
      nextDueDate: advanceDueDate(item.nextDueDate, item.frequency, nextYear, recurrenceAnchors.get(item.id)!),
    }));
  const nextRecurringIds = new Set(next.recurringItems.map((item) => item.id));
  next.recurringRateChanges = structuredClone(current.recurringRateChanges
    .filter((item) => nextRecurringIds.has(item.recurringId)));
  const nextPropertyIds = new Set(next.properties.map((item) => item.id));
  const yearStart = `${nextYear}-01-01`;
  current.transactions
    .filter((transaction) => transaction.planned
      && transaction.recurringId
      && nextRecurringIds.has(transaction.recurringId)
      && current.recurringItems.some((item) => item.id === transaction.recurringId && item.kind === "rent")
      && transaction.propertyId
      && nextPropertyIds.has(transaction.propertyId)
      && (transaction.dueDate ?? transaction.date) < yearStart)
    .forEach((transaction) => {
      upsertTransactionWithLinks(next, {
        ...structuredClone(transaction),
        propertyEntryId: undefined,
        accountId: transaction.accountId && activeAccountIds.has(transaction.accountId) ? transaction.accountId : undefined,
      });
      const recurring = next.recurringItems.find((item) => item.id === transaction.recurringId)!;
      recurring.nextDueDate = [recurring.nextDueDate, transaction.dueDate ?? transaction.date].sort()[0]!;
    });
  next.recurringItems.forEach((item) => {
    syncRecurringTransactions(next, item, recurrenceAnchors.get(item.id));
    syncRecurringLink(next, item);
  });
  next.sharedExpenses = structuredClone(current.sharedExpenses.filter((item) => !item.settled));
  next.annualSummaries = [...structuredClone(current.annualSummaries), createAnnualSummary(current)];
  next.propertyAnnualSummaries = [...propertyAnnualSummariesWithLateIncome(current), ...createPropertyAnnualSummaries(current)];
  const currentInvestmentSummaries = createInvestmentAnnualSummaries(current).map((summary) => {
    const investment = current.investments.find((item) => item.id === summary.investmentId);
    const point = investment
      ? investmentReturnSeries(current, investment, `${current.meta.activeYear}-12-31`).annual
        .find((candidate) => candidate.year === current.meta.activeYear)
      : undefined;
    if (!point) return summary;
    return {
      ...summary,
      returnRate: point.rate,
      returnMethod: point.coverage === "estimated" ? "original_dietz_estimate" as const : "linked_modified_dietz" as const,
      returnCoverage: point.coverage,
      returnPartialPeriod: point.partialPeriod,
    };
  });
  next.investmentAnnualSummaries = [...structuredClone(current.investmentAnnualSummaries), ...currentInvestmentSummaries];
  next.vehicleAnnualSummaries = [...structuredClone(current.vehicleAnnualSummaries), ...createVehicleAnnualSummaries(current)];
  for (const property of next.properties) {
    const entry = latestEntry(current.propertyEntries, property.id, "propertyId");
    if (entry) next.propertyEntries.push({ ...structuredClone(entry), id: randomUUID(), date: `${nextYear}-01-01`, description: ROLLOVER_OPENING_VALUATION_DESCRIPTION });
  }
  for (const investment of next.investments) {
    const entry = latestEntry(current.investmentEntries.filter((candidate) => candidate.kind === "valuation"
      || candidate.kind === "contribution" || candidate.kind === "withdrawal"), investment.id, "investmentId");
    if (entry) next.investmentEntries.push({ ...structuredClone(entry), id: randomUUID(), date: `${nextYear}-01-01`, description: ROLLOVER_OPENING_VALUATION_DESCRIPTION });
    const quantity = investmentUnitBalance(current, investment.id);
    if (quantity !== undefined) next.investmentEntries.push({
      id: randomUUID(), investmentId: investment.id, date: `${nextYear}-01-01`, kind: "unit_snapshot",
      amount: 0, quantity, description: "Opening unit balance / Saldo iniziale quote", notes: "",
    });
  }
  const nextInvestmentIds = new Set(next.investments.map((item) => item.id));
  next.investmentEntries.push(...structuredClone(current.investmentEntries.filter((entry) => (
    nextInvestmentIds.has(entry.investmentId) && isInvestmentCorrectionKind(entry.kind)
  ))));
  next.meta.updatedAt = new Date().toISOString();
  return next;
}
