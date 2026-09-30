import { describe, expect, it } from "vitest";
import { investmentReturnSeries } from "../../src/domain/assetReturns";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import { investmentMovementTotals } from "../../src/domain/investments";
import { createRolloverFinanceData } from "../../src/domain/rollover";

describe("createRolloverFinanceData", () => {
  it("carries an active vehicle installment with its remaining count and rate history", () => {
    let current = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const vehicleId = crypto.randomUUID();
    const recurringId = crypto.randomUUID();
    current.accounts.push({
      id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 5_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    current = applyFinanceCommand(current, {
      type: "addVehicleWithInstallment",
      value: {
        vehicle: { id: vehicleId, name: "Synthetic vehicle", manufacturer: "", model: "", fuelType: "electric", active: true, notes: "" },
        installment: {
          id: recurringId, name: "Synthetic vehicle", kind: "installment", direction: "expense",
          amount: 280, frequency: "monthly", categoryId: current.categories[4].id,
          paymentMethodId: current.paymentMethods[0].id, accountId, vehicleId,
          nextDueDate: "2026-12-15", remainingInstallments: 4, active: true, notes: "",
        },
      },
    });
    current = applyFinanceCommand(current, {
      type: "addRecurringRateChange",
      value: { id: crypto.randomUUID(), recurringId, amount: 300, effectiveFrom: "2027-02-01" },
    });

    const next = createRolloverFinanceData(current, 2027);

    expect(next.vehicles).toHaveLength(1);
    expect(next.recurringItems).toHaveLength(1);
    expect(next.recurringItems[0]).toMatchObject({ vehicleId, remainingInstallments: 4, nextDueDate: "2027-01-15" });
    expect(next.recurringRateChanges).toHaveLength(1);
    expect(next.transactions).toHaveLength(4);
    expect(next.vehicleEntries).toHaveLength(4);
    expect(next.vehicleEntries.every((item) => item.kind === "installment" && item.vehicleId === vehicleId)).toBe(true);
    expect(next.transactions.map((item) => item.amount)).toEqual([280, 300, 300, 300]);
  });

  it("does not carry a vehicle recurrence when its vehicle is inactive or missing", () => {
    const current = createEmptyFinanceData(2026);
    const closedVehicleId = crypto.randomUUID();
    const missingVehicleId = crypto.randomUUID();
    current.vehicles.push({
      id: closedVehicleId, name: "Closed synthetic vehicle", manufacturer: "", model: "",
      fuelType: "petrol", active: false, disposalDate: "2026-10-01", notes: "",
    });
    for (const vehicleId of [closedVehicleId, missingVehicleId]) {
      const recurringId = crypto.randomUUID();
      current.recurringItems.push({
        id: recurringId, name: "Orphan candidate", kind: "installment", direction: "expense",
        amount: 100, frequency: "monthly", categoryId: current.categories[4].id,
        paymentMethodId: current.paymentMethods[0].id, vehicleId,
        nextDueDate: "2026-12-01", remainingInstallments: 3, active: true, notes: "",
      });
      current.recurringRateChanges.push({
        id: crypto.randomUUID(), recurringId, amount: 110, effectiveFrom: "2027-01-01",
      });
    }

    const next = createRolloverFinanceData(current, 2027);

    expect(next.vehicles).toHaveLength(0);
    expect(next.recurringItems).toHaveLength(0);
    expect(next.recurringRateChanges).toHaveLength(0);
    expect(next.transactions).toHaveLength(0);
    expect(next.vehicleEntries).toHaveLength(0);
  });

  it("carries forward only confirmed account movements", () => {
    const current = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    current.accounts.push({
      id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 1_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    current.transactions.push(
      {
        id: crypto.randomUUID(), date: "2026-06-01", description: "Confirmed contribution",
        categoryId: current.categories[8].id, paymentMethodId: current.paymentMethods[0].id,
        accountId, kind: "transfer", cashFlowDirection: "outflow", amount: 100, currency: "EUR",
        notes: "", createdAt: timestamp, updatedAt: timestamp,
      },
      {
        id: crypto.randomUUID(), date: "2026-12-01", description: "Planned contribution",
        categoryId: current.categories[8].id, paymentMethodId: current.paymentMethods[0].id,
        accountId, kind: "transfer", cashFlowDirection: "outflow", amount: 200, currency: "EUR",
        planned: true, notes: "", createdAt: timestamp, updatedAt: timestamp,
      },
    );

    const next = createRolloverFinanceData(current, 2027);

    expect(next.accounts[0]?.openingBalance).toBe(900);
  });

  it("excludes movements dated before the account opening from rollover cash", () => {
    const current = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    current.accounts.push({
      id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 1_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    current.transactions.push({
      id: crypto.randomUUID(), date: "2025-12-01", description: "Synthetic historical transfer",
      categoryId: current.categories[8].id, paymentMethodId: current.paymentMethods[0].id,
      accountId, kind: "transfer", cashFlowDirection: "outflow", amount: 800, currency: "EUR",
      notes: "", createdAt: timestamp, updatedAt: timestamp,
    });

    const next = createRolloverFinanceData(current, 2027);

    expect(next.accounts[0]?.openingBalance).toBe(1_000);
  });

  it("carries only active positions, closing balances and prior-year totals", () => {
    const current = createEmptyFinanceData(2026);
    const now = new Date().toISOString();
    const accountId = crypto.randomUUID();
    const propertyId = crypto.randomUUID();
    const investmentId = crypto.randomUUID();
    const vehicleId = crypto.randomUUID();
    const activeRecurringId = crypto.randomUUID();
    current.taxTypes[0] = { ...current.taxTypes[0], name: "Legacy TV levy", active: false };
    current.accounts.push({ id: accountId, name: "Main", kind: "bank", currency: "EUR", openingBalance: 1_000, active: true, openedAt: "2020-01-01", notes: "" });
    current.transactions.push(
      { id: crypto.randomUUID(), date: "2026-02-01", description: "Income", categoryId: current.categories[0].id, paymentMethodId: current.paymentMethods[0].id, accountId, kind: "income", amount: 500, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
      { id: crypto.randomUUID(), date: "2026-02-02", description: "Expense", categoryId: current.categories[2].id, paymentMethodId: current.paymentMethods[0].id, accountId, kind: "expense", amount: 125, currency: "EUR", notes: "", createdAt: now, updatedAt: now },
    );
    current.properties.push({ id: propertyId, name: "Home", kind: "house", ownershipShare: 1, purchasePrice: 200_000, active: true, notes: "" });
    current.propertyEntries.push(
      { id: crypto.randomUUID(), propertyId, date: "2026-12-15", kind: "valuation", category: "Value", description: "Year end", amount: 230_000, notes: "" },
      { id: crypto.randomUUID(), propertyId, date: "2026-11-15", kind: "consumption", category: "Electricity", description: "Reading", amount: 0, quantity: 1250, unit: "kWh", notes: "" },
    );
    current.investments.push({ id: investmentId, name: "Fund", kind: "fund", provider: "", currency: "EUR", active: true, openedAt: "2024-01-01", notes: "" });
    current.investmentEntries.push({ id: crypto.randomUUID(), investmentId, date: "2026-12-20", kind: "valuation", amount: 20_000, description: "Year end", notes: "" });
    current.vehicles.push({ id: vehicleId, name: "Synthetic car", manufacturer: "Example", model: "One", fuelType: "hybrid", active: true, notes: "" });
    current.vehicleEntries.push({ id: crypto.randomUUID(), vehicleId, date: "2026-05-10", kind: "fuel", description: "Fuel", amount: 60, distanceKm: 700, fuelLiters: 35, odometerKm: 15_000, notes: "" });
    const plannedVehicleEntryId = crypto.randomUUID();
    const plannedVehicleTransactionId = crypto.randomUUID();
    current.vehicleEntries.push({ id: plannedVehicleEntryId, vehicleId, date: "2026-12-10", kind: "installment", description: "Planned car rate", amount: 150, transactionId: plannedVehicleTransactionId, notes: "" });
    current.transactions.push({
      id: plannedVehicleTransactionId, date: "2026-12-10", description: "Planned car rate",
      categoryId: current.categories[2].id, paymentMethodId: current.paymentMethods[0].id,
      accountId, vehicleId, vehicleEntryId: plannedVehicleEntryId, kind: "expense", amount: 150,
      currency: "EUR", planned: true, notes: "", createdAt: now, updatedAt: now,
    });
    current.recurringItems.push(
      { id: activeRecurringId, name: "Active", kind: "subscription", amount: 10, frequency: "monthly", categoryId: current.categories[7].id, paymentMethodId: current.paymentMethods[0].id, nextDueDate: "2026-12-10", active: true, notes: "" },
      { id: crypto.randomUUID(), name: "Finished", kind: "installment", amount: 10, frequency: "monthly", categoryId: current.categories[7].id, paymentMethodId: current.paymentMethods[0].id, nextDueDate: "2026-12-10", remainingInstallments: 0, active: true, notes: "" },
    );
    current.sharedExpenses.push(
      { id: crypto.randomUUID(), date: "2026-12-01", description: "Pending", categoryId: current.categories[2].id, paymentMethodId: current.paymentMethods[0].id, amount: 40, ownerShare: 20, partnerShare: 20, paidBy: "owner", settled: false, notes: "" },
      { id: crypto.randomUUID(), date: "2026-12-02", description: "Settled", categoryId: current.categories[2].id, paymentMethodId: current.paymentMethods[0].id, amount: 40, ownerShare: 20, partnerShare: 20, paidBy: "owner", settled: true, notes: "" },
    );

    const next = createRolloverFinanceData(current, 2027);

    expect(next.meta.activeYear).toBe(2027);
    expect(next.transactions.filter((item) => item.recurringId === activeRecurringId && item.planned)).toHaveLength(12);
    expect(next.accounts[0].openingBalance).toBe(1_375);
    expect(next.accounts[0].openedAt).toBe("2020-01-01");
    expect(next.propertyEntries).toMatchObject([{ propertyId, date: "2027-01-01", amount: 230_000 }]);
    expect(next.investmentEntries).toMatchObject([{ investmentId, date: "2027-01-01", amount: 20_000 }]);
    expect(next.vehicles.map((item) => item.id)).toEqual([vehicleId]);
    expect(next.vehicleEntries).toEqual([]);
    expect(next.recurringItems).toHaveLength(1);
    expect(next.recurringItems[0].nextDueDate.startsWith("2027-")).toBe(true);
    expect(next.sharedExpenses.map((item) => item.description)).toEqual(["Pending"]);
    expect(next.taxTypes[0]).toMatchObject({ name: "Legacy TV levy", active: false });
    expect(next.annualSummaries).toMatchObject([{ year: 2026, income: 500, expenses: 125, netCashFlow: 375, vehicleCosts: 60 }]);
    expect(next.propertyAnnualSummaries).toMatchObject([{ propertyId, year: 2026, electricityKwh: 1250 }]);
    expect(next.investmentAnnualSummaries).toMatchObject([{ investmentId, year: 2026, closingValue: 20_000 }]);
    expect(next.vehicleAnnualSummaries).toMatchObject([{ vehicleId, year: 2026, totalCosts: 60, fuelCosts: 60, distanceKm: 700, fuelLiters: 35, averageKmPerLiter: 20 }]);
  });

  it("uses the earliest annual investment aggregate as initial capital after rollover", () => {
    const current = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    current.investments.push({
      id: investmentId, name: "Synthetic fund", kind: "fund", provider: "", currency: "EUR",
      active: true, openedAt: "2026-01-01", notes: "",
    });
    current.investmentEntries.push(
      { id: crypto.randomUUID(), investmentId, date: "2026-01-10", kind: "contribution", amount: 1_000, description: "Initial", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-04-10", kind: "contribution", amount: 200, description: "Later", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-08-10", kind: "withdrawal", amount: 100, description: "Partial liquidation", notes: "" },
      { id: crypto.randomUUID(), investmentId, date: "2026-12-20", kind: "valuation", amount: 1_250, description: "Year end", notes: "" },
    );

    const next = createRolloverFinanceData(current, 2027);

    expect(next.investmentAnnualSummaries).toMatchObject([{
      investmentId, year: 2026, closingValue: 1_250, contributions: 1_200, withdrawals: 100,
      closingValueObservedAt: "2026-12-20", returnMethod: "original_dietz_estimate",
      returnCoverage: "estimated", returnPartialPeriod: true,
    }]);
    expect(next.investmentAnnualSummaries[0].returnRate).toBeCloseTo(150 / 1_050, 10);
    expect(investmentReturnSeries(next, next.investments[0], "2027-01-31").annual.find((point) => point.year === 2026))
      .toMatchObject({ rate: 150 / 1_050, coverage: "estimated", partialPeriod: true });
    expect(investmentMovementTotals(next, investmentId)).toEqual({
      initialCapital: 1_200,
      subsequentContributions: 0,
      liquidations: 100,
      balance: 1_100,
    });
  });

  it("preserves corrections across rollover without turning them into annual movements", () => {
    let current = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    current.investments.push({
      id: investmentId, name: "Synthetic corrected fund", kind: "fund", provider: "", currency: "EUR",
      active: true, openedAt: "2025-01-01", notes: "",
    });
    current.investmentEntries.push({
      id: crypto.randomUUID(), investmentId, date: "2026-02-01", kind: "valuation", amount: 900,
      description: "Year value", notes: "",
    });
    current = applyFinanceCommand(current, { type: "addInvestmentCorrection", value: {
      id: crypto.randomUUID(), investmentId, date: "2024-12-31", kind: "contribution_correction", amount: 35,
      description: "Inherited difference", notes: "",
    } });

    const next = createRolloverFinanceData(current, 2027);

    expect(next.investmentEntries.filter((item) => item.kind === "contribution_correction")).toMatchObject([
      { investmentId, date: "2024-12-31", amount: 35 },
    ]);
    expect(next.investmentEntries.find((item) => item.kind === "contribution_correction")).not.toHaveProperty("transactionId");
    expect(next.transactions).toHaveLength(0);
    expect(next.investmentAnnualSummaries[0]).toMatchObject({ investmentId, year: 2026, contributions: 0, withdrawals: 0 });
    expect(investmentMovementTotals(next, investmentId).subsequentContributions).toBe(35);
  });

  it("carries only the unpaid installments into the next year", () => {
    let current = createEmptyFinanceData(2026);
    current.accounts.push({ id: crypto.randomUUID(), name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 0, active: true, openedAt: "2026-01-01", notes: "" });
    const recurringId = crypto.randomUUID();
    current = applyFinanceCommand(current, { type: "addRecurringItem", value: {
      id: recurringId, name: "Synthetic cross-year plan", kind: "installment", direction: "expense",
      amount: 120, frequency: "monthly", categoryId: current.categories.find((item) => item.kind === "expense")!.id,
      paymentMethodId: current.paymentMethods[0].id, nextDueDate: "2026-11-15", endDate: "2027-03-15",
      remainingInstallments: 5, active: true, notes: "",
    } });

    for (const date of ["2026-11-15", "2026-12-15"]) {
      const installment = current.transactions.find((item) => item.recurringId === recurringId && item.date === date && item.planned)!;
      current = applyFinanceCommand(current, { type: "updateTransaction", value: { ...installment, planned: false } });
    }

    expect(current.recurringItems[0]).toMatchObject({ remainingInstallments: 3, nextDueDate: "2027-01-15", active: true });
    const next = createRolloverFinanceData(current, 2027);

    expect(next.recurringItems[0]).toMatchObject({ remainingInstallments: 3, nextDueDate: "2027-01-15", active: true });
    expect(next.transactions.filter((item) => item.recurringId === recurringId && item.planned).map((item) => item.date))
      .toEqual(["2027-01-15", "2027-02-15", "2027-03-15"]);
  });

  it("carries overdue rent periods into the next year without shifting them", () => {
    let current = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const propertyId = crypto.randomUUID();
    const recurringId = crypto.randomUUID();
    current.accounts.push({
      id: accountId, name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 0,
      active: true, openedAt: "2026-01-01", notes: "",
    });
    current = applyFinanceCommand(current, { type: "addProperty", value: {
      id: propertyId, name: "Synthetic rental", kind: "apartment", usage: "rental",
      ownershipShare: 1, purchasePrice: 100_000, active: true, notes: "",
    } });
    current = applyFinanceCommand(current, { type: "addRecurringItem", value: {
      id: recurringId, name: "Synthetic rent", kind: "rent", direction: "income", amount: 800,
      frequency: "monthly", categoryId: current.categories.find((item) => item.nameIt === "Affitti")!.id,
      paymentMethodId: current.paymentMethods[0].id, accountId, propertyId, nextDueDate: "2026-11-30", active: true, notes: "",
    } });

    const next = createRolloverFinanceData(current, 2027);
    const rentTransactions = next.transactions.filter((item) => item.recurringId === recurringId);

    expect(rentTransactions.filter((item) => item.dueDate === "2026-11-30" || item.dueDate === "2026-12-30"))
      .toHaveLength(2);
    expect(rentTransactions.filter((item) => item.dueDate === "2027-01-30" || item.dueDate === "2027-02-28" || item.dueDate === "2027-03-30"))
      .toHaveLength(3);
    expect(new Set(rentTransactions.map((item) => item.dueDate)).size).toBe(rentTransactions.length);
    expect(next.recurringItems.find((item) => item.id === recurringId)?.nextDueDate).toBe("2026-11-30");
    expect(next.propertyEntries.filter((item) => item.propertyId === propertyId && item.dueDate && item.dueDate < "2027-01-01"))
      .toHaveLength(2);
  });

  it("rolls a recurring pension contribution forward with one linked movement per transaction", () => {
    let current = createEmptyFinanceData(2026);
    current.accounts.push({ id: crypto.randomUUID(), name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 0, active: true, openedAt: "2026-01-01", notes: "" });
    const pensionId = crypto.randomUUID();
    const compartmentId = crypto.randomUUID();
    const pensionTypeId = current.investmentTypes.find((item) => item.code === "pension")!.id;
    const categoryId = current.categories.find((item) => item.nameIt === "Investimenti")!.id;
    const paymentMethodId = current.paymentMethods[0].id;
    current = applyFinanceCommand(current, { type: "addInvestment", value: {
      id: pensionId, name: "Synthetic pension", kind: "pension", typeId: pensionTypeId,
      provider: "", currency: "EUR", active: true, openedAt: "2020-01-01", notes: "",
    } });
    current = applyFinanceCommand(current, { type: "addInvestment", value: {
      id: compartmentId, name: "Synthetic compartment", kind: "pension", typeId: pensionTypeId,
      parentInvestmentId: pensionId, provider: "", currency: "EUR",
      periodicAmount: 125, periodicFrequency: "monthly", periodicNextDueDate: "2026-12-15",
      periodicCategoryId: categoryId, periodicPaymentMethodId: paymentMethodId,
      active: true, openedAt: "2020-01-01", notes: "",
    } });
    const recurringId = current.recurringItems.find((item) => item.investmentId === compartmentId)!.id;

    const next = createRolloverFinanceData(current, 2027);
    const transactions = next.transactions.filter((item) => item.recurringId === recurringId);
    const entryIds = new Set(transactions.map((item) => item.investmentEntryId));

    expect(transactions).toHaveLength(12);
    expect(entryIds.size).toBe(12);
    expect(next.investmentEntries.filter((item) => entryIds.has(item.id))).toHaveLength(12);
    expect(transactions.every((item) => item.planned
      && item.kind === "transfer"
      && item.cashFlowDirection === "outflow"
      && item.investmentId === compartmentId)).toBe(true);
    expect(next.investmentEntries.every((item) => item.kind === "contribution"
      && item.investmentId === compartmentId
      && transactions.some((transaction) => transaction.id === item.transactionId))).toBe(true);
  });

  it("persists a late rent payment in the annual summary for its competence year", () => {
    const current = createEmptyFinanceData(2027);
    const propertyId = crypto.randomUUID();
    current.properties.push({
      id: propertyId, name: "Synthetic rental", kind: "apartment", usage: "rental",
      ownershipShare: 1, purchasePrice: 100_000, active: true, notes: "",
    });
    current.propertyAnnualSummaries.push({
      propertyId, year: 2026, income: 0, expenses: 0, closingValue: 100_000,
      electricityKwh: 0, gasCubicMeters: 0, waterCubicMeters: 0,
      electricityCost: 0, gasCost: 0, waterCost: 0,
      phoneInternetCost: 0, condominiumCost: 0,
    });
    current.propertyEntries.push({
      id: crypto.randomUUID(), propertyId, date: "2027-01-05", dueDate: "2026-12-10",
      kind: "income", category: "Rent", description: "December rent paid in January", amount: 1_000,
      categoryId: current.categories[1].id, paymentMethodId: current.paymentMethods[0].id, notes: "",
    });

    const next = createRolloverFinanceData(current, 2028);

    expect(next.propertyAnnualSummaries.find((item) => item.propertyId === propertyId && item.year === 2026)?.income).toBe(1_000);
    expect(next.propertyAnnualSummaries.find((item) => item.propertyId === propertyId && item.year === 2027)?.income).toBe(0);
  });
});
