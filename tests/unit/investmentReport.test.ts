import { describe, expect, it } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { createInvestmentReport } from "../../src/domain/investmentReport";
import { buildInvestmentReportHtml } from "../../src/infrastructure/pdf/InvestmentReportDocument";
import type { FinanceData } from "../../src/domain/models";

function addInvestment(data: FinanceData, name: string, currency = "EUR", parentInvestmentId?: string) {
  const id = crypto.randomUUID();
  data.investments.push({ id, name, kind: "fund", provider: "", currency, parentInvestmentId, active: true, openedAt: "2025-01-01", notes: "" });
  return id;
}

function addEntry(data: FinanceData, investmentId: string, date: string, kind: "contribution" | "withdrawal" | "valuation" | "contribution_correction", amount: number, description = kind) {
  data.investmentEntries.push({ id: crypto.randomUUID(), investmentId, date, kind, amount, description, notes: "" });
}

describe("investment report", () => {
  it("reconciles capital, result and monthly values without counting planned flows", () => {
    const data = createEmptyFinanceData(2026);
    const id = addInvestment(data, "Synthetic fund");
    addEntry(data, id, "2026-01-10", "contribution", 1_000);
    addEntry(data, id, "2026-02-10", "valuation", 900);
    addEntry(data, id, "2026-03-10", "contribution", 100);
    addEntry(data, id, "2026-04-10", "valuation", 950);
    addEntry(data, id, "2026-05-10", "contribution_correction", 50);
    const plannedId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    data.investmentEntries.push({ id: plannedId, investmentId: id, date: "2026-06-10", kind: "contribution", amount: 500, description: "Planned", transactionId, notes: "" });
    data.transactions.push({ id: transactionId, date: "2026-06-10", description: "Planned", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, kind: "transfer", cashFlowDirection: "outflow", amount: 500, currency: "EUR", investmentId: id, investmentEntryId: plannedId, planned: true, notes: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    const report = createInvestmentReport(data, id, "current-year", "2026-10-24");
    const currency = report.currencies[0];
    expect(currency.totals).toEqual({ initialCapital: 1_000, subsequentContributions: 150, liquidations: 0, balance: 1_150 });
    expect(currency.value).toBe(950);
    expect(currency.result).toBe(-200);
    expect(currency.resultRate).toBeCloseTo(-200 / 1_150);
    expect(currency.periods).toHaveLength(12);
    expect(currency.periods.find((item) => item.key === "2026-04")?.value).toBe(950);
    expect(currency.periods.find((item) => item.key === "2026-11")?.value).toBeUndefined();
    expect(currency.movements.some((item) => item.description === "Planned")).toBe(false);
  });

  it("uses archived aggregates once and keeps historical detail distinct", () => {
    const data = createEmptyFinanceData(2026);
    const id = addInvestment(data, "Old fund");
    data.investmentAnnualSummaries.push({ investmentId: id, year: 2025, contributions: 1_000, withdrawals: 0, closingValue: 1_100, closingValueObservedAt: "2025-12-31" });
    addEntry(data, id, "2025-06-01", "contribution", 1_000, "Retained historical row");
    addEntry(data, id, "2026-03-01", "withdrawal", 100);
    addEntry(data, id, "2026-04-01", "valuation", 1_000);

    const section = createInvestmentReport(data, id, "lifetime", "2026-10-24").currencies[0];
    expect(section.totals.balance).toBe(900);
    expect(section.value).toBe(1_000);
    expect(section.periods.find((item) => item.key === "2025")).toMatchObject({ capital: 1_000, value: 1_100, historicalAggregate: true });
    expect(section.periods.find((item) => item.key === "2025")?.lastValuationAt).toBe("2025-12-31");
    expect(section.periods.find((item) => item.key === "2026")?.value).toBe(1_000);
    expect(section.movements.some((item) => item.description === "Retained historical row")).toBe(true);
  });

  it("marks only observed historical summaries and limits detail without changing totals", () => {
    const data = createEmptyFinanceData(2026);
    const id = addInvestment(data, "Long history");
    data.investments[0].openedAt = "2024-01-01";
    data.investmentAnnualSummaries.push({ investmentId: id, year: 2024, contributions: 100, withdrawals: 0, closingValue: 110 });
    for (let index = 0; index < 2_001; index += 1) addEntry(data, id, "2026-02-01", "contribution", 1);

    const section = createInvestmentReport(data, id, "lifetime", "2026-10-24").currencies[0];
    expect(section.periods.find((item) => item.key === "2024")?.historicalAggregate).toBe(true);
    expect(section.periods.find((item) => item.key === "2024")?.lastValuationAt).toBeUndefined();
    expect(section.periods.find((item) => item.key === "2025")?.historicalAggregate).toBe(false);
    expect(section.movementCount).toBe(2_001);
    expect(section.movements).toHaveLength(2_000);
    expect(section.movementsTruncated).toBe(true);
    expect(section.totals.balance).toBe(2_101);
    expect(buildInvestmentReportHtml(createInvestmentReport(data, id, "current-year", "2026-10-24"), "it"))
      .toContain("Ultima valutazione");
  });

  it("separates currencies, excludes pension positions and does not double count groups", () => {
    const data = createEmptyFinanceData(2026);
    const group = addInvestment(data, "Group");
    const eur = addInvestment(data, "EUR leaf", "EUR", group);
    const usd = addInvestment(data, "USD leaf", "USD", group);
    addEntry(data, eur, "2026-01-01", "contribution", 100);
    addEntry(data, usd, "2026-01-01", "contribution", 200);
    const pensionId = crypto.randomUUID();
    data.investments.push({ id: pensionId, name: "Pension", kind: "pension", provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" });
    addEntry(data, pensionId, "2026-01-01", "contribution", 500);

    const report = createInvestmentReport(data, undefined, "current-year", "2026-10-24");
    expect(report.currencies.map((item) => item.currency)).toEqual(["EUR", "USD"]);
    expect(report.currencies.flatMap((item) => item.positions.map((position) => position.name))).toEqual(["EUR leaf", "USD leaf"]);
    expect(report.currencies.map((item) => item.value)).toEqual([100, 200]);
    expect(() => createInvestmentReport(data, pensionId, "lifetime", "2026-10-24")).toThrow("INVESTMENT_REPORT_FAILED");
  });

  it("escapes workbook text and labels absent result percentages", () => {
    const data = createEmptyFinanceData(2026);
    const id = addInvestment(data, '<img src=x onerror="alert(1)">');
    addEntry(data, id, "2026-04-01", "valuation", 100, "<script>alert(1)</script>");
    const report = createInvestmentReport(data, id, "current-year", "2026-10-24");
    const html = buildInvestmentReportHtml(report, "en");
    expect(report.currencies[0].resultRate).toBeUndefined();
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("<svg");
  });
});
