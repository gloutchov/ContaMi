import { describe, expect, it } from "vitest";
import { investmentPortfolioReturnSeries, investmentReturnSeries, rentalPropertyReturnSeries } from "../../src/domain/assetReturns";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { investmentPositionResult, ROLLOVER_OPENING_VALUATION_DESCRIPTION } from "../../src/domain/investments";

const timestamp = "2026-01-01T10:00:00.000Z";

describe("asset percentage returns", () => {
  it("calculates monthly Modified Dietz returns from confirmed investment movements", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const plannedEntryId = crypto.randomUUID();
    const plannedTransactionId = crypto.randomUUID();
    const investment = {
      id: investmentId,
      name: "Synthetic fund",
      kind: "fund" as const,
      typeId: data.investmentTypes[1].id,
      provider: "",
      currency: "EUR",
      active: true,
      openedAt: "2025-01-01",
      notes: "",
    };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({ investmentId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0, closingValueObservedAt: "2025-12-31" });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-16", kind: "contribution", amount: 20, description: "Confirmed contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-01-20", kind: "contribution_correction", amount: 500, description: "Metadata correction", notes: "" },
      { id: plannedEntryId, investmentId, date: "2026-01-20", kind: "contribution", amount: 1_000, description: "Planned contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, transactionId: plannedTransactionId, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-01-31", kind: "valuation", amount: 132, description: "January closing value", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-15", kind: "withdrawal", amount: 12, description: "Confirmed withdrawal", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-28", kind: "valuation", amount: 126, description: "February closing value", notes: "" },
    );
    data.transactions.push({
      id: plannedTransactionId,
      date: "2026-01-20",
      description: "Planned contribution",
      categoryId: data.categories[8].id,
      paymentMethodId: data.paymentMethods[0].id,
      kind: "expense",
      amount: 1_000,
      currency: "EUR",
      investmentId,
      investmentEntryId: plannedEntryId,
      planned: true,
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const result = investmentReturnSeries(data, investment, "2026-02-28");
    expect(result.monthly).toHaveLength(2);
    expect(result.monthly[0]).toMatchObject({ date: "2026-01-01", coverage: "complete" });
    expect(result.monthly[0].rate).toBeCloseTo(12 / (100 + 20 * 15 / 31), 10);
    expect(result.monthly[1]).toMatchObject({ date: "2026-02-01", coverage: "complete" });
    expect(result.monthly[1].rate).toBeCloseTo(6 / (132 - 12 * 13 / 28), 10);
    expect(result.annual.find((point) => point.year === 2026)).toMatchObject({ coverage: "partial", partialPeriod: true });
    expect(result.annual.find((point) => point.year === 2026)?.rate).toBeCloseTo(
      (1 + result.monthly[0].rate!) * (1 + result.monthly[1].rate!) - 1,
      10,
    );
  });

  it("does not turn contributions or withdrawals into investment performance", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Flow-neutral fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({
      investmentId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0,
      closingValueObservedAt: "2025-12-31",
    });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-16", kind: "contribution", amount: 20, description: "Contribution only", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-01-31", kind: "valuation", amount: 120, description: "Flow-matched value", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-15", kind: "withdrawal", amount: 12, description: "Withdrawal only", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-28", kind: "valuation", amount: 108, description: "Flow-matched value", notes: "" },
    );

    expect(investmentReturnSeries(data, investment, "2026-02-28").monthly.map((point) => point.rate)).toEqual([0, 0]);
  });

  it("keeps a pre-existing loss after a later 1,000-euro contribution in investments and pensions", () => {
    const data = createEmptyFinanceData(2026);
    const pensionId = crypto.randomUUID();
    const investment = { id: crypto.randomUUID(), name: "Synthetic fund", kind: "fund" as const,
      provider: "", currency: "EUR", active: true, openedAt: "2026-01-01", notes: "" };
    const compartment = { ...investment, id: crypto.randomUUID(), name: "Synthetic compartment",
      kind: "pension" as const, parentInvestmentId: pensionId };
    data.investments.push(investment, {
      id: pensionId, name: "Synthetic pension", kind: "pension", provider: "", currency: "EUR",
      active: true, openedAt: "2026-01-01", notes: "",
    }, compartment);
    for (const position of [investment, compartment]) {
      data.investmentEntries.push(
        { id: crypto.randomUUID(), investmentId: position.id, date: "2026-01-01", kind: "contribution", amount: 1_000,
          description: "Initial contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
        { id: crypto.randomUUID(), investmentId: position.id, date: "2026-01-31", kind: "valuation", amount: 900,
          description: "Loss observation", notes: "" },
        { id: crypto.randomUUID(), investmentId: position.id, date: "2026-02-15", kind: "contribution", amount: 1_000,
          description: "Later contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
        { id: crypto.randomUUID(), investmentId: position.id, date: "2026-02-28", kind: "valuation", amount: 1_900,
          description: "Flow-matched observation", notes: "" },
      );
      const returns = investmentReturnSeries(data, position, "2026-02-28");
      expect(returns.monthly.map((point) => point.rate)).toEqual([-0.1, 0]);
      expect(investmentPositionResult(data, position)).toEqual({ amount: -100, rate: -0.05 });
    }
    expect(investmentPositionResult(data, data.investments.find((item) => item.id === pensionId)!))
      .toEqual({ amount: -100, rate: -0.05 });
  });

  it("uses the first contribution as opening capital instead of an annual cash flow", () => {
    const data = createEmptyFinanceData(2025);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "New fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-10", notes: "" };
    data.investments.push(investment);
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2025-01-10", kind: "contribution", amount: 100, description: "Initial purchase", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2025-06-30", kind: "contribution", amount: 20, description: "Later contribution", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2025-12-31", kind: "valuation", amount: 132, description: "Year-end value", notes: "" },
    );

    const result = investmentReturnSeries(data, investment, "2025-12-31");
    expect(result.monthly.find((point) => point.date === "2025-12-01")).toMatchObject({
      coverage: "partial",
      components: { kind: "investment", openingValue: 100, endingValue: 132, netFlows: 20 },
    });
    expect(result.annual.find((point) => point.year === 2025)).toMatchObject({
      rate: 12 / 110,
      coverage: "estimated",
      partialPeriod: true,
      components: { kind: "investment", openingValue: 100, endingValue: 132, netFlows: 20, weightedBase: 110 },
    });
  });

  it("uses an inception-year summary contribution as the annual opening base", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Legacy inception fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2020-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({
      investmentId, year: 2020, closingValue: 112, contributions: 100, withdrawals: 0,
    });

    expect(investmentReturnSeries(data, investment, "2026-09-05").annual).toContainEqual(expect.objectContaining({
      year: 2020,
      rate: 0.12,
      coverage: "estimated",
      partialPeriod: false,
    }));
  });

  it("calculates each monthly point between consecutive observed valuations", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Irregular-date fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({
      investmentId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0,
      closingValueObservedAt: "2025-12-18",
    });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-20", kind: "valuation", amount: 110, description: "January observation", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-05", kind: "contribution", amount: 5, description: "Contribution between observations", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-02-18", kind: "valuation", amount: 115, description: "February observation", notes: "" },
    );

    const result = investmentReturnSeries(data, investment, "2026-02-28");
    expect(result.monthly).toHaveLength(2);
    expect(result.monthly[0]).toMatchObject({
      date: "2026-01-01", rate: 0.1, coverage: "complete",
      components: { kind: "investment", openingObservedAt: "2025-12-18", endingObservedAt: "2026-01-20" },
    });
    expect(result.monthly[1]).toMatchObject({
      date: "2026-02-01", rate: 0, coverage: "complete",
      components: { kind: "investment", openingObservedAt: "2026-01-20", endingObservedAt: "2026-02-18" },
    });
  });

  it("keeps an unobserved month as a gap and marks the next multi-month interval partial", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Gapped fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({
      investmentId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0,
      closingValueObservedAt: "2025-12-31",
    });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-31", kind: "valuation", amount: 110, description: "January observation", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-03-31", kind: "valuation", amount: 121, description: "March observation", notes: "" },
    );

    const result = investmentReturnSeries(data, investment, "2026-03-31");
    expect(result.monthly).toMatchObject([
      { date: "2026-01-01", rate: 0.1, coverage: "complete" },
      { date: "2026-02-01", rate: null, coverage: "missing" },
      { date: "2026-03-01", rate: 0.1, coverage: "partial" },
    ]);
  });

  it("marks annual investment returns estimated when monthly valuation coverage is incomplete", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Sparse fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2024-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({ investmentId, year: 2025, closingValue: 110, contributions: 100, withdrawals: 0 });
    data.investmentEntries.push({ id: crypto.randomUUID(), investmentId, date: "2026-06-30", kind: "valuation", amount: 120, description: "Sparse valuation", notes: "" });

    const result = investmentReturnSeries(data, investment, "2026-09-05");
    expect(result.annual.some((point) => point.year === 2025)).toBe(false);
    expect(result.monthly.find((point) => point.date === "2026-07-01")).toMatchObject({ rate: null, coverage: "missing" });
    expect(result.annual.find((point) => point.year === 2026)).toMatchObject({
      rate: 10 / 110,
      coverage: "estimated",
      partialPeriod: true,
    });
  });

  it("does not turn a rollover opening value into a measured zero return", () => {
    const data = createEmptyFinanceData(2027);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Rolled fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({
      investmentId, year: 2026, closingValue: 100, contributions: 0, withdrawals: 0,
    });
    data.investmentEntries.push({
      id: crypto.randomUUID(), investmentId, date: "2027-01-01", kind: "valuation", amount: 100,
      description: ROLLOVER_OPENING_VALUATION_DESCRIPTION, notes: "",
    });

    const result = investmentReturnSeries(data, investment, "2027-01-31");
    expect(result.monthly).toEqual([]);
    expect(result.annual.some((point) => point.year === 2027)).toBe(false);
    expect(result.unavailableReason).toBe("insufficient-data");
  });

  it("weights multiple same-day flows over a leap-year February and leaves a zero denominator unavailable", () => {
    const data = createEmptyFinanceData(2024);
    const investmentId = crypto.randomUUID();
    const unavailableId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Leap-year fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2023-01-01", notes: "" };
    const unavailable = { id: unavailableId, name: "Same-day opening", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2024-01-31", notes: "" };
    data.investments.push(investment, unavailable);
    data.investmentAnnualSummaries.push({ investmentId, year: 2023, closingValue: 100, contributions: 100, withdrawals: 0, closingValueObservedAt: "2023-12-31" });
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2024-01-31", kind: "valuation", amount: 100, description: "January closing value", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2024-02-15", kind: "contribution", amount: 10, description: "First same-day flow", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2024-02-15", kind: "contribution", amount: 10, description: "Second same-day flow", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2024-02-15", kind: "withdrawal", amount: 5, description: "Same-day withdrawal", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2024-02-29", kind: "valuation", amount: 120, description: "Leap-day valuation", notes: "" },
      { id: crypto.randomUUID(), investmentId: unavailableId, date: "2024-01-31", kind: "valuation", amount: 0, description: "Zero opening observation", notes: "" },
      { id: crypto.randomUUID(), investmentId: unavailableId, date: "2024-02-29", kind: "contribution", amount: 100, description: "End-of-period opening", categoryId: data.categories[8].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), investmentId: unavailableId, date: "2024-02-29", kind: "valuation", amount: 100, description: "Same-day valuation", notes: "" },
    );

    const leapPoint = investmentReturnSeries(data, investment, "2024-02-29").monthly[1];
    expect(leapPoint.rate).toBeCloseTo(5 / (100 + 15 * 14 / 29), 10);
    expect(leapPoint.components).toMatchObject({ kind: "investment", openingValue: 100, endingValue: 120, netFlows: 15 });
    expect(investmentReturnSeries(data, unavailable, "2024-02-29").monthly[1]).toMatchObject({
      rate: null,
      coverage: "missing",
    });
  });

  it("aggregates position values and flows before calculating a return and rejects mixed currencies", () => {
    const data = createEmptyFinanceData(2026);
    const parentId = crypto.randomUUID();
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    const parent = { id: parentId, name: "Synthetic pension", kind: "pension" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    const first = { id: firstId, parentInvestmentId: parentId, name: "First compartment", kind: "pension" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    const second = { id: secondId, parentInvestmentId: parentId, name: "Second compartment", kind: "pension" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(parent, first, second);
    data.investmentAnnualSummaries.push(
      { investmentId: firstId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0, closingValueObservedAt: "2025-12-31" },
      { investmentId: secondId, year: 2025, closingValue: 300, contributions: 300, withdrawals: 0, closingValueObservedAt: "2025-12-31" },
    );
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId: firstId, date: "2026-01-31", kind: "valuation", amount: 110, description: "First closing value", notes: "" },
      { id: crypto.randomUUID(), investmentId: secondId, date: "2026-01-31", kind: "valuation", amount: 315, description: "Second closing value", notes: "" },
    );

    expect(investmentReturnSeries(data, parent, "2026-01-31").monthly[0].rate).toBeCloseTo(25 / 400, 10);
    second.currency = "USD";
    expect(investmentReturnSeries(data, parent, "2026-01-31")).toMatchObject({
      monthly: [],
      annual: [],
      unavailableReason: "mixed-currency",
    });
  });

  it("aggregates arbitrary portfolio roots before calculating type-comparison returns", () => {
    const data = createEmptyFinanceData(2026);
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    const first = { id: firstId, name: "First security", kind: "stock" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    const second = { id: secondId, name: "Second security", kind: "stock" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(first, second);
    data.investmentAnnualSummaries.push(
      { investmentId: firstId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0, closingValueObservedAt: "2025-12-31" },
      { investmentId: secondId, year: 2025, closingValue: 300, contributions: 300, withdrawals: 0, closingValueObservedAt: "2025-12-31" },
    );
    data.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId: firstId, date: "2026-01-31", kind: "valuation", amount: 110, description: "First value", notes: "" },
      { id: crypto.randomUUID(), investmentId: secondId, date: "2026-01-31", kind: "valuation", amount: 315, description: "Second value", notes: "" },
    );

    const result = investmentPortfolioReturnSeries(data, [first, first, second], "2026-01-31");
    expect(result.monthly[0].rate).toBeCloseTo(25 / 400, 10);
    expect(result.annual.find((point) => point.year === 2026)).toMatchObject({
      rate: 25 / 400,
      coverage: "partial",
      partialPeriod: true,
    });
  });

  it("derives labelled annual estimates from legacy summaries for investments and pension collectors", () => {
    const data = createEmptyFinanceData(2026);
    const parentId = crypto.randomUUID();
    const childId = crypto.randomUUID();
    const parent = { id: parentId, name: "Synthetic collector", kind: "pension" as const, provider: "", currency: "EUR", active: true, openedAt: "2024-01-01", notes: "" };
    data.investments.push(
      parent,
      { id: childId, parentInvestmentId: parentId, name: "Closed compartment", kind: "pension", provider: "", currency: "EUR", active: false, openedAt: "2024-01-01", closedAt: "2025-12-31", notes: "" },
    );
    data.investmentAnnualSummaries.push(
      { investmentId: childId, year: 2024, closingValue: 100, contributions: 100, withdrawals: 0 },
      { investmentId: childId, year: 2025, closingValue: 108, contributions: 0, withdrawals: 0 },
    );

    expect(investmentReturnSeries(data, parent, "2026-09-05").annual.find((point) => point.year === 2025))
      .toMatchObject({ year: 2025, rate: 0.08, coverage: "estimated", partialPeriod: false });
    expect(investmentReturnSeries(data, data.investments[1], "2026-09-05").annual.find((point) => point.year === 2025))
      .toMatchObject({ year: 2025, rate: 0.08, coverage: "estimated", partialPeriod: false });
  });

  it("geometrically links a complete year of monthly investment returns", () => {
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const investment = { id: investmentId, name: "Monthly-valued fund", kind: "fund" as const, provider: "", currency: "EUR", active: true, openedAt: "2025-01-01", notes: "" };
    data.investments.push(investment);
    data.investmentAnnualSummaries.push({ investmentId, year: 2025, closingValue: 100, contributions: 100, withdrawals: 0, closingValueObservedAt: "2025-12-31" });
    for (let month = 1; month <= 12; month += 1) {
      const closingDate = new Date(Date.UTC(2026, month, 0)).toISOString().slice(0, 10);
      data.investmentEntries.push({
        id: crypto.randomUUID(), investmentId, date: closingDate, kind: "valuation",
        amount: 100 * 1.01 ** month, description: `Month ${month}`, notes: "",
      });
    }

    const result = investmentReturnSeries(data, investment, "2026-12-31");
    expect(result.monthly).toHaveLength(12);
    expect(result.monthly.every((point) => point.coverage === "complete")).toBe(true);
    expect(result.annual.find((point) => point.year === 2026)).toMatchObject({
      coverage: "complete",
      partialPeriod: false,
    });
    expect(result.annual.find((point) => point.year === 2026)?.rate).toBeCloseTo(1.01 ** 12 - 1, 10);
  });

  it("uses rent competence dates and net confirmed cash flows for rental yields", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const plannedEntryId = crypto.randomUUID();
    const plannedTransactionId = crypto.randomUUID();
    data.properties.push({
      id: propertyId,
      name: "Synthetic rental",
      kind: "apartment",
      usage: "rental",
      ownershipShare: 0.5,
      purchaseDate: "2025-01-01",
      purchasePrice: 200_000,
      active: true,
      notes: "",
    });
    data.propertyAnnualSummaries.push({
      propertyId,
      year: 2025,
      income: 12_000,
      expenses: 2_000,
      closingValue: 200_000,
      electricityKwh: 0,
      gasCubicMeters: 0,
      waterCubicMeters: 0,
      electricityCost: 0,
      gasCost: 0,
      waterCost: 0,
      phoneInternetCost: 0,
      condominiumCost: 0,
    });
    data.propertyEntries.push(
      { id: crypto.randomUUID(), propertyId, date: "2026-02-02", dueDate: "2026-01-10", kind: "income", category: "Rent", description: "January rent paid in February", amount: 1_000, categoryId: data.categories[1].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: crypto.randomUUID(), propertyId, date: "2026-01-20", kind: "expense", category: "Maintenance", description: "Repair", amount: 100, categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id, notes: "" },
      { id: plannedEntryId, propertyId, date: "2026-02-10", dueDate: "2026-02-10", kind: "income", category: "Rent", description: "Planned rent", amount: 1_000, categoryId: data.categories[1].id, paymentMethodId: data.paymentMethods[0].id, transactionId: plannedTransactionId, notes: "" },
    );
    data.transactions.push({
      id: plannedTransactionId,
      date: "2026-02-10",
      dueDate: "2026-02-10",
      description: "Planned rent",
      categoryId: data.categories[1].id,
      paymentMethodId: data.paymentMethods[0].id,
      kind: "income",
      amount: 1_000,
      currency: "EUR",
      propertyId,
      propertyEntryId: plannedEntryId,
      planned: true,
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const result = rentalPropertyReturnSeries(data, propertyId, "2026-02-28");
    expect(result.monthly.find((point) => point.date === "2026-01-01")?.rate).toBeCloseTo(900 / 200_000, 10);
    expect(result.monthly.find((point) => point.date === "2026-02-01")?.rate).toBe(0);
    expect(result.annual.find((point) => point.year === 2025)).toMatchObject({ rate: 0.05, coverage: "complete" });
    expect(result.annual.find((point) => point.year === 2026)).toMatchObject({
      rate: 900 / 200_000,
      coverage: "partial",
      partialPeriod: true,
    });
    data.properties[0].ownershipShare = 1;
    expect(rentalPropertyReturnSeries(data, propertyId, "2026-02-28").monthly[0].rate).toBeCloseTo(result.monthly[0].rate!, 10);
  });

  it("assigns a late rent payment to the historical year of competence without inventing monthly history", () => {
    const data = createEmptyFinanceData(2027);
    const propertyId = crypto.randomUUID();
    data.properties.push({
      id: propertyId,
      name: "Synthetic late-rent property",
      kind: "apartment",
      usage: "rental",
      ownershipShare: 1,
      purchaseDate: "2026-01-01",
      purchasePrice: 100_000,
      active: true,
      notes: "",
    });
    data.propertyAnnualSummaries.push({
      propertyId,
      year: 2026,
      income: 0,
      expenses: 0,
      closingValue: 100_000,
      electricityKwh: 0,
      gasCubicMeters: 0,
      waterCubicMeters: 0,
      electricityCost: 0,
      gasCost: 0,
      waterCost: 0,
      phoneInternetCost: 0,
      condominiumCost: 0,
    });
    data.propertyEntries.push({
      id: crypto.randomUUID(),
      propertyId,
      date: "2027-01-05",
      dueDate: "2026-12-10",
      kind: "income",
      category: "Rent",
      description: "December rent paid in January",
      amount: 1_000,
      categoryId: data.categories[1].id,
      paymentMethodId: data.paymentMethods[0].id,
      notes: "",
    });

    const result = rentalPropertyReturnSeries(data, propertyId, "2027-01-31");
    expect(result.monthly.map((point) => point.date)).toEqual(["2027-01-01"]);
    expect(result.monthly[0].rate).toBe(0);
    expect(result.annual.find((point) => point.year === 2026)?.rate).toBeCloseTo(0.01, 10);
    expect(result.annual.find((point) => point.year === 2027)).toMatchObject({ rate: 0, coverage: "partial" });
  });

  it("returns an explicit gap when a rental property has no usable reference value", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    data.properties.push({
      id: propertyId, name: "Rental without value", kind: "apartment", usage: "rental",
      ownershipShare: 1, purchaseDate: "2026-01-01", purchasePrice: 0, active: true, notes: "",
    });
    data.propertyEntries.push({
      id: crypto.randomUUID(), propertyId, date: "2026-01-10", dueDate: "2026-01-10",
      kind: "income", category: "Rent", description: "Confirmed rent", amount: 1_000,
      categoryId: data.categories[1].id, paymentMethodId: data.paymentMethods[0].id, notes: "",
    });

    const result = rentalPropertyReturnSeries(data, propertyId, "2026-01-31");
    expect(result.monthly).toEqual([{ date: "2026-01-01", rate: null, coverage: "missing" }]);
    expect(result.annual).toEqual([]);
    expect(result.unavailableReason).toBe("insufficient-data");
  });
});
