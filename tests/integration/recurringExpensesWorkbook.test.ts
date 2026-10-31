import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import { ExcelWorkbookRepository } from "../../src/infrastructure/spreadsheet/ExcelWorkbookRepository";
import { WORKBOOK_TABLES_V15 } from "../../src/infrastructure/spreadsheet/workbookSchema";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
function synthetic() {
  const data = createEmptyFinanceData(2026);
  data.accounts.push({ id: crypto.randomUUID(), name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 1000, active: true, openedAt: "2026-01-01", notes: "" });
  return applyFinanceCommand(data, { type: "addRecurringItem", value: {
    id: crypto.randomUUID(), name: "Synthetic shared service", kind: "service", direction: "expense", amount: 100.01,
    frequency: "monthly", nextDueDate: "2026-10-01", categoryId: data.categories[2].id,
    paymentMethodId: data.paymentMethods[0].id, accountId: data.accounts[0].id,
    shared: true, sharedOwnerRatio: 0.3, sharedPaidBy: "partner", active: true, notes: "",
  } });
}

describe("recurring expense workbook persistence", () => {
  it("round-trips shared schedules, ratios, linked shares and future rates through XLSX", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-recurring-v16-")); directories.push(directory);
    const file = path.join(directory, "synthetic.xlsx");
    const repository = new ExcelWorkbookRepository();
    let data = synthetic();
    data = applyFinanceCommand(data, { type: "addRecurringRateChange", value: { id: crypto.randomUUID(), recurringId: data.recurringItems[0].id, amount: 123.45, effectiveFrom: "2026-11-01" } });
    await repository.save(file, data);
    const loaded = await repository.load(file);
    expect(loaded).toEqual(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const sheet = workbook.getWorksheet("Recurring Items")!;
    const headers = sheet.getRow(1).values as string[];
    expect(sheet.getCell(2, headers.indexOf("sharedOwnerRatio")).value).toBe(0.3);
    expect(sheet.getCell(2, headers.indexOf("sharedPaidBy")).value).toBe("partner");
    expect(workbook.getWorksheet("Shared Expenses")!.rowCount).toBe(4);
  });

  it("migrates v15 once with backup while preserving individually shared occurrences", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-recurring-migration-")); directories.push(directory);
    const file = path.join(directory, "synthetic.xlsx");
    const repository = new ExcelWorkbookRepository();
    const data = synthetic();
    await repository.save(file, data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    workbook.getWorksheet("_Meta")!.getCell("B2").value = 15;
    const sheet = workbook.getWorksheet("Recurring Items")!;
    const oldColumns = WORKBOOK_TABLES_V15.find((item) => item.key === "recurringItems")!.columns.length;
    sheet.spliceColumns(oldColumns + 1, sheet.columnCount - oldColumns);
    await workbook.xlsx.writeFile(file);
    const legacyBytes = await readFile(file);
    const migrated = await repository.loadWithUuidRepair(file);
    expect(migrated.migratedSchema).toBe(true);
    expect(migrated.data.meta.schemaVersion).toBe(16);
    expect(migrated.data.recurringItems[0].shared).toBeUndefined();
    expect(migrated.data.transactions).toEqual(data.transactions);
    expect(migrated.data.sharedExpenses).toEqual(data.sharedExpenses);
    const backups = (await readdir(path.join(directory, ".contami-backups"))).filter((name) => name.endsWith(".xlsx"));
    expect(backups).toHaveLength(1);
    expect(await readFile(path.join(directory, ".contami-backups", backups[0]))).toEqual(legacyBytes);
    const currentBytes = await readFile(file);
    expect((await repository.loadWithUuidRepair(file)).migratedSchema).toBe(false);
    expect(await readFile(file)).toEqual(currentBytes);
  });
});
