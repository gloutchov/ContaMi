import type { FinanceData, Investment, InvestmentEntry } from "./models";
import { canInferOpeningInvestmentUnits, investmentUnitOpeningIndex } from "./investmentUnitOpening";

export type InvestmentCorrectionKind = "contribution_correction" | "withdrawal_correction";
export type LinkedInvestmentMovementKind = "contribution" | "withdrawal";
export const ROLLOVER_OPENING_VALUATION_DESCRIPTION = "Opening valuation / Valutazione iniziale";

export function isRolloverOpeningValuation(entry: InvestmentEntry): boolean {
  return entry.kind === "valuation" && entry.description === ROLLOVER_OPENING_VALUATION_DESCRIPTION;
}

export function isInvestmentCorrectionKind(kind: InvestmentEntry["kind"]): kind is InvestmentCorrectionKind {
  return kind === "contribution_correction" || kind === "withdrawal_correction";
}

export function isLinkedInvestmentMovementKind(kind: InvestmentEntry["kind"]): kind is LinkedInvestmentMovementKind {
  return kind === "contribution" || kind === "withdrawal";
}

export function investmentEntryMovementKind(kind: InvestmentEntry["kind"]): LinkedInvestmentMovementKind | undefined {
  if (kind === "contribution" || kind === "contribution_correction") return "contribution";
  if (kind === "withdrawal" || kind === "withdrawal_correction") return "withdrawal";
  return undefined;
}

function investmentValueEntryOrder(kind: InvestmentEntry["kind"]): number {
  if (kind === "contribution") return 0;
  if (kind === "withdrawal") return 1;
  if (kind === "valuation") return 2;
  return 3;
}

export interface InvestmentMovementEvent {
  date: string;
  kind: "contribution" | "withdrawal";
  amount: number;
  correction: boolean;
  orderKey: string;
}

export interface InvestmentMovementTotals {
  initialCapital: number;
  subsequentContributions: number;
  liquidations: number;
  balance: number;
}

const emptyMovementTotals = (): InvestmentMovementTotals => ({
  initialCapital: 0,
  subsequentContributions: 0,
  liquidations: 0,
  balance: 0,
});

export function addInvestmentMovementTotals(
  left: InvestmentMovementTotals,
  right: InvestmentMovementTotals,
): InvestmentMovementTotals {
  const initialCapital = left.initialCapital + right.initialCapital;
  const subsequentContributions = left.subsequentContributions + right.subsequentContributions;
  const liquidations = left.liquidations + right.liquidations;
  return { initialCapital, subsequentContributions, liquidations, balance: initialCapital + subsequentContributions - liquidations };
}

export function pensionInvestmentIds(data: FinanceData): Set<string> {
  const pensionTypeIds = new Set(data.investmentTypes.filter((type) => type.code === "pension").map((type) => type.id));
  const ids = new Set(data.investments
    .filter((item) => item.kind === "pension" || (item.typeId && pensionTypeIds.has(item.typeId)))
    .map((item) => item.id));
  const childrenByParent = new Map<string, string[]>();
  for (const item of data.investments) {
    if (!item.parentInvestmentId) continue;
    const children = childrenByParent.get(item.parentInvestmentId) ?? [];
    children.push(item.id);
    childrenByParent.set(item.parentInvestmentId, children);
  }
  const pending = [...ids];
  for (let index = 0; index < pending.length; index += 1) {
    for (const childId of childrenByParent.get(pending[index]) ?? []) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      pending.push(childId);
    }
  }
  return ids;
}

export function isPensionInvestment(data: FinanceData, item: Investment): boolean {
  return pensionInvestmentIds(data).has(item.id);
}

export function investmentChildren(data: FinanceData, investmentId: string, activeOnly = false): Investment[] {
  return data.investments.filter((item) => item.parentInvestmentId === investmentId && (!activeOnly || item.active));
}

export function confirmedInvestmentEntries(data: FinanceData, investmentId?: string) {
  const plannedTransactionIds = new Set(data.transactions.filter((item) => item.planned).map((item) => item.id));
  return data.investmentEntries.filter((entry) => (!investmentId || entry.investmentId === investmentId)
    && (!entry.transactionId || !plannedTransactionIds.has(entry.transactionId)));
}

