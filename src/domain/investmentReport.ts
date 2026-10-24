import { investmentPortfolioReturnSeries, investmentReturnSeries, type ReturnCoverage } from "./assetReturns";
import { investmentValueTimeline, type InvestmentTimelinePoint } from "./investmentHistory";
import {
  addInvestmentMovementTotals, confirmedInvestmentEntries, investmentChildren, investmentMovementEvents,
  investmentMovementTotals, investmentPositionResult,
  latestInvestmentValue, pensionInvestmentIds, regularInvestments, type InvestmentMovementTotals,
} from "./investments";
import type { FinanceData, Investment, InvestmentEntry } from "./models";

export type InvestmentReportScope = "current-year" | "lifetime";
export const INVESTMENT_REPORT_DETAIL_LIMIT = 2_000;
export const INVESTMENT_REPORT_PERIOD_LIMIT = 200;

export interface InvestmentReportPosition {
  id: string;
  name: string;
  currency: string;
  totals: InvestmentMovementTotals;
  value: number;
  result: number;
  resultRate?: number;
}

export interface InvestmentReportPeriod {
  key: string;
  cutoff: string;
  capital?: number;
  value?: number;
  firstValuationAt?: string;
  lastValuationAt?: string;
  returnRate?: number;
  returnCoverage: ReturnCoverage;
  returnPartial: boolean;
  historicalAggregate: boolean;
}

export interface InvestmentReportMovement {
  date: string;
  position: string;
  kind: InvestmentEntry["kind"];
  amount: number;
  description: string;
}

export interface InvestmentReportCurrency {
  currency: string;
  positions: InvestmentReportPosition[];
  totals: InvestmentMovementTotals;
  value: number;
  result: number;
  resultRate?: number;
  periods: InvestmentReportPeriod[];
  movements: InvestmentReportMovement[];
  movementCount: number;
  movementsTruncated: boolean;
}

export interface InvestmentReport {
  scope: InvestmentReportScope;
  investment?: Investment;
  asOf: string;
  activeYear: number;
  currencies: InvestmentReportCurrency[];
}

const EMPTY_TOTALS: InvestmentMovementTotals = { initialCapital: 0, subsequentContributions: 0, liquidations: 0, balance: 0 };

function leafPositions(data: FinanceData, roots: readonly Investment[]): Investment[] {
  const pensionIds = pensionInvestmentIds(data);
  const seen = new Set<string>();
  const leaves: Investment[] = [];
  const visit = (item: Investment): void => {
    if (seen.has(item.id) || pensionIds.has(item.id)) return;
    seen.add(item.id);
    const children = investmentChildren(data, item.id).filter((child) => child.active && !pensionIds.has(child.id));
    if (children.length) children.forEach(visit);
    else if (!investmentChildren(data, item.id).length) leaves.push(item);
  };
  roots.forEach(visit);
  return leaves;
}

function lastAt<T extends { date: string }>(items: readonly T[], cutoff: string): T | undefined {
  return items.filter((item) => item.date <= cutoff).at(-1);
}

function periodKeys(data: FinanceData, leaves: readonly Investment[], scope: InvestmentReportScope): string[] {
  if (scope === "current-year") {
    return Array.from({ length: 12 }, (_, index) => `${data.meta.activeYear}-${String(index + 1).padStart(2, "0")}`);
  }
  const years = leaves.flatMap((leaf) => [
    Number(leaf.openedAt.slice(0, 4)),
    ...data.investmentAnnualSummaries.filter((item) => item.investmentId === leaf.id).map((item) => item.year),
    ...confirmedInvestmentEntries(data, leaf.id).map((item) => Number(item.date.slice(0, 4))),
  ]).filter((year) => year >= 1900 && year <= data.meta.activeYear);
  if (!years.length) return [];
  const count = data.meta.activeYear - Math.min(...years) + 1;
  if (count > INVESTMENT_REPORT_PERIOD_LIMIT) throw new Error("INVESTMENT_REPORT_FAILED");
  return Array.from({ length: count }, (_, index) => String(Math.min(...years) + index));
}

