import { describe, expect, it } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { createPropertyReport, PROPERTY_REPORT_DETAIL_LIMIT } from "../../src/domain/propertyReport";
import type { FinanceData, PropertyEntry } from "../../src/domain/models";
import { buildPropertyReportHtml, propertyReportFileName } from "../../src/infrastructure/pdf/PropertyReportDocument";

function reportFixture(): { data: FinanceData; propertyId: string } {
  const data = createEmptyFinanceData(2026);
  const propertyId = crypto.randomUUID();
  const categoryId = data.categories.find((item) => item.kind === "expense" || item.kind === "both")!.id;
  const incomeCategoryId = data.categories.find((item) => item.kind === "income" || item.kind === "both")!.id;
  const paymentMethodId = data.paymentMethods[0]!.id;
  const accountId = crypto.randomUUID();
  data.accounts.push({ id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR", openingBalance: 0, active: true, openedAt: "2024-01-01", notes: "" });
  data.properties.push({
    id: propertyId,
    name: "Synthetic shared home",
    kind: "apartment",
    usage: "residence",
    address: "10 Example Street",
    areaSqm: 80,
    ownershipShare: 0.4,
    purchaseDate: "2024-06-01",
    purchasePrice: 180_000,
    active: true,
    notes: "",
  });
  const expense = (date: string, description: string, amount: number, extra: Partial<PropertyEntry> = {}): PropertyEntry => ({
    id: crypto.randomUUID(), propertyId, date, kind: "expense", category: "Home", categoryId,
    description, amount, paymentMethodId, accountId, notes: "", ...extra,
  });
  data.propertyEntries.push(
    { id: crypto.randomUUID(), propertyId, date: "2026-01-10", kind: "valuation", category: "Market", description: "January valuation", amount: 210_000, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: "2026-08-15", kind: "valuation", category: "Market", description: "August valuation", amount: 220_000, notes: "" },
    { id: crypto.randomUUID(), propertyId, date: "2026-02-05", kind: "income", category: "Rent", categoryId: incomeCategoryId, description: "Synthetic income", amount: 1_000, paymentMethodId, accountId, notes: "" },
    expense("2026-02-10", "Electricity bill", 120, { detailKind: "utility_electricity", quantity: 300, unit: "kWh" }),
    expense("2026-03-12", "Condominium installment", 500),
    expense("2026-04-08", "Water bill", 60, { detailKind: "utility_water", quantity: 12, unit: "m³" }),
  );
  data.propertyWaterReadings.push({
    id: crypto.randomUUID(), propertyId, periodStart: "2026-04-01", periodEnd: "2026-04-30", readingDate: "2026-05-02",
    measurementMode: "period_consumption", coldCubicMeters: 7.5, hotCubicMeters: 3.25, totalCost: 48,
    coldStartsNewCycle: false, hotStartsNewCycle: false, notes: "Synthetic statistical reading",
  });
  const plannedTransactionId = crypto.randomUUID();
  data.propertyEntries.push(expense("2026-09-15", "Planned maintenance", 240, { transactionId: plannedTransactionId }));
  data.transactions.push({
    id: plannedTransactionId, date: "2026-09-15", dueDate: "2026-09-15", description: "Planned maintenance",
    categoryId, paymentMethodId, accountId, kind: "expense", amount: 240, currency: "EUR", propertyId,
    propertyEntryId: data.propertyEntries.at(-1)!.id, planned: true, notes: "", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  });
  data.propertyAnnualSummaries.push(
    { propertyId, year: 2024, income: 0, expenses: 1_000, closingValue: 190_000, electricityKwh: 900, gasCubicMeters: 400, waterCubicMeters: 80, electricityCost: 400, gasCost: 300, waterCost: 100, phoneInternetCost: 200, condominiumCost: 350 },
    { propertyId, year: 2025, income: 200, expenses: 1_100, closingValue: 205_000, electricityKwh: 850, gasCubicMeters: 380, waterCubicMeters: 75, electricityCost: 390, gasCost: 280, waterCost: 95, phoneInternetCost: 210, condominiumCost: 360 },
  );
  return { data, propertyId };
}

describe("property owner reports", () => {
  it("builds a twelve-month current-year report with reconciled shares and forecasts", () => {
    const { data, propertyId } = reportFixture();
    const report = createPropertyReport(data, propertyId, "current-year", ["Alex", "Morgan"], "2026-08-22");

    expect(report.periodGranularity).toBe("month");
    expect(report.periods).toHaveLength(12);
    expect(report.periods[1]).toMatchObject({ key: "2026-02", income: 1_000, expenses: 120, electricityCost: 120, electricityConsumption: 300, marketValue: 210_000 });
    expect(report.periods[2]).toMatchObject({ condominiumCost: 500 });
    expect(report.periods[3]).toMatchObject({ waterCost: 60, waterConsumption: 12, condominiumColdWaterConsumption: 7.5, condominiumHotWaterConsumption: 3.25, condominiumWaterCost: 48 });
    expect(report.periods[7]?.marketValue).toBe(220_000);
    expect(report.periods[8]?.marketValue).toBeUndefined();
    expect(report).toMatchObject({ actualIncome: 1_000, actualExpenses: 680, forecastExpenseTotal: 240, projectedExpenseTotal: 920, currentMarketValue: 220_000 });
    expect(report.forecastExpenses).toEqual([{ date: "2026-09-15", description: "Planned maintenance", amount: 240 }]);
    expect(report.condominiumMovements).toHaveLength(1);
    expect(report.ownerAllocations).toEqual([
      { name: "Alex", share: 0.4, actualExpenses: 272, forecastExpenses: 96, projectedExpenses: 368, marketValue: 88_000 },
      { name: "Morgan", share: 0.6, actualExpenses: 408, forecastExpenses: 144, projectedExpenses: 552, marketValue: 132_000 },
    ]);
  });

  it("combines annual summaries with active-year detail without double counting", () => {
    const { data, propertyId } = reportFixture();
    const report = createPropertyReport(data, propertyId, "lifetime", ["Owner", "Co-owner"], "2026-08-22");

    expect(report.periodGranularity).toBe("year");
    expect(report.periods.map((item) => item.key)).toEqual(["2024", "2025", "2026"]);
    expect(report.periods[0]).toMatchObject({ expenses: 1_000, electricityConsumption: 900, condominiumCost: 350, marketValue: 190_000, historicalAggregate: true });
    expect(report.periods[1]).toMatchObject({ income: 200, expenses: 1_100, marketValue: 205_000, historicalAggregate: true });
    expect(report.periods[2]).toMatchObject({ income: 1_000, expenses: 680, condominiumWaterCost: 48, condominiumColdWaterConsumption: 7.5, condominiumHotWaterConsumption: 3.25, marketValue: 220_000, historicalAggregate: false });
    expect(report.actualIncome).toBe(1_200);
    expect(report.actualExpenses).toBe(2_780);
    expect(report.costTrend).toEqual([{ year: 2024, expenses: 1_000 }, { year: 2025, expenses: 1_100 }, { year: 2026, expenses: 680 }]);
    expect(report.hasHistoricalAggregates).toBe(true);
  });

  it("bounds detailed rows while keeping complete totals", () => {
    const { data, propertyId } = reportFixture();
    const template = data.propertyEntries.find((item) => item.kind === "expense")!;
    data.propertyEntries = data.propertyEntries.filter((item) => item.kind === "valuation");
    data.propertyEntries.push(...Array.from({ length: PROPERTY_REPORT_DETAIL_LIMIT + 1 }, (_, index) => ({
      ...template,
      id: crypto.randomUUID(),
      date: "2026-05-01",
      description: `Synthetic condominium row ${index}`,
      amount: 1,
      transactionId: undefined,
    })));
    const planned = data.transactions.find((item) => item.planned)!;
    data.transactions = Array.from({ length: PROPERTY_REPORT_DETAIL_LIMIT + 1 }, (_, index) => ({
      ...planned,
      id: crypto.randomUUID(),
      description: `Synthetic planned row ${index}`,
      amount: 1,
      propertyEntryId: undefined,
    }));

    const report = createPropertyReport(data, propertyId, "current-year", ["Owner", "Co-owner"], "2026-08-22");

    expect(report.actualExpenses).toBe(PROPERTY_REPORT_DETAIL_LIMIT + 1);
    expect(report.movements).toHaveLength(PROPERTY_REPORT_DETAIL_LIMIT);
    expect(report.totalMovementCount).toBe(PROPERTY_REPORT_DETAIL_LIMIT + 1);
    expect(report.movementsTruncated).toBe(true);
    expect(report.condominiumMovements).toHaveLength(PROPERTY_REPORT_DETAIL_LIMIT);
    expect(report.totalCondominiumMovementCount).toBe(PROPERTY_REPORT_DETAIL_LIMIT + 1);
    expect(report.condominiumMovementsTruncated).toBe(true);
    expect(report.forecastExpenses).toHaveLength(PROPERTY_REPORT_DETAIL_LIMIT);
    expect(report.totalForecastExpenseCount).toBe(PROPERTY_REPORT_DETAIL_LIMIT + 1);
    expect(report.forecastExpensesTruncated).toBe(true);
    expect(report.forecastExpenseTotal).toBe(PROPERTY_REPORT_DETAIL_LIMIT + 1);
  });

  it("renders a complete bilingual document and escapes every user string", () => {
    const { data, propertyId } = reportFixture();
    data.properties[0]!.name = "Home <script>alert('x')</script>";
    data.propertyEntries.find((item) => item.kind === "income")!.description = "Income <img src=x>";
    const report = createPropertyReport(data, propertyId, "current-year", ["<Owner>", "Co & owner"], "2026-08-22");

    const htmlIt = buildPropertyReportHtml(report, "it");
    const htmlEn = buildPropertyReportHtml(report, "en");

    expect(htmlIt).toContain("Sintesi economica");
    expect(htmlIt).toContain("Utenze: costi e consumi");
    expect(htmlEn).toContain("Allocation by owner");
    expect(htmlEn).toContain("Forecast expenses from today through year-end");
    expect(htmlIt).toContain("Home &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(htmlIt).toContain("&lt;Owner&gt;");
    expect(htmlIt).not.toContain("<script>");
    expect(htmlIt).not.toContain("<img src=x>");
    expect(propertyReportFileName(report)).toMatch(/^ContaMi-report-Home-script-alert-x-script-current-year-2026-08-22\.pdf$/);
  });
});