export interface InvestmentUnitPoint {
  date: string;
  quantity: number | null;
  variation: number | null;
}

export function investmentUnitTimeline(data: FinanceData, investmentId: string): InvestmentUnitPoint[] {
  const entries = confirmedInvestmentEntries(data, investmentId)
    .filter((entry) => entry.kind === "unit_snapshot" || entry.kind === "contribution" || entry.kind === "withdrawal")
    .sort((left, right) => left.date.localeCompare(right.date)
      || Number(left.kind === "unit_snapshot") - Number(right.kind === "unit_snapshot")
      || left.id.localeCompare(right.id));
  if (!entries.length) return [];
  let quantity: number | null = canInferOpeningInvestmentUnits(investmentUnitOpeningIndex(data), entries[0]) ? 0 : null;
  let currentDate: string | undefined;
  let openingQuantity: number | null = null;
  const points: InvestmentUnitPoint[] = [];
  for (const entry of entries) {
    if (entry.date !== currentDate) {
      currentDate = entry.date;
      openingQuantity = quantity;
    }
    const before = quantity;
    if (entry.kind === "unit_snapshot") quantity = entry.quantity ?? null;
    else if (quantity !== null) quantity = entry.quantity === undefined
      ? null
      : Math.round((quantity + (entry.kind === "contribution" ? entry.quantity : -entry.quantity)) * 100_000_000) / 100_000_000;
    if (entry.kind !== "unit_snapshot" && before === null) continue;
    if (quantity !== null && quantity < -0.000_000_01) throw new Error("NEGATIVE_INVESTMENT_QUANTITY");
    const variation = openingQuantity === null || quantity === null ? null
      : Math.round((quantity - openingQuantity) * 100_000_000) / 100_000_000;
    const last = points.at(-1);
    const point = { date: entry.date, quantity, variation };
    if (last?.date === entry.date) points[points.length - 1] = point;
    else points.push(point);
  }
  return points;
}

export function investmentUnitBalance(data: FinanceData, investmentId: string): number | undefined {
  const last = investmentUnitTimeline(data, investmentId).at(-1);
  return last?.quantity ?? undefined;
}

export function investmentMovementEvents(data: FinanceData, investmentId: string): InvestmentMovementEvent[] {
  const annualByYear = new Map(data.investmentAnnualSummaries
    .filter((item) => item.investmentId === investmentId)
    .map((item) => [item.year, item]));
  const detailed = confirmedInvestmentEntries(data, investmentId)
    .filter((entry) => investmentEntryMovementKind(entry.kind));
  const detailedKindsByYear = new Map<number, Set<LinkedInvestmentMovementKind>>();
  for (const entry of detailed) {
    if (isInvestmentCorrectionKind(entry.kind) || entry.kind === "unit_snapshot") continue;
    const kind = investmentEntryMovementKind(entry.kind);
    if (!kind) continue;
    const year = Number(entry.date.slice(0, 4));
    const kinds = detailedKindsByYear.get(year) ?? new Set<LinkedInvestmentMovementKind>();
    kinds.add(kind);
    detailedKindsByYear.set(year, kinds);
  }
  const events: InvestmentMovementEvent[] = [];

  for (const summary of annualByYear.values()) {
    const date = `${summary.year}-12-31`;
    const detailedKinds = detailedKindsByYear.get(summary.year);
    if (summary.contributions > 0 && (summary.year < data.meta.activeYear || !detailedKinds?.has("contribution"))) {
      events.push({ date, kind: "contribution", amount: summary.contributions, correction: false, orderKey: `0-summary-${summary.year}` });
    }
    if (summary.withdrawals > 0 && (summary.year < data.meta.activeYear || !detailedKinds?.has("withdrawal"))) {
      events.push({ date, kind: "withdrawal", amount: summary.withdrawals, correction: false, orderKey: `1-summary-${summary.year}` });
    }
  }

  for (const entry of detailed) {
    const kind = investmentEntryMovementKind(entry.kind);
    if (!kind) continue;
    const correction = isInvestmentCorrectionKind(entry.kind);
    const year = Number(entry.date.slice(0, 4));
    const historicalSummary = year < data.meta.activeYear ? annualByYear.get(year) : undefined;
    const summarizedAmount = kind === "contribution" ? historicalSummary?.contributions : historicalSummary?.withdrawals;
    if (!correction && summarizedAmount !== undefined && summarizedAmount > 0) continue;
    events.push({ date: entry.date, kind, amount: entry.amount, correction, orderKey: `${kind === "contribution" ? 0 : 1}-${correction ? 1 : 0}-entry-${entry.id}` });
  }
  return events.sort((left, right) => left.date.localeCompare(right.date) || left.orderKey.localeCompare(right.orderKey));
}