function endOfMonth(key: string): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function currencyPeriods(
  data: FinanceData,
  leaves: readonly Investment[],
  scope: InvestmentReportScope,
  asOf: string,
): InvestmentReportPeriod[] {
  const histories = leaves.map((leaf) => ({
    timeline: investmentValueTimeline(data, leaf.id),
    events: investmentMovementEvents(data, leaf.id),
    valuations: [
      ...data.investmentAnnualSummaries.filter((item) => item.investmentId === leaf.id && item.closingValueObservedAt).map((item) => ({ date: item.closingValueObservedAt! })),
      ...confirmedInvestmentEntries(data, leaf.id).filter((item) => item.kind === "valuation").map((item) => ({ date: item.date })),
    ].sort((left, right) => left.date.localeCompare(right.date)),
  }));
  const series = leaves.length === 1
    ? investmentReturnSeries(data, leaves[0], asOf)
    : investmentPortfolioReturnSeries(data, [...leaves], asOf);
  return periodKeys(data, leaves, scope).map((key) => {
    const periodEnd = scope === "current-year" ? endOfMonth(key) : `${key}-12-31`;
    const cutoff = periodEnd < asOf ? periodEnd : asOf;
    const isFuture = periodEnd.slice(0, scope === "current-year" ? 7 : 4) > asOf.slice(0, scope === "current-year" ? 7 : 4);
    const periodReturn = scope === "current-year"
      ? series.monthly.find((point) => point.date.startsWith(key))
      : series.annual.find((point) => String(point.year) === key);
    const points = isFuture ? [] : histories.map((history) => lastAt(history.timeline, cutoff)).filter((item): item is InvestmentTimelinePoint => Boolean(item));
    const capital = isFuture || !points.length ? undefined : histories.reduce((sum, history) => sum + history.events.filter((item) => item.date <= cutoff)
      .reduce((total, item) => total + (item.kind === "contribution" ? item.amount : -item.amount), 0), 0);
    const valuationDates = histories.map((history) => lastAt(history.valuations, cutoff)?.date);
    const observedDates = valuationDates.filter((date): date is string => Boolean(date)).sort();
    return {
      key,
      cutoff,
      capital,
      value: isFuture || !points.length ? undefined : points.reduce((sum, item) => sum + item.closingValue, 0),
      firstValuationAt: observedDates.length === leaves.length ? observedDates[0] : undefined,
      lastValuationAt: observedDates.length === leaves.length ? observedDates.at(-1) : undefined,
      returnRate: periodReturn?.rate ?? undefined,
      returnCoverage: periodReturn?.coverage ?? "missing",
      returnPartial: "partialPeriod" in (periodReturn ?? {}) ? Boolean((periodReturn as { partialPeriod?: boolean }).partialPeriod) : false,
      historicalAggregate: scope === "lifetime" && Number(key) < data.meta.activeYear
        && leaves.some((leaf) => data.investmentAnnualSummaries.some((summary) => summary.investmentId === leaf.id && summary.year === Number(key))),
    };
  });
}

function reportMovements(data: FinanceData, leaves: readonly Investment[], scope: InvestmentReportScope, asOf: string) {
  const all = leaves.flatMap((leaf) => confirmedInvestmentEntries(data, leaf.id)
    .filter((entry) => entry.date <= asOf && (scope === "lifetime" || entry.date.startsWith(String(data.meta.activeYear))))
    .filter((entry) => entry.kind !== "unit_snapshot")
    .map((entry) => ({ date: entry.date, position: leaf.name, kind: entry.kind, amount: entry.amount, description: entry.description })));
  all.sort((left, right) => left.date.localeCompare(right.date) || left.position.localeCompare(right.position) || left.kind.localeCompare(right.kind));
  return { movements: all.slice(0, INVESTMENT_REPORT_DETAIL_LIMIT), movementCount: all.length, movementsTruncated: all.length > INVESTMENT_REPORT_DETAIL_LIMIT };
}

export function createInvestmentReport(
  data: FinanceData,
  investmentId: string | undefined,
  scope: InvestmentReportScope,
  asOf: string,
): InvestmentReport {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("INVESTMENT_REPORT_FAILED");
  const investment = investmentId ? data.investments.find((item) => item.id === investmentId) : undefined;
  if (investmentId && (!investment || pensionInvestmentIds(data).has(investment.id))) throw new Error("INVESTMENT_REPORT_FAILED");
  const roots = investment ? [investment] : regularInvestments(data).filter((item) => item.active && !item.parentInvestmentId);
  const leaves = leafPositions(data, roots);
  const currencies = [...new Set(leaves.map((leaf) => leaf.currency))].sort().map((currency) => {
    const currencyLeaves = leaves.filter((leaf) => leaf.currency === currency);
    const positions = currencyLeaves.map((leaf): InvestmentReportPosition => {
      const totals = investmentMovementTotals(data, leaf.id);
      const value = latestInvestmentValue(data, leaf.id);
      const result = investmentPositionResult(data, leaf);
      return { id: leaf.id, name: leaf.name, currency, totals, value, result: result.amount, resultRate: result.rate };
    });
    const totals = positions.reduce((sum, item) => addInvestmentMovementTotals(sum, item.totals), EMPTY_TOTALS);
    const value = positions.reduce((sum, item) => sum + item.value, 0);
    const { movements, movementCount, movementsTruncated } = reportMovements(data, currencyLeaves, scope, asOf);
    return {
      currency, positions, totals, value,
      result: value - totals.balance,
      resultRate: totals.balance > 0 ? (value - totals.balance) / totals.balance : undefined,
      periods: currencyPeriods(data, currencyLeaves, scope, asOf),
      movements, movementCount, movementsTruncated,
    };
  });
  return { scope, investment, asOf, activeYear: data.meta.activeYear, currencies };
}
