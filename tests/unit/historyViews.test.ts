import { describe, expect, it } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { investmentValueHistory, investmentValueTimeline } from "../../src/renderer/utils/investmentHistory";
import { calculatePropertyValuation, filterPropertyEntries, propertyCashFlowTimeline, propertyEntryMonths, propertyValueTimeline } from "../../src/renderer/utils/propertyHistory";
import { vehicleCostComparison, vehicleHistory, vehicleLifetimeSummary, vehicleUnitemizedCosts } from "../../src/renderer/utils/vehicleHistory";

describe("historical view helpers", () => {
  it("filters property entries by month and description", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const entries = [
      { id: crypto.randomUUID(), propertyId, date: "2026-01-10", kind: "expense" as const, category: "Luce", description: "Bolletta", amount: 50, categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), propertyId, date: "2026-02-10", kind: "expense" as const, category: "Gas", description: "Bolletta", amount: 60, categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
    ];
    expect(propertyEntryMonths(2026)).toEqual([
      "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
      "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
    expect(filterPropertyEntries(entries, "2026-02", "gas")).toEqual([entries[1]]);
  });

  it("calculates a total property valuation from its floor area", () => {
    const data = createEmptyFinanceData(2026);
    const property = { id: crypto.randomUUID(), name: "Home", kind: "apartment" as const, usage: "residence" as const, areaSqm: 92, ownershipShare: 1, purchasePrice: 0, active: true, notes: "" };
    expect(calculatePropertyValuation(property, "sqm", 0, 3_250)).toBe(299_000);
    expect(calculatePropertyValuation(property, "total", 310_000, 0)).toBe(310_000);
    expect(calculatePropertyValuation(undefined, "sqm", 0, 3_250)).toBe(0);
    data.properties.push(property);
  });

  it("keeps dated property valuations and cash flows on adaptive timelines", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const plannedEntryId = crypto.randomUUID();
    const plannedTransactionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    data.properties.push({ id: propertyId, name: "Home", kind: "apartment", usage: "rental", purchaseDate: "2025-10-01", purchasePrice: 200_000, ownershipShare: 1, active: true, notes: "" });
    data.propertyEntries.push(
      { id: crypto.randomUUID(), propertyId, date: "2026-01-15", kind: "valuation", category: "Valutazione", description: "First value", amount: 210_000, notes: "" },
      { id: crypto.randomUUID(), propertyId, date: "2026-07-20", kind: "valuation", category: "Valutazione", description: "Second value", amount: 225_000, notes: "" },
      { id: crypto.randomUUID(), propertyId, date: "2026-07-05", kind: "income", category: "Rent", description: "Rent", amount: 900, categoryId: data.categories[1].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), propertyId, date: "2026-07-18", kind: "expense", category: "Maintenance", description: "Maintenance", amount: 150, categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: plannedEntryId, propertyId, date: "2026-08-05", dueDate: "2026-08-05", kind: "income", category: "Rent", description: "Planned rent", amount: 900, categoryId: data.categories[1].id, paymentMethodId: data.paymentMethods[0].id, transactionId: plannedTransactionId, notes: "" },
    );
    data.transactions.push({
      id: plannedTransactionId, date: "2026-08-05", dueDate: "2026-08-05", description: "Planned rent",
      categoryId: data.categories[1].id, paymentMethodId: data.paymentMethods[0].id, kind: "income",
      amount: 900, currency: "EUR", propertyId, propertyEntryId: plannedEntryId, planned: true,
      notes: "", createdAt: timestamp, updatedAt: timestamp,
    });

    expect(propertyValueTimeline(data, propertyId)).toEqual([
      { date: "2025-10-01", commercialValue: 200_000 },
      { date: "2026-01-15", commercialValue: 210_000 },
      { date: "2026-07-20", commercialValue: 225_000 },
    ]);
    expect(propertyCashFlowTimeline(data, propertyId)).toEqual([
      { date: "2026-07-05", income: 900, expenses: 0 },
      { date: "2026-07-18", income: 0, expenses: 150 },
    ]);
  });

  it("carries forward compartment values in an aggregated pension history", () => {
    const data = createEmptyFinanceData(2026);
    const pensionType = data.investmentTypes.find((item) => item.code === "pension")!.id;
    const parent = crypto.randomUUID(); const first = crypto.randomUUID(); const second = crypto.randomUUID();
    data.investments.push(
      { id: parent, name: "Synthetic pension", kind: "pension", typeId: pensionType, provider: "", currency: "EUR", active: true, openedAt: "2024-01-01", notes: "" },
      { id: first, name: "First", kind: "pension", typeId: pensionType, parentInvestmentId: parent, provider: "", currency: "EUR", active: true, openedAt: "2024-01-01", notes: "" },
      { id: second, name: "Second", kind: "pension", typeId: pensionType, parentInvestmentId: parent, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" },
    );
    data.investmentAnnualSummaries.push(
      { investmentId: first, year: 2024, closingValue: 110, contributions: 100, withdrawals: 0 },
      { investmentId: second, year: 2025, closingValue: 210, contributions: 200, withdrawals: 0 },
    );

    expect(investmentValueHistory(data, parent)).toEqual([
      { year: 2024, investedValue: 100, closingValue: 110, contributions: 100, withdrawals: 0 },
      { year: 2025, investedValue: 300, closingValue: 320, contributions: 200, withdrawals: 0 },
    ]);
  });

  it("keeps every dated investment valuation in the chart timeline", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({ id: investmentId, name: "Synthetic fund", kind: "fund", typeId: data.investmentTypes[1].id, provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-10", kind: "contribution", amount: 100, description: "Contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-01-10", kind: "valuation", amount: 110, description: "Value", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-10", kind: "contribution", amount: 50, description: "Contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-10", kind: "valuation", amount: 170, description: "Value", notes: "" },
    );

    expect(investmentValueTimeline(data, investmentId)).toEqual([
      { date: "2026-01-10", investedValue: 100, closingValue: 110 },
      { date: "2026-02-10", investedValue: 150, closingValue: 170 },
    ]);
  });

  it("uses closed-year investment summaries without double counting overlapping detail rows", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({ id: investmentId, name: "Synthetic fund", kind: "fund", typeId: data.investmentTypes[1].id, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" });
    data.investmentAnnualSummaries.push({ investmentId, year: 2025, closingValue: 950, contributions: 1_000, withdrawals: 100 });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2025-06-10", kind: "contribution", amount: 999, description: "Historical detail already summarized", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-01-10", kind: "contribution", amount: 50, description: "Current contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-10", kind: "valuation", amount: 1_080, description: "Current value", notes: "" },
    );

    expect(investmentValueTimeline(data, investmentId)).toEqual([
      { date: "2025-12-31", investedValue: 900, closingValue: 950 },
      { date: "2026-01-10", investedValue: 950, closingValue: 1_000 },
      { date: "2026-02-10", investedValue: 950, closingValue: 1_080 },
    ]);
  });

  it("applies manual corrections to invested capital without changing the value timeline", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({ id: investmentId, name: "Synthetic inherited fund", kind: "fund", typeId: data.investmentTypes[1].id, provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-10", kind: "contribution", amount: 100, description: "Actual contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-01-10", kind: "valuation", amount: 110, description: "Observed value", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-10", kind: "contribution_correction", amount: 25, description: "Inherited contribution difference", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-03-10", kind: "withdrawal_correction", amount: 5, description: "Inherited liquidation difference", notes: "" },
    );

    expect(investmentValueTimeline(data, investmentId)).toEqual([
      { date: "2026-01-10", investedValue: 100, closingValue: 110 },
      { date: "2026-02-10", investedValue: 125, closingValue: 110 },
      { date: "2026-03-10", investedValue: 120, closingValue: 110 },
    ]);
  });

  it("shows prior-vehicle lifetime totals even without current-year entries", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    data.vehicles.push({ id: vehicleId, name: "Previous car", manufacturer: "", model: "", fuelType: "petrol", active: false, disposalDate: "2020-01-01", notes: "" });
    data.vehicleAnnualSummaries.push(
      { vehicleId, year: 2019, totalCosts: 1_000, fuelCosts: 500, installments: 0, taxes: 100, insurance: 200, tires: 50, maintenance: 100, repairs: 50, fuelLiters: 300, distanceKm: 4_500, closingOdometer: 90_000 },
      { vehicleId, year: 2020, totalCosts: 250, fuelCosts: 100, installments: 0, taxes: 50, insurance: 50, tires: 0, maintenance: 25, repairs: 25, fuelLiters: 60, distanceKm: 900, closingOdometer: 90_900 },
    );

    expect(vehicleHistory(data, vehicleId)).toHaveLength(2);
    expect(vehicleLifetimeSummary(data, vehicleId)).toMatchObject({ totalCosts: 1_250, fuelCosts: 600, distanceKm: 5_400, closingOdometer: 90_900 });
    expect(vehicleCostComparison(data)).toEqual([{ vehicleId, label: "Previous car", costPerKm: 1_250 / 5_400, totalCosts: 1_250, distanceKm: 5_400 }]);
  });

  it("reconciles the cost-per-kilometre numerator with unitemized history and excludes plans", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    const plannedEntryId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    data.vehicles.push({ id: vehicleId, name: "Synthetic car", manufacturer: "", model: "", fuelType: "petrol", active: true, notes: "" });
    data.vehicleAnnualSummaries.push({
      vehicleId, year: 2025, totalCosts: 1_000, fuelCosts: 200, installments: 300, taxes: 100,
      insurance: 100, tires: 0, maintenance: 0, repairs: 0, fuelLiters: 100, distanceKm: 2_000,
    });
    data.vehicleEntries.push(
      { id: crypto.randomUUID(), vehicleId, date: "2026-03-10", kind: "fuel", description: "Fuel", amount: 50, distanceKm: 500, fuelLiters: 25, notes: "" },
      { id: crypto.randomUUID(), vehicleId, date: "2026-04-10", kind: "other", description: "Other", amount: 25, notes: "" },
      { id: plannedEntryId, vehicleId, date: "2026-10-10", kind: "installment", description: "Plan", amount: 200, transactionId, notes: "" },
    );
    data.transactions.push({
      id: transactionId, date: "2026-10-10", description: "Plan", kind: "expense",
      categoryId: data.categories.find((item) => item.kind === "expense")!.id,
      paymentMethodId: data.paymentMethods[0].id, vehicleId, vehicleEntryId: plannedEntryId,
      amount: 200, currency: "EUR", planned: true, notes: "", createdAt: timestamp, updatedAt: timestamp,
    });

    const summary = vehicleLifetimeSummary(data, vehicleId);
    expect(summary).toMatchObject({ totalCosts: 1_075, fuelCosts: 250, installments: 300, distanceKm: 2_500 });
    expect(vehicleUnitemizedCosts(summary)).toBe(325);
    expect(vehicleCostComparison(data)[0].costPerKm).toBe(1_075 / 2_500);
  });
});