export function investmentMovementTotals(data: FinanceData, investmentId: string): InvestmentMovementTotals {
  const totals = emptyMovementTotals();
  let foundInitialContribution = false;
  for (const event of investmentMovementEvents(data, investmentId)) {
    if (event.kind === "withdrawal") {
      totals.liquidations += event.amount;
    } else if (!event.correction && !foundInitialContribution) {
      totals.initialCapital = event.amount;
      foundInitialContribution = true;
    } else {
      totals.subsequentContributions += event.amount;
    }
  }
  totals.balance = totals.initialCapital + totals.subsequentContributions - totals.liquidations;
  return totals;
}

export function latestInvestmentValue(data: FinanceData, investmentId: string): number {
  return confirmedInvestmentEntries(data, investmentId)
    .filter((entry) => entry.kind === "contribution" || entry.kind === "withdrawal" || entry.kind === "valuation")
    .sort((left, right) => left.date.localeCompare(right.date) || investmentValueEntryOrder(left.kind) - investmentValueEntryOrder(right.kind))
    .reduce((value, entry) => {
      if (entry.kind === "contribution") return value + entry.amount;
      if (entry.kind === "withdrawal") return Math.max(0, value - entry.amount);
      return entry.amount;
    }, 0);
}

export type InvestmentValueTrend = "up" | "down";

export function investmentValuationTrend(data: FinanceData, investmentId: string): InvestmentValueTrend | undefined {
  const valuations = confirmedInvestmentEntries(data, investmentId).filter((entry) => entry.kind === "valuation");
  const valuationYears = new Set(valuations.map((entry) => Number(entry.date.slice(0, 4))));
  const summaries = data.investmentAnnualSummaries
    .filter((summary) => summary.investmentId === investmentId)
    .filter((summary) => summary.year < data.meta.activeYear || !valuationYears.has(summary.year));
  const summaryYears = new Set(summaries.map((summary) => summary.year));
  const observations = [
    ...summaries.map((summary) => ({ date: `${summary.year}-12-31`, orderKey: `0-summary-${summary.year}`, value: summary.closingValue })),
    ...valuations
      .filter((entry) => !summaryYears.has(Number(entry.date.slice(0, 4))))
      .map((entry) => ({ date: entry.date, orderKey: `1-valuation-${entry.id}`, value: entry.amount })),
  ].sort((left, right) => left.date.localeCompare(right.date) || left.orderKey.localeCompare(right.orderKey));
  if (observations.length < 2) return undefined;
  const previous = observations.at(-2)!.value;
  const current = observations.at(-1)!.value;
  if (current > previous + 0.005) return "up";
  if (current < previous - 0.005) return "down";
  return undefined;
}

export function investmentInvestedCapital(data: FinanceData, investmentId: string): number {
  return Math.max(0, investmentMovementTotals(data, investmentId).balance);
}

export function investmentPositionValue(data: FinanceData, investment: Investment): number {
  const children = investmentChildren(data, investment.id);
  return children.length
    ? children.filter((child) => child.active).reduce((sum, child) => sum + investmentPositionValue(data, child), 0)
    : latestInvestmentValue(data, investment.id);
}

export function investmentPositionInvestedCapital(data: FinanceData, investment: Investment): number {
  const children = investmentChildren(data, investment.id);
  return children.length
    ? children.filter((child) => child.active).reduce((sum, child) => sum + investmentPositionInvestedCapital(data, child), 0)
    : investmentInvestedCapital(data, investment.id);
}

