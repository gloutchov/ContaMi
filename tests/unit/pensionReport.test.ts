import { describe, expect, it } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { createPensionReport } from "../../src/domain/pensionReport";
import { createInvestmentReport } from "../../src/domain/investmentReport";
import type { FinanceData } from "../../src/domain/models";
import { buildPensionReportHtml } from "../../src/infrastructure/pdf/PensionReportDocument";

function position(data: FinanceData, name: string, kind: "pension" | "fund", currency = "EUR", parentInvestmentId?: string, active = true) {
  const id = crypto.randomUUID();
  data.investments.push({ id, name, kind, provider: "", currency, parentInvestmentId, active, openedAt: "2025-01-01", notes: "" });
  return id;
}

function entry(data: FinanceData, investmentId: string, date: string, kind: "contribution" | "withdrawal" | "valuation", amount: number, description = kind) {
  data.investmentEntries.push({ id: crypto.randomUUID(), investmentId, date, kind, amount, description, notes: "" });
}

describe("pension report", () => {
  it("reconciles active compartments once and calculates aggregate rates from sums", () => {
    const data = createEmptyFinanceData(2026);
    const plan = position(data, "Pension A", "pension");
    const first = position(data, "Line A", "fund", "EUR", plan);
    const second = position(data, "Line B", "fund", "EUR", plan);
    const closed = position(data, "Closed", "fund", "EUR", plan, false);
    const regular = position(data, "Regular", "fund");
    entry(data, plan, "2026-01-01", "contribution", 9_000);
    entry(data, first, "2026-01-10", "contribution", 1_000);
    entry(data, first, "2026-04-10", "valuation", 1_200);
    entry(data, second, "2026-01-10", "contribution", 2_000);
    entry(data, second, "2026-03-10", "contribution", 500);
    entry(data, second, "2026-05-10", "withdrawal", 200);
    entry(data, second, "2026-06-10", "valuation", 2_100);
    entry(data, closed, "2026-01-10", "contribution", 3_000);
    entry(data, regular, "2026-01-10", "contribution", 4_000);

    const report = createPensionReport(data, undefined, "current-year", "2026-10-24");
    const section = report.currencies[0];
    expect(section.positions.map((item) => item.name)).toEqual(["Line A", "Line B"]);
    expect(section.totals).toEqual({ initialCapital: 3_000, subsequentContributions: 500, liquidations: 200, balance: 3_300 });
    expect(section.value).toBe(3_300);
    expect(section.result).toBe(0);
    expect(section.resultRate).toBe(0);
    expect(section.positions.map((item) => item.result)).toEqual([200, -200]);
    expect(section.periods.find((item) => item.key === "2026-06")?.value).toBe(3_300);
    expect(section.periods.find((item) => item.key === "2026-11")?.value).toBeUndefined();
    expect(createPensionReport(data, plan, "current-year", "2026-10-24").currencies[0].positions).toEqual(section.positions);
    expect(createPensionReport(data, closed, "lifetime", "2026-10-24").currencies[0].value).toBe(3_000);
    expect(createInvestmentReport(data, undefined, "current-year", "2026-10-24").currencies[0].positions.map((item) => item.id)).toEqual([regular]);
    expect(() => createPensionReport(data, regular, "current-year", "2026-10-24")).toThrow("PENSION_REPORT_FAILED");
  });

  it("separates currencies and preserves rollover summaries without double counting historical rows", () => {
    const data = createEmptyFinanceData(2026);
    const plan = position(data, "Pension", "pension");
    const eur = position(data, "EUR line", "fund", "EUR", plan);
    const usd = position(data, "USD line", "fund", "USD", plan);
    data.investmentAnnualSummaries.push({ investmentId: eur, year: 2025, contributions: 1_000, withdrawals: 0, closingValue: 1_100, closingValueObservedAt: "2025-12-31" });
    entry(data, eur, "2025-03-01", "contribution", 1_000, "Retained historical row");
    entry(data, eur, "2026-03-01", "withdrawal", 100);
    entry(data, eur, "2026-04-01", "valuation", 1_050);
    entry(data, usd, "2026-01-01", "contribution", 200);
    entry(data, usd, "2026-02-01", "valuation", 220);

    const report = createPensionReport(data, plan, "lifetime", "2026-10-24");
    expect(report.currencies.map((item) => item.currency)).toEqual(["EUR", "USD"]);
    const euro = report.currencies[0];
    expect(euro.totals.balance).toBe(900);
    expect(euro.value).toBe(1_050);
    expect(euro.periods.find((item) => item.key === "2025")).toMatchObject({ capital: 1_000, value: 1_100, historicalAggregate: true });
    expect(euro.movements.filter((item) => item.description === "Retained historical row")).toHaveLength(1);
    expect(report.currencies[1].value).toBe(220);
    expect(buildPensionReportHtml(report, "it")).toContain("Le valute sono presentate separatamente");
  });

  it("includes an active compartment under a closed collector in the all-pensions total", () => {
    const data = createEmptyFinanceData(2026);
    const closedPlan = position(data, "Closed collector", "pension", "EUR", undefined, false);
    const activeChild = position(data, "Still active", "fund", "EUR", closedPlan);
    entry(data, activeChild, "2026-01-01", "contribution", 700);
    expect(createPensionReport(data, undefined, "current-year", "2026-10-24").currencies[0].positions.map((item) => item.id)).toEqual([activeChild]);
  });

  it("escapes pension and compartment text and documents missing data", () => {
    const data = createEmptyFinanceData(2026);
    const plan = position(data, '<img src=x onerror="alert(1)">', "pension");
    const child = position(data, "<script>bad</script>", "fund", "EUR", plan);
    entry(data, child, "2026-03-01", "valuation", 100, "<script>bad</script>");
    const report = createPensionReport(data, plan, "current-year", "2026-10-24");
    const html = buildPensionReportHtml(report, "en");
    expect(report.currencies[0].resultRate).toBeUndefined();
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
    expect(html).toContain("annuities");
    expect(html).toContain("position-flow-table");
    expect(html).toContain("<svg");
    expect(html).not.toContain("<script>");
    expect(() => createPensionReport(data, crypto.randomUUID(), "lifetime", "2026-10-24")).toThrow("PENSION_REPORT_FAILED");
  });

  it("renders an explicit empty state for a collector without compartments", () => {
    const data = createEmptyFinanceData(2026);
    const plan = position(data, "New pension", "pension");
    const report = createPensionReport(data, plan, "current-year", "2026-10-24");
    expect(report.currencies).toEqual([]);
    expect(buildPensionReportHtml(report, "it")).toContain("Nessun comparto disponibile");
  });
});
