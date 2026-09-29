import { isCondominiumCost, propertyConsumptionQuantity, propertyUtilityKind } from "./propertyMetrics";
import type { FinanceData, Property, PropertyAnnualSummary, PropertyEntry, PropertyWaterReading, Transaction } from "./models";
import { propertyWaterConsumption } from "./propertyWater";

export type PropertyReportScope = "current-year" | "lifetime";

export const PROPERTY_REPORT_DETAIL_LIMIT = 2_000;

export interface PropertyReportUtilityTotals {
  electricityCost: number;
  electricityConsumption: number;
  gasCost: number;
  gasConsumption: number;
  waterCost: number;
  waterConsumption: number;
  phoneInternetCost: number;
  condominiumColdWaterConsumption: number;
  condominiumHotWaterConsumption: number;
  condominiumWaterCost: number;
}

export interface PropertyReportPeriod extends PropertyReportUtilityTotals {
  key: string;
  income: number;
  expenses: number;
  condominiumCost: number;
  marketValue?: number;
  historicalAggregate: boolean;
}

export interface PropertyReportMovement {
  date: string;
  dueDate?: string;
  kind: "income" | "expense";
  category: string;
  description: string;
  amount: number;
}

export interface PropertyReportForecastExpense {
  date: string;
  description: string;
  amount: number;
}

export interface PropertyReportOwnerAllocation {
  name: string;
  share: number;
  actualExpenses: number;
  forecastExpenses: number;
  projectedExpenses: number;
  marketValue: number;
}

export interface PropertyReport {
  property: Property;
  scope: PropertyReportScope;
  activeYear: number;
  asOf: string;
  periodGranularity: "month" | "year";
  periods: PropertyReportPeriod[];
  costTrend: Array<{ year: number; expenses: number }>;
  condominiumMovements: PropertyReportMovement[];
  totalCondominiumMovementCount: number;
  condominiumMovementsTruncated: boolean;
  movements: PropertyReportMovement[];
  totalMovementCount: number;
  movementsTruncated: boolean;
  forecastExpenses: PropertyReportForecastExpense[];
  totalForecastExpenseCount: number;
  forecastExpensesTruncated: boolean;
  actualIncome: number;
  actualExpenses: number;
  forecastExpenseTotal: number;
  projectedExpenseTotal: number;
  currentMarketValue: number;
  ownerAllocations: [PropertyReportOwnerAllocation, PropertyReportOwnerAllocation];
  hasHistoricalAggregates: boolean;
}