export function investmentPositionMovementTotals(data: FinanceData, investment: Investment): InvestmentMovementTotals {
  const children = investmentChildren(data, investment.id);
  return children.length
    ? children.filter((child) => child.active).reduce(
      (totals, child) => addInvestmentMovementTotals(totals, investmentPositionMovementTotals(data, child)),
      emptyMovementTotals(),
    )
    : investmentMovementTotals(data, investment.id);
}

export function investmentPositionIsLoss(data: FinanceData, investment: Investment): boolean {
  return investmentPositionValue(data, investment) < investmentPositionInvestedCapital(data, investment);
}

export function investmentPositionResult(data: FinanceData, investment: Investment): { amount: number; rate?: number } {
  const capital = investmentPositionMovementTotals(data, investment).balance;
  const amount = investmentPositionValue(data, investment) - capital;
  return { amount, rate: capital > 0 ? amount / capital : undefined };
}

export function pensionPlans(data: FinanceData): Investment[] {
  const pensionIds = pensionInvestmentIds(data);
  return data.investments.filter((item) => pensionIds.has(item.id)
    && (!item.parentInvestmentId || !pensionIds.has(item.parentInvestmentId)));
}

export function pensionCompartments(data: FinanceData, pensionId?: string): Investment[] {
  const pensionIds = pensionInvestmentIds(data);
  return data.investments.filter((item) => pensionIds.has(item.id)
    && Boolean(item.parentInvestmentId)
    && (!pensionId || item.parentInvestmentId === pensionId));
}

export function selectableFinancialPositions(data: FinanceData): Investment[] {
  const pensionIds = pensionInvestmentIds(data);
  return data.investments.filter((item) => {
    if (!item.active || investmentChildren(data, item.id).length) return false;
    if (!pensionIds.has(item.id)) return true;
    return Boolean(item.parentInvestmentId && pensionIds.has(item.parentInvestmentId));
  });
}

export function regularInvestments(data: FinanceData): Investment[] {
  const pensionIds = pensionInvestmentIds(data);
  return data.investments.filter((item) => !pensionIds.has(item.id));
}

export function portfolioValues(data: FinanceData): { investments: number; pensions: number; combined: number } {
  const pensionIds = pensionInvestmentIds(data);
  const parents = new Set(data.investments.flatMap((item) => item.parentInvestmentId ? [item.parentInvestmentId] : []));
  const plannedTransactionIds = new Set(data.transactions.filter((item) => item.planned).map((item) => item.id));
  const entriesByInvestment = new Map<string, typeof data.investmentEntries>();
  for (const entry of data.investmentEntries) {
    if (entry.transactionId && plannedTransactionIds.has(entry.transactionId)) continue;
    if (isInvestmentCorrectionKind(entry.kind) || entry.kind === "unit_snapshot") continue;
    const entries = entriesByInvestment.get(entry.investmentId) ?? [];
    entries.push(entry);
    entriesByInvestment.set(entry.investmentId, entries);
  }
  const valueByInvestment = new Map<string, number>();
  for (const [investmentId, entries] of entriesByInvestment) {
    const value = entries.sort((left, right) => left.date.localeCompare(right.date) || investmentValueEntryOrder(left.kind) - investmentValueEntryOrder(right.kind))
      .reduce((current, entry) => {
        if (entry.kind === "contribution") return current + entry.amount;
        if (entry.kind === "withdrawal") return Math.max(0, current - entry.amount);
        return entry.amount;
      }, 0);
    valueByInvestment.set(investmentId, value);
  }
  const leaves = data.investments.filter((item) => item.active && !parents.has(item.id));
  const pensions = leaves.filter((item) => pensionIds.has(item.id)).reduce((sum, item) => sum + (valueByInvestment.get(item.id) ?? 0), 0);
  const investments = leaves.filter((item) => !pensionIds.has(item.id)).reduce((sum, item) => sum + (valueByInvestment.get(item.id) ?? 0), 0);
  return { investments, pensions, combined: investments + pensions };
}
