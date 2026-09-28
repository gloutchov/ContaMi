import type { FinanceData, InvestmentEntry } from "./models";

export interface InvestmentUnitOpeningIndex {
  earliestOtherEntryDate: Map<string, string>;
  earliestSummaryYear: Map<string, number>;
}

export function investmentUnitOpeningIndex(data: Pick<FinanceData, "investmentEntries" | "investmentAnnualSummaries">): InvestmentUnitOpeningIndex {
  const earliestOtherEntryDate = new Map<string, string>();
  const earliestSummaryYear = new Map<string, number>();
  for (const entry of data.investmentEntries) {
    if (entry.kind !== "valuation" && entry.kind !== "contribution_correction" && entry.kind !== "withdrawal_correction") continue;
    const previous = earliestOtherEntryDate.get(entry.investmentId);
    if (!previous || entry.date < previous) earliestOtherEntryDate.set(entry.investmentId, entry.date);
  }
  for (const summary of data.investmentAnnualSummaries) {
    const previous = earliestSummaryYear.get(summary.investmentId);
    if (previous === undefined || summary.year < previous) earliestSummaryYear.set(summary.investmentId, summary.year);
  }
  return { earliestOtherEntryDate, earliestSummaryYear };
}

/** A first purchase can establish holdings only when no earlier position history is recorded. */
export function canInferOpeningInvestmentUnits(
  index: InvestmentUnitOpeningIndex,
  firstMovement: InvestmentEntry | undefined,
): boolean {
  if (firstMovement?.kind !== "contribution" || firstMovement.quantity === undefined) return false;
  const { investmentId, date } = firstMovement;
  const year = Number(date.slice(0, 4));
  const summaryYear = index.earliestSummaryYear.get(investmentId);
  if (summaryYear !== undefined && summaryYear <= year) return false;
  const otherEntryDate = index.earliestOtherEntryDate.get(investmentId);
  return otherEntryDate === undefined || otherEntryDate >= date;
}