const ZERO_UTILITIES: PropertyReportUtilityTotals = {
  electricityCost: 0,
  electricityConsumption: 0,
  gasCost: 0,
  gasConsumption: 0,
  waterCost: 0,
  waterConsumption: 0,
  phoneInternetCost: 0,
  condominiumColdWaterConsumption: 0,
  condominiumHotWaterConsumption: 0,
  condominiumWaterCost: 0,
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function linkedTransaction(data: FinanceData, entry: PropertyEntry): Transaction | undefined {
  return entry.transactionId ? data.transactions.find((transaction) => transaction.id === entry.transactionId) : undefined;
}

function confirmedPropertyEntries(data: FinanceData, propertyId: string): PropertyEntry[] {
  return data.propertyEntries.filter((entry) => entry.propertyId === propertyId && !linkedTransaction(data, entry)?.planned);
}

function utilitiesForEntries(entries: readonly PropertyEntry[]): PropertyReportUtilityTotals {
  const result = { ...ZERO_UTILITIES };
  for (const entry of entries) {
    const kind = propertyUtilityKind(entry);
    if (!kind) continue;
    if (entry.kind === "expense") {
      if (kind === "electricity") result.electricityCost += entry.amount;
      else if (kind === "gas") result.gasCost += entry.amount;
      else if (kind === "water") result.waterCost += entry.amount;
      else result.phoneInternetCost += entry.amount;
    }
    if (kind === "electricity") result.electricityConsumption += propertyConsumptionQuantity(entry, "electricity");
    else if (kind === "gas") result.gasConsumption += propertyConsumptionQuantity(entry, "gas");
    else if (kind === "water") result.waterConsumption += propertyConsumptionQuantity(entry, "water");
  }
  return result;
}

function condominiumWaterForReadings(data: FinanceData, readings: readonly PropertyWaterReading[]): Pick<PropertyReportUtilityTotals, "condominiumColdWaterConsumption" | "condominiumHotWaterConsumption" | "condominiumWaterCost"> {
  return readings.reduce((result, reading) => {
    const consumption = propertyWaterConsumption(data, reading);
    result.condominiumColdWaterConsumption += consumption.coldCubicMeters ?? 0;
    result.condominiumHotWaterConsumption += consumption.hotCubicMeters ?? 0;
    result.condominiumWaterCost += reading.totalCost;
    return result;
  }, { condominiumColdWaterConsumption: 0, condominiumHotWaterConsumption: 0, condominiumWaterCost: 0 });
}

function marketObservations(data: FinanceData, property: Property): Array<{ date: string; value: number }> {
  const observations: Array<{ date: string; value: number }> = [];
  if (property.purchaseDate && property.purchasePrice > 0) observations.push({ date: property.purchaseDate, value: property.purchasePrice });
  data.propertyAnnualSummaries
    .filter((item) => item.propertyId === property.id)
    .forEach((item) => observations.push({ date: `${item.year}-12-31`, value: item.closingValue }));
  data.propertyEntries
    .filter((item) => item.propertyId === property.id && item.kind === "valuation")
    .forEach((item) => observations.push({ date: item.date, value: item.amount }));
  if (!observations.length && property.purchasePrice > 0) observations.push({ date: "1900-01-01", value: property.purchasePrice });
  return observations.sort((left, right) => left.date.localeCompare(right.date));
}

function marketValueAt(observations: readonly { date: string; value: number }[], date: string): number | undefined {
  let value: number | undefined;
  for (const observation of observations) {
    if (observation.date > date) break;
    value = observation.value;
  }
  return value;
}

function endOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function monthPeriods(data: FinanceData, property: Property, entries: readonly PropertyEntry[], asOf: string): PropertyReportPeriod[] {
  const observations = marketObservations(data, property);
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const key = `${data.meta.activeYear}-${String(month).padStart(2, "0")}`;
    const periodEntries = entries.filter((entry) => entry.date.startsWith(key));
    const periodWaterReadings = data.propertyWaterReadings.filter((reading) => reading.propertyId === property.id && reading.periodEnd.startsWith(key));
    const monthEnd = endOfMonth(data.meta.activeYear, month);
    const marketCutoff = key === asOf.slice(0, 7) ? asOf : monthEnd;
    return {
      key,
      income: total(periodEntries.filter((entry) => entry.kind === "income").map((entry) => entry.amount)),
      expenses: total(periodEntries.filter((entry) => entry.kind === "expense").map((entry) => entry.amount)),
      condominiumCost: total(periodEntries.filter(isCondominiumCost).map((entry) => entry.amount)),
      ...utilitiesForEntries(periodEntries),
      ...condominiumWaterForReadings(data, periodWaterReadings),
      marketValue: key <= asOf.slice(0, 7) ? marketValueAt(observations, marketCutoff) : undefined,
      historicalAggregate: false,
    };
  });
}

function annualSummaryUtilities(summary: PropertyAnnualSummary): PropertyReportUtilityTotals {
  return {
    electricityCost: summary.electricityCost,
    electricityConsumption: summary.electricityKwh,
    gasCost: summary.gasCost,
    gasConsumption: summary.gasCubicMeters,
    waterCost: summary.waterCost,
    waterConsumption: summary.waterCubicMeters,
    phoneInternetCost: summary.phoneInternetCost,
    condominiumColdWaterConsumption: summary.condominiumColdWaterCubicMeters,
    condominiumHotWaterConsumption: summary.condominiumHotWaterCubicMeters,
    condominiumWaterCost: summary.condominiumWaterCost,
  };
}

