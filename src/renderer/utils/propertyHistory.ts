import { createPropertyAnnualSummaries } from "../../domain/annualHistory";
import type { FinanceData, Property, PropertyEntry } from "../../domain/models";
import { detailEntryMonths, filterDatedEntries } from "./detailFilters";

export function calculatePropertyValuation(property: Property | undefined, mode: "total" | "sqm", totalValue: number, valuePerSqm: number): number {
  return mode === "sqm" ? valuePerSqm * (property?.areaSqm ?? 0) : totalValue;
}

export function propertyHistory(data: FinanceData, propertyId: string) {
  const current = createPropertyAnnualSummaries(data).find((item) => item.propertyId === propertyId);
  const byYear = new Map(data.propertyAnnualSummaries.filter((item) => item.propertyId === propertyId).map((item) => [item.year, item]));
  const hasCurrentEntries = (data.propertyEntries.some((item) => item.propertyId === propertyId
    && item.date.startsWith(String(data.meta.activeYear))
    && !data.transactions.find((transaction) => transaction.id === item.transactionId)?.planned))
    || data.propertyWaterReadings.some((item) => item.propertyId === propertyId
      && item.periodStart.startsWith(String(data.meta.activeYear)));
  if (current && hasCurrentEntries) byYear.set(current.year, current);
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export const propertyConsumptionHistory = propertyHistory;

export function propertyValueTimeline(data: FinanceData, propertyId: string) {
  const property = data.properties.find((item) => item.id === propertyId);
  const detailedYears = new Set(data.propertyEntries.filter((item) => item.propertyId === propertyId && item.kind === "valuation").map((item) => item.date.slice(0, 4)));
  const byDate = new Map<string, number>();
  if (property?.purchaseDate && property.purchasePrice > 0) byDate.set(property.purchaseDate, property.purchasePrice);
  data.propertyAnnualSummaries
    .filter((item) => item.propertyId === propertyId && !detailedYears.has(String(item.year)))
    .forEach((item) => byDate.set(`${item.year}-12-31`, item.closingValue));
  data.propertyEntries
    .filter((item) => item.propertyId === propertyId && item.kind === "valuation")
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((item) => byDate.set(item.date, item.amount));
  return [...byDate].sort(([left], [right]) => left.localeCompare(right)).map(([date, commercialValue]) => ({ date, commercialValue }));
}

export function propertyCashFlowTimeline(data: FinanceData, propertyId: string) {
  const confirmedEntries = data.propertyEntries.filter((item) => item.propertyId === propertyId
    && (item.kind === "income" || item.kind === "expense")
    && !data.transactions.find((transaction) => transaction.id === item.transactionId)?.planned);
  const detailedYears = new Set(confirmedEntries.map((item) => item.date.slice(0, 4)));
  const byDate = new Map<string, { income: number; expenses: number }>();
  data.propertyAnnualSummaries
    .filter((item) => item.propertyId === propertyId && !detailedYears.has(String(item.year)))
    .forEach((item) => byDate.set(`${item.year}-12-31`, { income: item.income, expenses: item.expenses }));
  confirmedEntries
    .forEach((item) => {
      const point = byDate.get(item.date) ?? { income: 0, expenses: 0 };
      point[item.kind === "income" ? "income" : "expenses"] += item.amount;
      byDate.set(item.date, point);
    });
  return [...byDate].sort(([left], [right]) => left.localeCompare(right)).map(([date, values]) => ({ date, ...values }));
}

export function propertyEntryMonths(year: number): string[] {
  return detailEntryMonths(year);
}

export function filterPropertyEntries(entries: PropertyEntry[], month: string, search: string): PropertyEntry[] {
  return filterDatedEntries(entries, month, search, (item) => `${item.description} ${item.category}`);
}
