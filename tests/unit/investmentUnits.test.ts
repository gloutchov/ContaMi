import { describe, expect, it } from "vitest";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import { investmentUnitBalance, investmentUnitTimeline, portfolioValues } from "../../src/domain/investments";
import { migrateFinanceData } from "../../src/domain/migrations";
import { financeDataSchema } from "../../src/domain/models";
import { createRolloverFinanceData } from "../../src/domain/rollover";

function syntheticPosition() {
  const data = createEmptyFinanceData(2026);
  const investment = { id: crypto.randomUUID(), name: "Synthetic fund", kind: "fund" as const,
    provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" };
  const accountId = crypto.randomUUID();
  data.accounts.push({ id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
    openingBalance: 5_000, active: true, openedAt: "2026-01-01", notes: "" });
  const categoryId = data.categories.find((item) => item.nameIt === "Investimenti")!.id;
  const paymentMethodId = data.paymentMethods[0].id;
  return { data, investment, accountId, categoryId, paymentMethodId };
}

describe("investment unit history", () => {
  it("counts units from the first recorded purchase without a separate snapshot", () => {
    const { data: empty, investment, accountId, categoryId, paymentMethodId } = syntheticPosition();
    let data = applyFinanceCommand(empty, { type: "addInvestment", value: investment });
    data = applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01", kind: "contribution",
      amount: 1_500, quantity: 75, description: "First purchase", categoryId, paymentMethodId, accountId, notes: "",
    } });
    data = applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-09-28", kind: "contribution",
      amount: 500, quantity: 25, description: "Later purchase", categoryId, paymentMethodId, accountId, notes: "",
    } });

    expect(investmentUnitTimeline(data, investment.id)).toEqual([
      { date: "2026-01-01", quantity: 75, variation: 75 },
      { date: "2026-09-28", quantity: 100, variation: 25 },
    ]);
    expect(investmentUnitBalance(data, investment.id)).toBe(100);
    expect(investmentUnitBalance(createRolloverFinanceData(data, 2027), investment.id)).toBe(100);
    expect(() => applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-10-01", kind: "withdrawal",
      amount: 1_000, quantity: 101, description: "Oversold units", categoryId, paymentMethodId, accountId, notes: "",
    } })).toThrow();
  });

  it("combines same-day purchases into one dated balance and variation", () => {
    const { data, investment, categoryId, paymentMethodId } = syntheticPosition();
    data.investments.push(investment);
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01", kind: "contribution",
        amount: 1_500, quantity: 75, description: "First purchase", categoryId, paymentMethodId, notes: "" },
      { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01", kind: "contribution",
        amount: 500, quantity: 25, description: "Second purchase", categoryId, paymentMethodId, notes: "" },
    );
    expect(financeDataSchema.parse(data)).toEqual(data);
    expect(investmentUnitTimeline(data, investment.id)).toEqual([
      { date: "2026-01-01", quantity: 100, variation: 100 },
    ]);
  });

  it("does not assume zero opening units after an unquantified purchase or older history", () => {
    const { data, investment, categoryId, paymentMethodId } = syntheticPosition();
    data.investments.push(investment);
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01", kind: "contribution",
        amount: 1_000, description: "Purchase without units", categoryId, paymentMethodId, notes: "" },
      { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-02-01", kind: "contribution",
        amount: 500, quantity: 25, description: "Later purchase", categoryId, paymentMethodId, notes: "" },
    );
    expect(investmentUnitBalance(data, investment.id)).toBeUndefined();

    const withEarlierValuation = structuredClone(data);
    withEarlierValuation.investmentEntries.shift();
    withEarlierValuation.investmentEntries.push({ id: crypto.randomUUID(), investmentId: investment.id,
      date: "2026-01-01", kind: "valuation", amount: 1_000, description: "Older holding", notes: "" });
    expect(investmentUnitBalance(withEarlierValuation, investment.id)).toBeUndefined();

    const withAnnualHistory = structuredClone(data);
    withAnnualHistory.investmentEntries.shift();
    withAnnualHistory.investmentAnnualSummaries.push({ investmentId: investment.id, year: 2025,
      closingValue: 1_000, contributions: 1_000, withdrawals: 0 });
    expect(investmentUnitBalance(withAnnualHistory, investment.id)).toBeUndefined();
  });

  it("stores dated snapshots and purchase/sale quantities without changing monetary values", () => {
    const fixture = syntheticPosition();
    const { investment, accountId, categoryId, paymentMethodId } = fixture;
    let data = applyFinanceCommand(fixture.data, { type: "addInvestmentWithUnits", value: {
      investment,
      initialContribution: { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01",
        kind: "contribution", amount: 1_000, description: "Initial purchase", categoryId, paymentMethodId, accountId, notes: "" },
      unitSnapshot: { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01",
        kind: "unit_snapshot", amount: 0, quantity: 10, description: "Opening units", notes: "" },
    } });
    data = applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-02-01", kind: "contribution",
      amount: 250, quantity: 2.5, description: "Additional purchase", categoryId, paymentMethodId, accountId, notes: "",
    } });
    data = applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-03-01", kind: "withdrawal",
      amount: 100, quantity: 1, description: "Sale", categoryId, paymentMethodId, accountId, notes: "",
    } });
    expect(investmentUnitTimeline(data, investment.id)).toMatchObject([
      { date: "2026-01-01", quantity: 10, variation: null },
      { date: "2026-02-01", quantity: 12.5, variation: 2.5 },
      { date: "2026-03-01", quantity: 11.5, variation: -1 },
    ]);
    expect(investmentUnitBalance(data, investment.id)).toBe(11.5);
    expect(portfolioValues(data).investments).toBe(1_150);
    expect(data.transactions).toHaveLength(3);

    data = applyFinanceCommand(data, { type: "updateInvestmentWithUnits", value: {
      investment, unitSnapshot: { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-04-01",
        kind: "unit_snapshot", amount: 0, quantity: 11.25, description: "Counted units", notes: "" },
    } });
    expect(investmentUnitBalance(data, investment.id)).toBe(11.25);
    expect(portfolioValues(data).investments).toBe(1_150);
    expect(data.transactions).toHaveLength(3);

    const transaction = data.transactions.find((item) => item.investmentEntryId === data.investmentEntries.find((entry) => entry.date === "2026-02-01")?.id)!;
    data = applyFinanceCommand(data, { type: "updateTransaction", value: { ...transaction, amount: 275 } });
    expect(data.investmentEntries.find((entry) => entry.date === "2026-02-01")?.quantity).toBe(2.5);
  });

  it("marks history unknown after a movement without quantity and rejects negative holdings", () => {
    const fixture = syntheticPosition();
    const { investment, accountId, categoryId, paymentMethodId } = fixture;
    let data = applyFinanceCommand(fixture.data, { type: "addInvestmentWithUnits", value: {
      investment, unitSnapshot: { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-01-01",
        kind: "unit_snapshot", amount: 0, quantity: 3, description: "Opening units", notes: "" },
    } });
    expect(() => applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-02-01", kind: "withdrawal",
      amount: 100, quantity: 4, description: "Oversold", categoryId, paymentMethodId, accountId, notes: "",
    } })).toThrow();
    data = applyFinanceCommand(data, { type: "addInvestmentEntry", value: {
      id: crypto.randomUUID(), investmentId: investment.id, date: "2026-02-01", kind: "contribution",
      amount: 100, description: "Unknown units", categoryId, paymentMethodId, accountId, notes: "",
    } });
    expect(investmentUnitTimeline(data, investment.id).at(-1)).toMatchObject({ quantity: null, variation: null });
    data = applyFinanceCommand(data, { type: "updateInvestmentWithUnits", value: {
      investment, unitSnapshot: { id: crypto.randomUUID(), investmentId: investment.id, date: "2026-03-01",
        kind: "unit_snapshot", amount: 0, quantity: 5, description: "New observed balance", notes: "" },
    } });
    expect(investmentUnitBalance(data, investment.id)).toBe(5);
    expect(financeDataSchema.parse(data)).toEqual(data);
  });

  it("migrates v12 without invented quantities and carries a known balance through rollover", () => {
    const fixture = syntheticPosition();
    const legacy = structuredClone(fixture.data);
    legacy.meta.schemaVersion = 12 as 13;
    legacy.investments.push(fixture.investment);
    const migrated = migrateFinanceData(legacy);
    expect(migrated.meta.schemaVersion).toBe(13);
    expect(migrated.investmentEntries).toEqual([]);
    expect(migrateFinanceData(migrated)).toEqual(migrated);

    const data = applyFinanceCommand(migrated, { type: "updateInvestmentWithUnits", value: {
      investment: fixture.investment,
      unitSnapshot: { id: crypto.randomUUID(), investmentId: fixture.investment.id, date: "2026-08-01",
        kind: "unit_snapshot", amount: 0, quantity: 7.125, description: "Known balance", notes: "" },
    } });
    const rolled = createRolloverFinanceData(data, 2027);
    expect(investmentUnitBalance(rolled, fixture.investment.id)).toBe(7.125);
    expect(rolled.investmentEntries.filter((entry) => entry.kind === "unit_snapshot")).toHaveLength(1);
  });
});
