import { investmentPortfolioReturnSeries, investmentReturnSeries, type ReturnCoverage } from "./assetReturns";
import { investmentValueTimeline, type InvestmentTimelinePoint } from "./investmentHistory";
import {
  addInvestmentMovementTotals, confirmedInvestmentEntries, investmentChildren, investmentMovementEvents,
  investmentMovementTotals, investmentPositionResult,
  latestInvestmentValue, pensionInvestmentIds, pensionPlans, regularInvestments, type InvestmentMovementTotals,
} from "./investments";
import type { FinanceData, Investment, InvestmentEntry } from "./models";

export type AssetReportScope = "current-year" | "lifetime";
export type AssetReportKind = "investment" | "pension";
export const INVESTMENT_REPORT_DETAIL_LIMIT = 2_000;
export const INVESTMENT_REPORT_PERIOD_LIMIT = 200;

export interface AssetReportPosition {
  id: string;
  name: string;
  currency: string;
  totals: InvestmentMovementTotals;
  value: number;
  result: number;
  resultRate?: number;
}

export interface AssetReportPeriod {
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

export interface AssetReportMovement {
  date: string;
  position: string;
  kind: InvestmentEntry["kind"];
  amount: number;
  description: string;
}

export interface AssetReportCurrency {
  currency: string;
  positions: AssetReportPosition[];
  totals: InvestmentMovementTotals;
  value: number;
  result: number;
  resultRate?: number;
  periods: AssetReportPeriod[];
  movements: AssetReportMovement[];
  movementCount: number;
  movementsTruncated: boolean;
}

export interface AssetReport {
  scope: AssetReportScope;
  subject?: Investment;
  asOf: string;
  activeYear: number;
  currencies: AssetReportCurrency[];
}

const EMPTY_TOTALS: InvestmentMovementTotals = { initialCapital: 0, subsequentContributions: 0, liquidations: 0, balance: 0 };

function leafPositions(data: FinanceData, roots: readonly Investment[], kind: AssetReportKind): Investment[] {
  const pensionIds = pensionInvestmentIds(data);
  const eligible = (item: Investment) => pensionIds.has(item.id) === (kind === "pension");
  const seen = new Set<string>();
  const leaves: Investment[] = [];
  const visit = (item: Investment): void => {
    if (seen.has(item.id) || !eligible(item)) return;
    seen.add(item.id);
    const children = investmentChildren(data, item.id).filter((child) => child.active && eligible(child));
    if (children.length) children.forEach(visit);
    else if (!investmentChildren(data, item.id).length && (kind === "investment"
      || Boolean(item.parentInvestmentId && pensionIds.has(item.parentInvestmentId)))) leaves.push(item);
  };
  roots.forEach(visit);
  return leaves;
}

function lastAt<T extends { date: string }>(items: readonly T[], cutoff: string): T | undefined {
  return items.filter((item) => item.date <= cutoff).at(-1);
}

function periodKeys(data: FinanceData, leaves: readonly Investment[], scope: AssetReportScope, failureCode: string): string[] {
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
  if (count > INVESTMENT_REPORT_PERIOD_LIMIT) throw new Error(failureCode);
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
  scope: AssetReportScope,
  asOf: string,
  failureCode: string,
): AssetReportPeriod[] {
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
  return periodKeys(data, leaves, scope, failureCode).map((key) => {
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

function reportMovements(data: FinanceData, leaves: readonly Investment[], scope: AssetReportScope, asOf: string) {
  const all = leaves.flatMap((leaf) => confirmedInvestmentEntries(data, leaf.id)
    .filter((entry) => entry.date <= asOf && (scope === "lifetime" || entry.date.startsWith(String(data.meta.activeYear))))
    .filter((entry) => entry.kind !== "unit_snapshot")
    .map((entry) => ({ date: entry.date, position: leaf.name, kind: entry.kind, amount: entry.amount, description: entry.description })));
  all.sort((left, right) => left.date.localeCompare(right.date) || left.position.localeCompare(right.position) || left.kind.localeCompare(right.kind));
  return { movements: all.slice(0, INVESTMENT_REPORT_DETAIL_LIMIT), movementCount: all.length, movementsTruncated: all.length > INVESTMENT_REPORT_DETAIL_LIMIT };
}

export function createAssetReport(
  data: FinanceData,
  subjectId: string | undefined,
  scope: AssetReportScope,
  asOf: string,
  kind: AssetReportKind,
): AssetReport {
  const failureCode = kind === "pension" ? "PENSION_REPORT_FAILED" : "INVESTMENT_REPORT_FAILED";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error(failureCode);
  const subject = subjectId ? data.investments.find((item) => item.id === subjectId) : undefined;
  if (subjectId && (!subject || pensionInvestmentIds(data).has(subject.id) !== (kind === "pension"))) throw new Error(failureCode);
  const roots = subject ? [subject] : kind === "pension"
    ? pensionPlans(data)
    : regularInvestments(data).filter((item) => item.active && !item.parentInvestmentId);
  const leaves = leafPositions(data, roots, kind);
  const currencies = [...new Set(leaves.map((leaf) => leaf.currency))].sort().map((currency) => {
    const currencyLeaves = leaves.filter((leaf) => leaf.currency === currency);
    const positions = currencyLeaves.map((leaf): AssetReportPosition => {
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
      periods: currencyPeriods(data, currencyLeaves, scope, asOf, failureCode),
      movements, movementCount, movementsTruncated,
    };
  });
  return { scope, subject, asOf, activeYear: data.meta.activeYear, currencies };
}