function reportYears(data: FinanceData, property: Property, entries: readonly PropertyEntry[]): number[] {
  const years = [
    data.meta.activeYear,
    ...data.propertyAnnualSummaries.filter((item) => item.propertyId === property.id).map((item) => item.year),
    ...entries.map((item) => Number(item.date.slice(0, 4))),
    ...data.propertyWaterReadings.filter((item) => item.propertyId === property.id).map((item) => Number(item.periodStart.slice(0, 4))),
    ...(property.purchaseDate ? [Number(property.purchaseDate.slice(0, 4))] : []),
  ].filter((year) => Number.isInteger(year) && year >= 1900 && year <= 9999);
  const firstYear = Math.min(...years);
  return Array.from({ length: data.meta.activeYear - firstYear + 1 }, (_, index) => firstYear + index);
}

function annualPeriods(data: FinanceData, property: Property, entries: readonly PropertyEntry[], asOf: string): PropertyReportPeriod[] {
  const observations = marketObservations(data, property);
  const summaries = new Map(data.propertyAnnualSummaries
    .filter((item) => item.propertyId === property.id)
    .map((item) => [item.year, item]));
  const entriesByYear = new Map<number, PropertyEntry[]>();
  for (const entry of entries) {
    const year = Number(entry.date.slice(0, 4));
    const group = entriesByYear.get(year);
    if (group) group.push(entry);
    else entriesByYear.set(year, [entry]);
  }
  let observationIndex = 0;
  let carriedMarketValue: number | undefined;
  return reportYears(data, property, entries).map((year) => {
    const historicalSummary = year === data.meta.activeYear ? undefined : summaries.get(year);
    const periodEntries = entriesByYear.get(year) ?? [];
    const utilities = historicalSummary
      ? annualSummaryUtilities(historicalSummary)
      : {
          ...utilitiesForEntries(periodEntries),
          ...condominiumWaterForReadings(data, data.propertyWaterReadings.filter((reading) => reading.propertyId === property.id && reading.periodStart.startsWith(String(year)))),
        };
    const periodEnd = `${year}-12-31`;
    const marketCutoff = year === data.meta.activeYear && asOf < periodEnd ? asOf : periodEnd;
    while (observationIndex < observations.length && observations[observationIndex]!.date <= marketCutoff) {
      carriedMarketValue = observations[observationIndex]!.value;
      observationIndex += 1;
    }
    return {
      key: String(year),
      income: historicalSummary?.income ?? total(periodEntries.filter((entry) => entry.kind === "income").map((entry) => entry.amount)),
      expenses: historicalSummary?.expenses ?? total(periodEntries.filter((entry) => entry.kind === "expense").map((entry) => entry.amount)),
      condominiumCost: historicalSummary?.condominiumCost ?? total(periodEntries.filter(isCondominiumCost).map((entry) => entry.amount)),
      ...utilities,
      marketValue: historicalSummary?.closingValue ?? carriedMarketValue,
      historicalAggregate: Boolean(historicalSummary),
    };
  });
}

function movementFromEntry(entry: PropertyEntry): PropertyReportMovement {
  return {
    date: entry.date,
    dueDate: entry.dueDate,
    kind: entry.kind as "income" | "expense",
    category: entry.category,
    description: entry.description,
    amount: entry.amount,
  };
}

function splitAmount(amount: number, firstShare: number): [number, number] {
  const first = roundMoney(amount * firstShare);
  return [first, roundMoney(amount - first)];
}

function ownerAllocations(
  property: Property,
  ownerNames: readonly [string, string],
  actualExpenses: number,
  forecastExpenses: number,
  currentMarketValue: number,
): [PropertyReportOwnerAllocation, PropertyReportOwnerAllocation] {
  const projectedExpenses = roundMoney(actualExpenses + forecastExpenses);
  const expenseSplit = splitAmount(actualExpenses, property.ownershipShare);
  const forecastSplit = splitAmount(forecastExpenses, property.ownershipShare);
  const projectedSplit = splitAmount(projectedExpenses, property.ownershipShare);
  const valueSplit = splitAmount(currentMarketValue, property.ownershipShare);
  return [
    {
      name: ownerNames[0],
      share: property.ownershipShare,
      actualExpenses: expenseSplit[0],
      forecastExpenses: forecastSplit[0],
      projectedExpenses: projectedSplit[0],
      marketValue: valueSplit[0],
    },
    {
      name: ownerNames[1],
      share: 1 - property.ownershipShare,
      actualExpenses: expenseSplit[1],
      forecastExpenses: forecastSplit[1],
      projectedExpenses: projectedSplit[1],
      marketValue: valueSplit[1],
    },
  ];
}

