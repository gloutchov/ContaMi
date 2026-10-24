import { createInvestmentAnnualSummaries } from "./annualHistory";
import { confirmedInvestmentEntries, investmentChildren, investmentMovementEvents, isInvestmentCorrectionKind } from "./investments";
import type { FinanceData } from "./models";

export interface InvestmentHistoryPoint {
  year: number;
  investedValue: number;
  closingValue: number;
  contributions: number;
  withdrawals: number;
}

export interface InvestmentTimelinePoint {
  date: string;
  investedValue: number;
  closingValue: number;
}

function ownHistory(data: FinanceData, investmentId: string): InvestmentHistoryPoint[] {
  const current = createInvestmentAnnualSummaries(data).find((item) => item.investmentId === investmentId);
  const byYear = new Map(data.investmentAnnualSummaries.filter((item) => item.investmentId === investmentId).map((item) => [item.year, item]));
  const hasCurrentEntries = confirmedInvestmentEntries(data, investmentId).some((item) => item.date.startsWith(String(data.meta.activeYear)));
  if (current && hasCurrentEntries) byYear.set(current.year, current);
  let investedValue = 0;
  return [...byYear.values()].sort((a, b) => a.year - b.year).map((item) => {
    investedValue = Math.max(0, investedValue + item.contributions - item.withdrawals);
    return { ...item, investedValue };
  });
}

export function investmentValueHistory(data: FinanceData, investmentId: string): InvestmentHistoryPoint[] {
  const children = investmentChildren(data, investmentId);
  if (!children.length) return ownHistory(data, investmentId);
  const childHistories = children.map((child) => investmentValueHistory(data, child.id));
  const years = [...new Set(childHistories.flatMap((history) => history.map((item) => item.year)))].sort((a, b) => a - b);
  return years.map((year) => {
    const point = { year, investedValue: 0, closingValue: 0, contributions: 0, withdrawals: 0 };
    for (const history of childHistories) {
      const latest = history.filter((item) => item.year <= year).at(-1);
      const exact = history.find((item) => item.year === year);
      if (latest) {
        point.investedValue += latest.investedValue;
        point.closingValue += latest.closingValue;
      }
      if (exact) {
        point.contributions += exact.contributions;
        point.withdrawals += exact.withdrawals;
      }
    }
    return point;
  });
}

function ownTimeline(data: FinanceData, investmentId: string): InvestmentTimelinePoint[] {
  const entries = confirmedInvestmentEntries(data, investmentId);
  const detailedMovementYears = new Set(entries
    .filter((item) => item.kind !== "valuation" && !isInvestmentCorrectionKind(item.kind))
    .map((item) => Number(item.date.slice(0, 4))));
  const summaries = data.investmentAnnualSummaries
    .filter((item) => item.investmentId === investmentId)
    .filter((item) => item.year < data.meta.activeYear || !detailedMovementYears.has(item.year));
  const summaryYears = new Set(summaries.map((item) => item.year));
  const events = [
    ...investmentMovementEvents(data, investmentId).map((movement) => ({ date: movement.date, orderKey: movement.orderKey, movement })),
    ...summaries.map((summary) => ({ date: `${summary.year}-12-31`, orderKey: `2-summary-${summary.year}`, summary })),
    ...entries
      .filter((entry) => entry.kind === "valuation" && !summaryYears.has(Number(entry.date.slice(0, 4))))
      .map((valuation) => ({ date: valuation.date, orderKey: `2-valuation-${valuation.id}`, valuation })),
  ].sort((left, right) => left.date.localeCompare(right.date) || left.orderKey.localeCompare(right.orderKey));
  let investedValue = 0;
  let closingValue = 0;
  const points: InvestmentTimelinePoint[] = [];
  for (const date of [...new Set(events.map((item) => item.date))]) {
    for (const event of events.filter((item) => item.date === date)) {
      if ("summary" in event) {
        closingValue = event.summary!.closingValue;
      } else if ("valuation" in event) {
        closingValue = event.valuation!.amount;
      } else if (event.movement!.kind === "contribution") {
        investedValue += event.movement!.amount;
        if (!event.movement!.correction) closingValue += event.movement!.amount;
      } else {
        investedValue = Math.max(0, investedValue - event.movement!.amount);
        if (!event.movement!.correction) closingValue = Math.max(0, closingValue - event.movement!.amount);
      }
    }
    points.push({ date, investedValue, closingValue });
  }
  return points;
}

export function investmentValueTimeline(data: FinanceData, investmentId: string): InvestmentTimelinePoint[] {
  const children = investmentChildren(data, investmentId);
  if (!children.length) return ownTimeline(data, investmentId);
  const childTimelines = children.map((child) => investmentValueTimeline(data, child.id));
  const dates = [...new Set(childTimelines.flatMap((timeline) => timeline.map((item) => item.date)))].sort();
  return dates.map((date) => childTimelines.reduce<InvestmentTimelinePoint>((point, timeline) => {
    const latest = timeline.filter((item) => item.date <= date).at(-1);
    if (latest) {
      point.investedValue += latest.investedValue;
      point.closingValue += latest.closingValue;
    }
    return point;
  }, { date, investedValue: 0, closingValue: 0 }));
}
