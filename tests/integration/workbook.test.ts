import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import { ExcelWorkbookRepository } from "../../src/infrastructure/spreadsheet/ExcelWorkbookRepository";
import { WORKBOOK_TABLES_V3, WORKBOOK_TABLES_V4, WORKBOOK_TABLES_V7 } from "../../src/infrastructure/spreadsheet/workbookSchema";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

function withoutId(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id"));
}

describe("ExcelWorkbookRepository", () => {
  it("round-trips an in-place correction to a legacy historical investment movement", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-historical-investment-edit-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-historical-investment.xlsx");
    let data = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const investmentId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const categoryId = data.categories.find((item) => item.nameIt === "Investimenti")!.id;
    const paymentMethodId = data.paymentMethods[0].id;
    const timestamp = new Date().toISOString();
    data.accounts.push({
      id: accountId, name: "Synthetic current-year account", kind: "bank", currency: "EUR",
      openingBalance: 2_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    data.investments.push({
      id: investmentId, name: "Synthetic legacy investment", kind: "fund", provider: "",
      currency: "EUR", active: true, openedAt: "2025-01-01", notes: "",
    });
    data.investmentEntries.push({
      id: entryId, investmentId, date: "2025-05-20", kind: "contribution", amount: 800,
      description: "Synthetic historical contribution", categoryId, paymentMethodId, accountId, transactionId, notes: "",
    });
    data.transactions.push({
      id: transactionId, date: "2025-05-20", description: "Synthetic historical contribution",
      categoryId, paymentMethodId, accountId, kind: "transfer", cashFlowDirection: "outflow", amount: 800,
      currency: "EUR", investmentId, investmentEntryId: entryId, shared: false, planned: false,
      sharedPaidBy: "owner", sharedSettled: false, notes: "", createdAt: timestamp, updatedAt: timestamp,
    });
    data.investmentAnnualSummaries.push({
      investmentId, year: 2025, closingValue: 820, contributions: 800, withdrawals: 0,
      closingValueObservedAt: "2025-12-31", returnRate: 0.025,
      returnMethod: "original_dietz_estimate", returnCoverage: "estimated", returnPartialPeriod: false,
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);
    data = await repository.load(filePath);
    expect(data.investmentAnnualSummaries[0]).toMatchObject({
      closingValueObservedAt: "2025-12-31", returnRate: 0.025,
      returnMethod: "original_dietz_estimate", returnCoverage: "estimated", returnPartialPeriod: false,
    });

    data = applyFinanceCommand(data, { type: "updateInvestmentEntry", value: {
      ...data.investmentEntries[0], amount: 775, description: "Corrected synthetic contribution",
    } });
    await repository.save(filePath, data);
    const loaded = await repository.load(filePath);

    expect(loaded.investmentEntries).toHaveLength(1);
    expect(loaded.transactions).toHaveLength(1);
    expect(loaded.investmentEntries[0]).toMatchObject({ id: entryId, transactionId, amount: 775, date: "2025-05-20" });
    expect(loaded.transactions[0]).toMatchObject({ id: transactionId, investmentEntryId: entryId, amount: 775, date: "2025-05-20" });
    expect(loaded.investmentAnnualSummaries[0]).toMatchObject({ investmentId, year: 2025, contributions: 775, withdrawals: 0 });
    expect(loaded.investmentAnnualSummaries[0].closingValueObservedAt).toBe("2025-12-31");
    expect(loaded.investmentAnnualSummaries[0].returnRate).toBeUndefined();
    expect(loaded.investmentAnnualSummaries[0].returnMethod).toBeUndefined();
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);
  });

  it("round-trips a manual investment correction without creating transaction links", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-investment-correction-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-investment-correction.xlsx");
    let data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({
      id: investmentId, name: "Synthetic inherited fund", kind: "fund", provider: "", currency: "EUR",
      active: true, openedAt: "2025-01-01", notes: "",
    });
    data = applyFinanceCommand(data, { type: "addInvestmentCorrectionWithIsin", value: {
      correction: {
        id: crypto.randomUUID(), investmentId, date: "2025-12-31", kind: "contribution_correction", amount: 42,
        description: "Synthetic imported difference", notes: "No cash movement",
      },
      isin: "ZZTESTABCDE7",
    } });

    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);
    const loaded = await repository.load(filePath);

    expect(loaded.meta.schemaVersion).toBe(12);
    expect(loaded.investmentEntries).toMatchObject([{
      investmentId, kind: "contribution_correction", amount: 42,
    }]);
    expect(loaded.investmentEntries[0]).not.toHaveProperty("categoryId");
    expect(loaded.investmentEntries[0]).not.toHaveProperty("paymentMethodId");
    expect(loaded.investmentEntries[0]).not.toHaveProperty("accountId");
    expect(loaded.investmentEntries[0]).not.toHaveProperty("transactionId");
    expect(loaded.investments[0]?.isin).toBe("ZZTESTABCDE7");
    expect(loaded.transactions).toEqual([]);
  });

  it("round-trips an atomic vehicle installment and its bidirectional planned records", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-vehicle-installment-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-vehicle-installment.xlsx");
    let data = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const vehicleId = crypto.randomUUID();
    const recurringId = crypto.randomUUID();
    data.accounts.push({
      id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 8_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    data = applyFinanceCommand(data, {
      type: "addVehicleWithInstallment",
      value: {
        vehicle: { id: vehicleId, name: "Synthetic vehicle", manufacturer: "Example", model: "Roundtrip", fuelType: "electric", active: true, notes: "" },
        installment: {
          id: recurringId, name: "Synthetic vehicle", kind: "installment", direction: "expense",
          amount: 410, frequency: "monthly", categoryId: data.categories[4].id,
          paymentMethodId: data.paymentMethods[0].id, accountId, vehicleId,
          nextDueDate: "2026-10-10", remainingInstallments: 3, active: true, notes: "",
        },
      },
    });
    data = applyFinanceCommand(data, {
      type: "addRecurringRateChange",
      value: { id: crypto.randomUUID(), recurringId, amount: 430, effectiveFrom: "2026-11-01" },
    });
    const repository = new ExcelWorkbookRepository();

    await repository.save(filePath, data);
    const loaded = await repository.load(filePath);

    expect(loaded).toEqual(data);
    expect(loaded.recurringItems).toHaveLength(1);
    expect(loaded.recurringRateChanges).toHaveLength(1);
    expect(loaded.transactions).toHaveLength(3);
    expect(loaded.vehicleEntries).toHaveLength(3);
    loaded.transactions.forEach((transaction) => {
      expect(transaction).toMatchObject({ recurringId, vehicleId, planned: true });
      expect(loaded.vehicleEntries.find((item) => item.id === transaction.vehicleEntryId)).toMatchObject({
        transactionId: transaction.id,
        kind: "installment",
      });
    });
  });

  it("round-trips calculated vehicle fields, supported fuel codes, legacy text and an empty fuel type", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-vehicle-entry-assistance-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-vehicle-entry-assistance.xlsx");
    const data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    data.vehicles.push({
      id: vehicleId, name: "Synthetic vehicle", manufacturer: "Example", model: "Fuel", fuelType: "petrol", active: true, notes: "",
    });
    data.vehicleEntries.push(
      {
        id: crypto.randomUUID(), vehicleId, date: "2026-05-10", kind: "fuel", description: "Synthetic hydrogen fuel",
        amount: 60, odometerKm: 10_750, distanceKm: 750, fuelLiters: 30, fuelUnitPrice: 2, fuelType: "hydrogen", notes: "",
      },
      {
        id: crypto.randomUUID(), vehicleId, date: "2026-06-10", kind: "fuel", description: "Synthetic legacy fuel",
        amount: 45, fuelLiters: 25, fuelType: "legacy synthetic value", notes: "",
      },
      {
        id: crypto.randomUUID(), vehicleId, date: "2026-07-10", kind: "fuel", description: "Synthetic fuel without type",
        amount: 30, fuelLiters: 15, notes: "",
      },
    );
    const repository = new ExcelWorkbookRepository();

    await repository.save(filePath, data);
    const loaded = await repository.load(filePath);

    expect(loaded.vehicleEntries).toEqual(data.vehicleEntries);
    expect(loaded.vehicleEntries.map((entry) => entry.fuelType)).toEqual(["hydrogen", "legacy synthetic value", undefined]);
  });

  it("round-trips typed finance data and writes human-readable sheets", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-2026.xlsx");
    const data = createEmptyFinanceData(2026);
    const bankId = crypto.randomUUID();
    const cashId = crypto.randomUUID();
    data.accounts.push(
      { id: bankId, name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 1_000, active: true, openedAt: "2026-01-01", notes: "" },
      { id: cashId, name: "Synthetic cash", kind: "cash", defaultFundingAccountId: bankId, currency: "EUR", openingBalance: 25, active: true, openedAt: "2026-01-01", notes: "" },
    );
    const timestamp = new Date().toISOString();
    data.transactions.push({
      id: crypto.randomUUID(), date: "2026-05-10", description: "Test entry",
      categoryId: data.categories[0].id, paymentMethodId: data.paymentMethods[0].id, accountId: bankId, destinationAccountId: cashId,
      kind: "transfer", cashFlowDirection: "neutral", amount: 123.45, currency: "EUR", notes: "", createdAt: timestamp, updatedAt: timestamp,
    });
    const recurringId = crypto.randomUUID();
    data.recurringItems.push({
      id: recurringId, name: "Synthetic service", kind: "service", direction: "expense", amount: 50,
      frequency: "monthly", categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id,
      accountId: bankId, nextDueDate: "2026-09-01", active: true, notes: "",
    });
    data.recurringRateChanges.push({
      id: crypto.randomUUID(), recurringId, amount: 60, effectiveFrom: "2026-10-01",
    });
    const propertyId = crypto.randomUUID();
    data.properties.push({ id: propertyId, name: "Synthetic home", kind: "apartment", usage: "residence", areaSqm: 80, ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    data.propertyEntries.push({
      id: crypto.randomUUID(), propertyId, date: "2026-06-01", kind: "valuation", category: "Valutazione",
      description: "Value per square metre", amount: 240_000, valuePerSqm: 3_000, notes: "",
    });
    data.propertyEntries.push({
      id: crypto.randomUUID(), propertyId, date: "2026-06-16", kind: "expense", category: "IMU",
      categoryId: data.categories[3].id, description: "Synthetic property tax", amount: 350,
      taxTypeId: data.taxTypes.find((item) => item.name === "IMU")!.id, taxInstallmentNumber: 2,
      paymentMethodId: data.paymentMethods[0].id, accountId: bankId, notes: "",
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);
    const loaded = await repository.load(filePath);
    expect(loaded).toEqual(data);
    const bytes = await readFile(filePath);
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    expect(workbook.getWorksheet("Tax Types")?.getRow(1).values).toContain("installments");
    expect(workbook.getWorksheet("Property Entries")?.getRow(1).values).toContain("taxTypeId");
    expect(workbook.getWorksheet("Property History")?.getRow(1).values).toContain("phoneInternetCost");
    expect(workbook.getWorksheet("Accounts")?.getRow(1).values).toContain("defaultFundingAccountId");
    expect(workbook.getWorksheet("Transactions")?.getRow(1).values).toContain("destinationAccountId");
    expect(workbook.getWorksheet("Transactions")?.getRow(1).values).toContain("dueDate");
    expect(workbook.getWorksheet("Property Entries")?.getRow(1).values).toContain("accountId");
    expect(workbook.getWorksheet("Property Entries")?.getRow(1).values).toContain("dueDate");
    expect(workbook.getWorksheet("Recurring Rate Changes")?.getRow(2).getCell(3).value).toBe(60);
  });

  it("migrates version 8 to an empty rate history without changing existing amounts", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-v8-rates-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-v8.xlsx");
    const data = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const recurringId = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    data.accounts.push({ id: accountId, name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 0, active: true, openedAt: "2026-01-01", notes: "" });
    data.recurringItems.push({
      id: recurringId, name: "Synthetic legacy service", kind: "service", direction: "expense", amount: 75,
      frequency: "monthly", categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id,
      accountId, nextDueDate: "2026-08-15", active: true, notes: "",
    });
    data.transactions.push({
      id: transactionId, date: "2026-08-15", dueDate: "2026-08-15", description: "Synthetic legacy service",
      categoryId: data.categories[3].id, paymentMethodId: data.paymentMethods[0].id, accountId,
      kind: "expense", amount: 75, currency: "EUR", recurringId, planned: true, notes: "", createdAt: timestamp, updatedAt: timestamp,
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbook.getWorksheet("_Meta")!.getCell("B2").value = 8;
    workbook.removeWorksheet(workbook.getWorksheet("Recurring Rate Changes")!.id);
    await workbook.xlsx.writeFile(filePath);

    const migrated = await repository.loadWithUuidRepair(filePath);

    expect(migrated.migratedSchema).toBe(true);
    expect(migrated.data.meta.schemaVersion).toBe(12);
    expect(migrated.data.recurringRateChanges).toEqual([]);
    expect(migrated.data.recurringItems[0]).toMatchObject({ id: recurringId, amount: 75 });
    expect(migrated.data.transactions.find((item) => item.id === transactionId)).toMatchObject({ amount: 75, planned: true });
    expect((await readdir(path.join(directory, ".contami-backups"))).length).toBeGreaterThan(0);
  });

  it("migrates version 7 planned rent dates without assigning an ambiguous confirmed receipt", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-v7-rent-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-v7.xlsx");
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    const recurringId = crypto.randomUUID();
    const confirmedTransactionId = crypto.randomUUID();
    const confirmedEntryId = crypto.randomUUID();
    const plannedTransactionId = crypto.randomUUID();
    const plannedEntryId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const categoryId = data.categories.find((item) => item.nameIt === "Affitti")!.id;
    const paymentMethodId = data.paymentMethods[0].id;
    data.properties.push({ id: propertyId, name: "Synthetic rental", kind: "apartment", usage: "rental", ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    data.recurringItems.push({ id: recurringId, name: "Synthetic rent", kind: "rent", direction: "income", amount: 800, frequency: "monthly", categoryId, paymentMethodId, propertyId, nextDueDate: "2026-08-15", active: true, notes: "" });
    data.transactions.push(
      { id: confirmedTransactionId, date: "2026-07-04", description: "Synthetic rent", categoryId, paymentMethodId, kind: "income", amount: 800, currency: "EUR", recurringId, propertyId, propertyEntryId: confirmedEntryId, planned: false, notes: "", createdAt: timestamp, updatedAt: timestamp },
      { id: plannedTransactionId, date: "2026-08-15", description: "Synthetic rent", categoryId, paymentMethodId, kind: "income", amount: 800, currency: "EUR", recurringId, propertyId, propertyEntryId: plannedEntryId, planned: true, notes: "", createdAt: timestamp, updatedAt: timestamp },
    );
    data.propertyEntries.push(
      { id: confirmedEntryId, propertyId, date: "2026-07-04", kind: "income", category: "Affitti", categoryId, description: "Synthetic rent", amount: 800, paymentMethodId, transactionId: confirmedTransactionId, notes: "" },
      { id: plannedEntryId, propertyId, date: "2026-08-15", kind: "income", category: "Affitti", categoryId, description: "Synthetic rent", amount: 800, paymentMethodId, transactionId: plannedTransactionId, notes: "" },
    );
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbook.getWorksheet("_Meta")!.getCell("B2").value = 7;
    for (const key of ["transactions", "propertyEntries"] as const) {
      const definition = WORKBOOK_TABLES_V7.find((item) => item.key === key)!;
      const current = workbook.getWorksheet(definition.sheet)!;
      workbook.removeWorksheet(current.id);
      const legacy = workbook.addWorksheet(definition.sheet);
      legacy.addRow(definition.columns);
      legacy.addRows(data[key].map((item) => definition.columns.map((column) => (item as unknown as Record<string, unknown>)[column] ?? null)));
    }
    await workbook.xlsx.writeFile(filePath);

    const migrated = await repository.load(filePath);

    expect(migrated.meta.schemaVersion).toBe(12);
    expect(migrated.transactions.find((item) => item.id === plannedTransactionId)?.dueDate).toBe("2026-08-15");
    expect(migrated.propertyEntries.find((item) => item.id === plannedEntryId)?.dueDate).toBe("2026-08-15");
    expect(migrated.transactions.find((item) => item.id === confirmedTransactionId)?.dueDate).toBeUndefined();
    expect(migrated.propertyEntries.find((item) => item.id === confirmedEntryId)?.dueDate).toBeUndefined();
  });

  it("repairs manually duplicated UUIDs in place and keeps a recoverable backup", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-uuid-repair-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-2026.xlsx");
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    data.investments.push({
      id: investmentId,
      name: "Synthetic fund",
      kind: "fund",
      provider: "",
      currency: "EUR",
      active: true,
      openedAt: "2026-01-01",
      notes: "",
    });
    data.investmentEntries.push(
      {
        id: crypto.randomUUID(),
        investmentId,
        date: "2026-01-31",
        kind: "valuation",
        amount: 35_000,
        description: "January valuation",
        notes: "",
      },
      {
        id: crypto.randomUUID(),
        investmentId,
        date: "2026-02-28",
        kind: "valuation",
        amount: 36_000,
        description: "February valuation",
        notes: "",
      },
    );
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const manuallyEdited = new ExcelJS.Workbook();
    await manuallyEdited.xlsx.readFile(filePath);
    const entries = manuallyEdited.getWorksheet("Investment Entries")!;
    entries.getCell("A3").value = entries.getCell("A2").value;
    const sheetCount = manuallyEdited.worksheets.length;
    const preservedStyle = JSON.stringify(entries.getCell("A3").style);
    await manuallyEdited.xlsx.writeFile(filePath);

    const loaded = await repository.loadWithUuidRepair(filePath);

    expect(loaded.repairedIds).toBe(1);
    expect(loaded.repairedLinks).toBe(0);
    expect(loaded.data.investmentEntries).toHaveLength(2);
    expect(new Set(loaded.data.investmentEntries.map((entry) => entry.id)).size).toBe(2);
    expect(loaded.data.investmentEntries.map(withoutId)).toEqual(data.investmentEntries.map(withoutId));
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);

    const repairedWorkbook = new ExcelJS.Workbook();
    await repairedWorkbook.xlsx.readFile(filePath);
    expect(repairedWorkbook.worksheets).toHaveLength(sheetCount);
    expect(repairedWorkbook.getWorksheet("Investment Entries")?.getColumn(1).values.slice(2)).toEqual(
      loaded.data.investmentEntries.map((entry) => entry.id),
    );
    expect(JSON.stringify(repairedWorkbook.getWorksheet("Investment Entries")?.getCell("A3").style)).toBe(preservedStyle);

    await expect(repository.loadWithUuidRepair(filePath)).resolves.toMatchObject({ repairedIds: 0 });
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);
  });

  it("reconciles orphan investment movements once and preserves a recoverable backup", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-investment-repair-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-2026.xlsx");
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    data.investments.push({
      id: investmentId,
      name: "Synthetic fund",
      kind: "fund",
      provider: "",
      currency: "EUR",
      active: true,
      openedAt: "2026-01-01",
      notes: "",
    });
    data.investmentEntries.push({
      id: entryId,
      investmentId,
      date: "2026-05-10",
      kind: "withdrawal",
      amount: 150,
      description: "Synthetic orphan liquidation",
      categoryId: data.categories.find((item) => item.nameIt === "Investimenti")!.id,
      paymentMethodId: data.paymentMethods[0].id,
      notes: "",
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const loaded = await repository.loadWithUuidRepair(filePath);

    expect(loaded.repairedInvestmentLinks).toBe(1);
    expect(loaded.ambiguousInvestmentLinks).toBe(0);
    expect(loaded.data.transactions).toHaveLength(1);
    expect(loaded.data.transactions[0]).toMatchObject({
      investmentId,
      investmentEntryId: entryId,
      kind: "transfer",
      cashFlowDirection: "inflow",
      amount: 150,
    });
    expect(loaded.data.investmentEntries[0]?.transactionId).toBe(loaded.data.transactions[0]?.id);
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);

    const secondLoad = await repository.loadWithUuidRepair(filePath);
    expect(secondLoad.repairedInvestmentLinks).toBe(0);
    expect(secondLoad.data).toEqual(loaded.data);
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);
  });

  it("repairs unambiguous transaction accounts and closes finished installment plans once", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-operational-repair-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-2026.xlsx");
    const data = createEmptyFinanceData(2026);
    const accountId = crypto.randomUUID();
    const recurringId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    data.accounts.push({
      id: accountId, name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 1_000, active: true, openedAt: "2026-01-01", notes: "",
    });
    data.transactions.push({
      id: crypto.randomUUID(), date: "2026-05-10", description: "Synthetic account-less expense",
      categoryId: data.categories.find((item) => item.kind === "expense")!.id,
      paymentMethodId: data.paymentMethods[0].id, kind: "expense", amount: 25,
      currency: "EUR", notes: "", createdAt: timestamp, updatedAt: timestamp,
    });
    data.recurringItems.push({
      id: recurringId, name: "Synthetic finished plan", kind: "installment", direction: "expense",
      amount: 25, frequency: "monthly", categoryId: data.categories.find((item) => item.kind === "expense")!.id,
      paymentMethodId: data.paymentMethods[0].id, nextDueDate: "2026-06-10",
      remainingInstallments: 0, active: true, notes: "",
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const loaded = await repository.loadWithUuidRepair(filePath);

    expect(loaded.repairedTransactionAccounts).toBe(1);
    expect(loaded.unresolvedTransactionAccounts).toBe(0);
    expect(loaded.closedInstallmentPlans).toBe(1);
    expect(loaded.data.transactions[0]?.accountId).toBe(accountId);
    expect(loaded.data.recurringItems[0]).toMatchObject({ active: false });
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);

    const secondLoad = await repository.loadWithUuidRepair(filePath);
    expect(secondLoad).toMatchObject({
      repairedTransactionAccounts: 0,
      unresolvedTransactionAccounts: 0,
      closedInstallmentPlans: 0,
    });
    expect(secondLoad.data).toEqual(loaded.data);
    expect(await readdir(path.join(directory, ".contami-backups"))).toHaveLength(1);
  });

  it("reports ambiguous legacy matches without changing the workbook", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-investment-ambiguous-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-2026.xlsx");
    const data = createEmptyFinanceData(2026);
    const investmentId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    const categoryId = data.categories.find((item) => item.nameIt === "Investimenti")!.id;
    const paymentMethodId = data.paymentMethods[0].id;
    const timestamp = new Date().toISOString();
    data.investments.push({
      id: investmentId,
      name: "Synthetic fund",
      kind: "fund",
      provider: "",
      currency: "EUR",
      active: true,
      openedAt: "2026-01-01",
      notes: "",
    });
    data.investmentEntries.push({
      id: entryId,
      investmentId,
      date: "2026-05-10",
      kind: "contribution",
      amount: 150,
      description: "Ambiguous contribution",
      categoryId,
      paymentMethodId,
      notes: "",
    });
    data.transactions.push(...[crypto.randomUUID(), crypto.randomUUID()].map((id) => ({
      id,
      date: "2026-05-10",
      description: "Ambiguous contribution",
      categoryId,
      paymentMethodId,
      kind: "expense" as const,
      amount: 150,
      currency: "EUR",
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    })));
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const loaded = await repository.loadWithUuidRepair(filePath);

    expect(loaded.repairedInvestmentLinks).toBe(0);
    expect(loaded.ambiguousInvestmentLinks).toBe(1);
    expect(loaded.data).toEqual(data);
    await expect(readdir(path.join(directory, ".contami-backups"))).rejects.toThrow();
  });

  it("rejects unsupported extensions before touching the filesystem", async () => {
    const repository = new ExcelWorkbookRepository();
    await expect(repository.save(path.join(tmpdir(), "bad.csv"), createEmptyFinanceData())).rejects.toThrow("INVALID_WORKBOOK_PATH");
  });

  it("loads a version 3 workbook and migrates hardcoded taxes to the current schema", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-v3-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-legacy.xlsx");
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    data.properties.push({
      id: propertyId, name: "Synthetic legacy home", kind: "apartment", usage: "residence",
      ownershipShare: 1, purchasePrice: 0, active: true, notes: "",
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbook.getWorksheet("_Meta")!.getCell("B2").value = 3;
    const taxSheet = workbook.getWorksheet("Tax Types")!;
    workbook.removeWorksheet(taxSheet.id);
    const propertyEntries = workbook.getWorksheet("Property Entries")!;
    workbook.removeWorksheet(propertyEntries.id);
    const legacyDefinition = WORKBOOK_TABLES_V3.find((item) => item.key === "propertyEntries")!;
    const legacySheet = workbook.addWorksheet("Property Entries");
    legacySheet.addRow(legacyDefinition.columns);
    const legacyEntry: Record<string, unknown> = {
      id: crypto.randomUUID(), propertyId, date: new Date("2026-06-16T12:00:00Z"), kind: "expense",
      category: "IMU", categoryId: data.categories[3].id, description: "Legacy second installment",
      amount: 350, paymentMethodId: data.paymentMethods[0].id, detailKind: "tax_imu",
      taxInstallment: "second", notes: "",
    };
    legacySheet.addRow(legacyDefinition.columns.map((column) => legacyEntry[column] ?? null));
    await workbook.xlsx.writeFile(filePath);

    const migrated = await repository.load(filePath);
    const imu = migrated.taxTypes.find((item) => item.name === "IMU")!;
    expect(migrated.meta.schemaVersion).toBe(12);
    expect(migrated.propertyEntries[0]).toMatchObject({ taxTypeId: imu.id, taxInstallmentNumber: 2, amount: 350 });
  });

  it("loads a version 4 workbook and migrates property history to the current schema", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-workbook-v4-")); directories.push(directory);
    const filePath = path.join(directory, "ContaMi-v4.xlsx");
    const data = createEmptyFinanceData(2026);
    const propertyId = crypto.randomUUID();
    data.properties.push({ id: propertyId, name: "Synthetic home", kind: "apartment", usage: "residence", ownershipShare: 1, purchasePrice: 0, active: true, notes: "" });
    data.propertyAnnualSummaries.push({
      propertyId,
      year: 2025,
      income: 0,
      expenses: 1_000,
      closingValue: 200_000,
      electricityKwh: 100,
      gasCubicMeters: 50,
      waterCubicMeters: 20,
      electricityCost: 70,
      gasCost: 80,
      waterCost: 30,
      phoneInternetCost: 0,
      condominiumCost: 0,
    });
    const repository = new ExcelWorkbookRepository();
    await repository.save(filePath, data);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbook.getWorksheet("_Meta")!.getCell("B2").value = 4;
    const history = workbook.getWorksheet("Property History")!;
    workbook.removeWorksheet(history.id);
    const legacyDefinition = WORKBOOK_TABLES_V4.find((item) => item.key === "propertyAnnualSummaries")!;
    const legacySheet = workbook.addWorksheet("Property History");
    legacySheet.addRow(legacyDefinition.columns);
    const legacySummary = data.propertyAnnualSummaries[0] as unknown as Record<string, unknown>;
    legacySheet.addRow(legacyDefinition.columns.map((column) => legacySummary[column] ?? null));
    await workbook.xlsx.writeFile(filePath);

    const migrated = await repository.load(filePath);
    expect(migrated.meta.schemaVersion).toBe(12);
    expect(migrated.propertyAnnualSummaries[0]).toMatchObject({ phoneInternetCost: 0, condominiumCost: 0 });
  });
});