export function createPropertyReport(
  data: FinanceData,
  propertyId: string,
  scope: PropertyReportScope,
  ownerNames: readonly [string, string],
  asOf: string,
): PropertyReport {
  const property = data.properties.find((item) => item.id === propertyId);
  if (!property) throw new Error("PROPERTY_NOT_FOUND");
  const allEntries = confirmedPropertyEntries(data, propertyId);
  const scopedEntries = scope === "current-year"
    ? allEntries.filter((entry) => entry.date.startsWith(String(data.meta.activeYear)))
    : allEntries;
  const economicEntries = scopedEntries
    .filter((entry): entry is PropertyEntry & { kind: "income" | "expense" } => entry.kind === "income" || entry.kind === "expense")
    .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  const periods = scope === "current-year"
    ? monthPeriods(data, property, scopedEntries, asOf)
    : annualPeriods(data, property, allEntries, asOf);
  const trend = annualPeriods(data, property, allEntries, asOf).map((period) => ({ year: Number(period.key), expenses: period.expenses }));
  const endOfActiveYear = `${data.meta.activeYear}-12-31`;
  const allForecastExpenses = data.transactions
    .filter((transaction) => transaction.propertyId === propertyId
      && transaction.kind === "expense"
      && transaction.planned
      && (transaction.dueDate ?? transaction.date) >= asOf
      && (transaction.dueDate ?? transaction.date) <= endOfActiveYear)
    .map((transaction) => ({
      date: transaction.dueDate ?? transaction.date,
      description: transaction.description,
      amount: transaction.amount,
    }))
    .sort((left, right) => left.date.localeCompare(right.date) || left.description.localeCompare(right.description));
  const forecastExpenses = allForecastExpenses.slice(0, PROPERTY_REPORT_DETAIL_LIMIT);
  const actualIncome = roundMoney(total(periods.map((period) => period.income)));
  const actualExpenses = roundMoney(total(periods.map((period) => period.expenses)));
  const forecastExpenseTotal = roundMoney(total(allForecastExpenses.map((entry) => entry.amount)));
  const currentMarketValue = marketValueAt(marketObservations(data, property), asOf) ?? property.purchasePrice;
  const movements = economicEntries.slice(0, PROPERTY_REPORT_DETAIL_LIMIT).map(movementFromEntry);
  const allCondominiumMovements = economicEntries.filter(isCondominiumCost);
  return {
    property,
    scope,
    activeYear: data.meta.activeYear,
    asOf,
    periodGranularity: scope === "current-year" ? "month" : "year",
    periods,
    costTrend: trend,
    condominiumMovements: allCondominiumMovements
      .slice(0, PROPERTY_REPORT_DETAIL_LIMIT)
      .map(movementFromEntry),
    totalCondominiumMovementCount: allCondominiumMovements.length,
    condominiumMovementsTruncated: allCondominiumMovements.length > PROPERTY_REPORT_DETAIL_LIMIT,
    movements,
    totalMovementCount: economicEntries.length,
    movementsTruncated: economicEntries.length > PROPERTY_REPORT_DETAIL_LIMIT,
    forecastExpenses,
    totalForecastExpenseCount: allForecastExpenses.length,
    forecastExpensesTruncated: allForecastExpenses.length > PROPERTY_REPORT_DETAIL_LIMIT,
    actualIncome,
    actualExpenses,
    forecastExpenseTotal,
    projectedExpenseTotal: roundMoney(actualExpenses + forecastExpenseTotal),
    currentMarketValue,
    ownerAllocations: ownerAllocations(property, ownerNames, actualExpenses, forecastExpenseTotal, currentMarketValue),
    hasHistoricalAggregates: periods.some((period) => period.historicalAggregate),
  };
}
