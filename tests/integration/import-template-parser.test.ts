import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { afterEach, describe, expect, it } from "vitest";
import { applyFinanceCommands, createEmptyFinanceData as createBaseFinanceData } from "../../src/domain/finance";
import { createRolloverFinanceData } from "../../src/domain/rollover";
import {
  IMPORT_TEMPLATE_CONTRACTS,
  IMPORT_TEMPLATE_DATA_SHEET,
  IMPORT_TEMPLATE_META_SHEET,
  importTemplateContractForVersion,
  type ImportTemplateType,
  type ImportTemplateVersion,
} from "../../src/domain/importTemplates";

function createEmptyFinanceData(year: number) {
  const data = createBaseFinanceData(year);
  data.accounts.push({ id: "00000000-0000-4000-8000-0000000000a1", name: "Synthetic bank", kind: "bank", currency: "EUR", openingBalance: 0, active: true, openedAt: `${year}-01-01`, notes: "" });
  return data;
}
import type { FinanceData } from "../../src/domain/models";
import { ExcelImportTemplateGenerator } from "../../src/infrastructure/spreadsheet/ExcelImportTemplateGenerator";
import { ExcelImportTemplateParser } from "../../src/infrastructure/spreadsheet/ExcelImportTemplateParser";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

function ref(id: string): string {
  return `Synthetic [${id}]`;
}

function syntheticRows(type: ImportTemplateType, data: FinanceData): Array<Record<string, string | number | boolean>> {
  const expense = data.categories.find((item) => item.kind === "expense")!;
  const income = data.categories.find((item) => item.kind === "income")!;
  const payment = data.paymentMethods[0]!;
  const account = data.accounts[0]!;
  const investmentType = data.investmentTypes.find((item) => item.code !== "pension")!;
  const common = { active: "true | vero", notes: "Synthetic import" };
  if (type === "transactions") return [{
    date: "2026-01-05", description: "Synthetic income", kind: "income | entrata", amount: 125,
    currency: "EUR", category: ref(income.id), payment_method: ref(payment.id), account: ref(account.id), planned: "false | falso", notes: "Synthetic import",
  }];
  if (type === "residence" || type === "rental_properties") return [
    {
      record_type: "property | immobile", property_key: "home-1", name: "Synthetic home", property_kind: "apartment | appartamento",
      ownership_share: 1, purchase_price: 200000, ...common,
    },
    {
      record_type: type === "residence" ? "expense | uscita" : "income | entrata", property_key: "home-1",
      date: "2026-02-01", description: "Synthetic property record", amount: 700,
      category: ref(type === "residence" ? expense.id : income.id), payment_method: ref(payment.id), account: ref(account.id),
      shared: "false | falso", is_common_expense: "false | falso", notes: "Synthetic import",
    },
  ];
  if (type === "investments") return [
    {
      record_type: "position | posizione", investment_key: "investment-1", name: "Synthetic fund",
      isin: "  zztestabcde7 ", investment_type: ref(investmentType.id), currency: "EUR", opened_at: "2025-01-01", ...common,
    },
    {
      record_type: "contribution | versamento", investment_key: "investment-1", date: "2026-03-01",
      description: "Synthetic contribution", amount: 500, category: ref(expense.id), payment_method: ref(payment.id), account: ref(account.id), notes: "Synthetic import",
    },
  ];
  if (type === "pension") return [
    {
      record_type: "pension | pensione", pension_key: "pension-1", name: "Synthetic pension",
      currency: "EUR", opened_at: "2020-01-01", ...common,
    },
    {
      record_type: "compartment | comparto", pension_key: "pension-1", compartment_key: "compartment-1",
      name: "Synthetic compartment", isin: "zztestabcde7", currency: "EUR", opened_at: "2020-01-01", ...common,
    },
    {
      record_type: "contribution | versamento", pension_key: "pension-1", compartment_key: "compartment-1",
      date: "2026-03-01", description: "Synthetic pension contribution", amount: 300,
      category: ref(expense.id), payment_method: ref(payment.id), account: ref(account.id), notes: "Synthetic import",
    },
    {
      record_type: "valuation | valutazione", pension_key: "pension-1", compartment_key: "compartment-1",
      date: "2026-04-01", description: "Synthetic pension valuation", amount: 12000, notes: "Synthetic import",
    },
  ];
  if (type === "shared_expenses") return [{
    date: "2026-05-01", description: "Synthetic shared", amount: 80, owner_share: 40, partner_share: 40,
    paid_by: "owner | titolare", settled: "false | falso", category: ref(expense.id), payment_method: ref(payment.id), account: ref(account.id), notes: "Synthetic import",
  }];
  if (type === "recurring_items") return [{
    name: "Synthetic subscription", kind: "subscription | abbonamento", direction: "expense | uscita",
    amount: 15, frequency: "monthly | mensile", category: ref(expense.id), payment_method: ref(payment.id), account: ref(account.id),
    next_due_date: "2026-06-01", active: "true | vero", notes: "Synthetic import",
  }];
  return [
    {
      record_type: "vehicle | automobile", vehicle_key: "vehicle-1", name: "Synthetic car",
      fuel_type: "petrol | benzina", active: "true | vero", notes: "Synthetic import",
    },
    {
      record_type: "fuel | carburante", vehicle_key: "vehicle-1", date: "2026-07-01",
      description: "Synthetic fuel", amount: 60, fuel_liters: 30, category: ref(expense.id),
      payment_method: ref(payment.id), account: ref(account.id), notes: "Synthetic import",
    },
  ];
}

async function completedTemplate(
  directory: string,
  type: ImportTemplateType,
  data: FinanceData,
  rows = syntheticRows(type, data),
): Promise<string> {
  const filePath = path.join(directory, IMPORT_TEMPLATE_CONTRACTS[type].fileName);
  await new ExcelImportTemplateGenerator(20).save(filePath, type, { data, workbookConfigured: true });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET)!;
  const columns = new Map(IMPORT_TEMPLATE_CONTRACTS[type].fields.map((field, index) => [field.key, index + 1]));
  rows.forEach((values, rowIndex) => {
    for (const [key, value] of Object.entries(values)) sheet.getCell(6 + rowIndex, columns.get(key)!).value = value;
  });
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

async function changeTemplateVersion(filePath: string, type: ImportTemplateType, version: ImportTemplateVersion): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET)!;
  const legacyKeys = new Set(importTemplateContractForVersion(type, version).fields.map((field) => field.key));
  const currentFields = IMPORT_TEMPLATE_CONTRACTS[type].fields;
  for (let index = currentFields.length - 1; index >= 0; index -= 1) {
    if (!legacyKeys.has(currentFields[index]!.key)) sheet.spliceColumns(index + 1, 1);
  }
  workbook.getWorksheet(IMPORT_TEMPLATE_META_SHEET)!.getCell("B3").value = version;
  await workbook.xlsx.writeFile(filePath);
}

describe("ExcelImportTemplateParser", () => {
  it("parses and applies all eight supported templates with linked records exactly once", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-parser-"));
    directories.push(directory);
    const parser = new ExcelImportTemplateParser();

    for (const type of Object.keys(IMPORT_TEMPLATE_CONTRACTS) as ImportTemplateType[]) {
      const data = createEmptyFinanceData(2026);
      const filePath = await completedTemplate(directory, type, data);
      const prepared = await parser.parse(filePath, data, "skip");
      expect(prepared.preview.rejectedRows, type).toBe(0);
      expect(prepared.preview.validRows, type).toBe(syntheticRows(type, data).length);
      const next = applyFinanceCommands(data, prepared.commands);
      if (type === "transactions") expect(next.transactions).toHaveLength(1);
      if (type === "residence" || type === "rental_properties") {
        expect(next.properties).toHaveLength(1);
        expect(next.propertyEntries).toHaveLength(1);
        expect(next.transactions).toHaveLength(1);
      }
      if (type === "investments") {
        expect(next.investments).toHaveLength(1);
        expect(next.investments[0]?.isin).toBe("ZZTESTABCDE7");
        expect(next.investmentEntries).toHaveLength(1);
        expect(next.transactions).toHaveLength(1);
      }
      if (type === "pension") {
        expect(next.investments).toHaveLength(2);
        expect(next.investments.find((item) => item.parentInvestmentId)?.isin).toBe("ZZTESTABCDE7");
        expect(next.investments.find((item) => !item.parentInvestmentId)?.isin).toBeUndefined();
        expect(next.investmentEntries).toHaveLength(2);
        expect(next.transactions).toHaveLength(1);
        expect(next.transactions[0]).toMatchObject({
          investmentId: next.investments.find((item) => item.parentInvestmentId)?.id,
          kind: "transfer",
          cashFlowDirection: "outflow",
          amount: 300,
        });
      }
      if (type === "shared_expenses") {
        expect(next.sharedExpenses).toHaveLength(1);
        expect(next.transactions).toHaveLength(1);
      }
      if (type === "recurring_items") {
        expect(next.recurringItems).toHaveLength(1);
        expect(new Set(next.transactions.map((item) => `${item.recurringId}-${item.date}`)).size).toBe(next.transactions.length);
      }
      if (type === "vehicles") {
        expect(next.vehicles).toHaveLength(1);
        expect(next.vehicleEntries).toHaveLength(1);
        expect(next.transactions).toHaveLength(1);
      }
    }
  }, 60_000);

  it("accepts legacy investment templates v1 and v2 without inventing ISIN values", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-legacy-investments-"));
    directories.push(directory);
    const parser = new ExcelImportTemplateParser();

    for (const version of [1, 2] as const) {
      const data = createEmptyFinanceData(2026);
      const rows = syntheticRows("investments", data).map((row) => {
        const legacy = { ...row };
        delete legacy.isin;
        if (version === 1) delete legacy.account;
        return legacy;
      });
      const filePath = await completedTemplate(directory, "investments", data, rows);
      await changeTemplateVersion(filePath, "investments", version);

      const prepared = await parser.parse(filePath, data, "skip");
      const imported = applyFinanceCommands(data, prepared.commands);

      expect(prepared.preview.rejectedRows).toBe(0);
      expect(imported.investments[0]?.isin).toBeUndefined();
      expect(imported.investmentEntries[0]?.accountId).toBe(data.accounts[0]?.id);
    }
  });

  it("preserves an existing ISIN when a version 1 or 2 template updates its investment", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-legacy-isin-preservation-"));
    directories.push(directory);
    const parser = new ExcelImportTemplateParser();

    for (const version of [1, 2] as const) {
      const data = createEmptyFinanceData(2026);
      const investmentType = data.investmentTypes.find((item) => item.code !== "pension")!;
      const investmentId = crypto.randomUUID();
      data.investments.push({
        id: investmentId,
        name: "Synthetic fund",
        isin: "ZZTESTABCDE7",
        kind: "stock",
        typeId: investmentType.id,
        provider: "",
        currency: "EUR",
        active: true,
        openedAt: "2025-01-01",
        notes: "",
      });
      const rows = syntheticRows("investments", data).map((row) => {
        const legacy = { ...row };
        delete legacy.isin;
        if (version === 1) delete legacy.account;
        return legacy;
      });
      const filePath = await completedTemplate(directory, "investments", data, rows);
      await changeTemplateVersion(filePath, "investments", version);

      const prepared = await parser.parse(filePath, data, "update");
      const imported = applyFinanceCommands(data, prepared.commands);

      expect(imported.investments.find((item) => item.id === investmentId)?.isin).toBe("ZZTESTABCDE7");
    }
  });

  it("accepts every version 2 template after the version 3 ISIN extension", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-v2-regression-"));
    directories.push(directory);
    const parser = new ExcelImportTemplateParser();

    for (const type of Object.keys(IMPORT_TEMPLATE_CONTRACTS) as ImportTemplateType[]) {
      const data = createEmptyFinanceData(2026);
      const rows = syntheticRows(type, data).map((row) => {
        const legacy = { ...row };
        delete legacy.isin;
        return legacy;
      });
      const filePath = await completedTemplate(directory, type, data, rows);
      await changeTemplateVersion(filePath, type, 2);

      const prepared = await parser.parse(filePath, data, "skip");
      expect(prepared.preview.rejectedRows, type).toBe(0);
      expect(() => applyFinanceCommands(data, prepared.commands), type).not.toThrow();
    }
  }, 60_000);

  it("resolves the only compatible account for a version 1 transaction", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-v1-transaction-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const rows = syntheticRows("transactions", data).map((row) => {
      const legacy = { ...row };
      delete legacy.account;
      return legacy;
    });
    const filePath = await completedTemplate(directory, "transactions", data, rows);
    await changeTemplateVersion(filePath, "transactions", 1);

    const prepared = await new ExcelImportTemplateParser().parse(filePath, data, "skip");
    const imported = applyFinanceCommands(data, prepared.commands);

    expect(prepared.preview.rejectedRows).toBe(0);
    expect(imported.transactions[0]?.accountId).toBe(data.accounts[0]?.id);
  });

  it("reports an invalid imported ISIN without preparing the position", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-invalid-isin-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const rows = syntheticRows("investments", data);
    rows[0]!.isin = "ZZTESTABCDE8";
    const filePath = await completedTemplate(directory, "investments", data, rows);

    const prepared = await new ExcelImportTemplateParser().parse(filePath, data, "skip");

    expect(prepared.preview.errors).toContainEqual({ row: 6, column: "isin", code: "INVALID_ISIN" });
    expect(prepared.commands).toEqual([]);
  });

  it("imports one conservative vehicle installment and rejects a second active plan", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-vehicle-installment-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const vehicleId = crypto.randomUUID();
    data.vehicles.push({
      id: vehicleId, name: "Synthetic vehicle", manufacturer: "", model: "",
      fuelType: "electric", active: true, notes: "",
    });
    const expense = data.categories.find((item) => item.kind === "expense")!;
    const payment = data.paymentMethods[0]!;
    const account = data.accounts[0]!;
    const row = {
      name: "Imported label",
      kind: "installment | pagamento rateale",
      direction: "expense | uscita",
      amount: 275,
      frequency: "monthly | mensile",
      category: ref(expense.id),
      payment_method: ref(payment.id),
      account: ref(account.id),
      next_due_date: "2026-10-10",
      remaining_installments: 2,
      active: "true | vero",
      vehicle: `Synthetic vehicle [${vehicleId}]`,
      notes: "Synthetic import",
    };
    const parser = new ExcelImportTemplateParser();
    const filePath = await completedTemplate(directory, "recurring_items", data, [row]);
    const prepared = await parser.parse(filePath, data, "skip");

    const next = applyFinanceCommands(data, prepared.commands);

    expect(next.recurringItems).toHaveLength(1);
    expect(next.recurringItems[0]).toMatchObject({
      name: "Synthetic vehicle",
      vehicleId,
      kind: "installment",
      remainingInstallments: 2,
    });
    expect(next.transactions).toHaveLength(2);
    expect(next.vehicleEntries).toHaveLength(2);
    expect(next.vehicleEntries.every((item) => item.kind === "installment")).toBe(true);

    const duplicatePath = await completedTemplate(directory, "recurring_items", next, [{ ...row, name: "Second imported plan" }]);
    await expect(parser.parse(duplicatePath, next, "create")).rejects.toThrow("IMPORT_PLAN_INVALID");
  });

  it("reports row and column errors without adding invalid rows", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-errors-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const rows = syntheticRows("transactions", data);
    rows[0]!.category = "Unknown category";
    rows.push({ ...rows[0]!, category: ref(data.categories[0]!.id), amount: -10 });
    const filePath = await completedTemplate(directory, "transactions", data, rows);

    const prepared = await new ExcelImportTemplateParser().parse(filePath, data, "skip");

    expect(prepared.preview.rejectedRows).toBe(2);
    expect(prepared.commands).toEqual([]);
    expect(prepared.preview.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 6, column: "category", code: "MISSING_REFERENCE" }),
      expect.objectContaining({ row: 7, column: "amount", code: "INVALID_NUMBER" }),
    ]));
  });

  it("rejects wrong versions, formulas and macro content before preparing commands", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-security-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const parser = new ExcelImportTemplateParser();

    const versionPath = await completedTemplate(directory, "transactions", data);
    const versionWorkbook = new ExcelJS.Workbook();
    await versionWorkbook.xlsx.readFile(versionPath);
    versionWorkbook.getWorksheet(IMPORT_TEMPLATE_META_SHEET)!.getCell("B3").value = 99;
    await versionWorkbook.xlsx.writeFile(versionPath);
    await expect(parser.parse(versionPath, data, "skip")).rejects.toThrow("IMPORT_TEMPLATE_VERSION_UNSUPPORTED");

    const formulaPath = await completedTemplate(directory, "shared_expenses", data);
    const formulaWorkbook = new ExcelJS.Workbook();
    await formulaWorkbook.xlsx.readFile(formulaPath);
    formulaWorkbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET)!.getCell("C6").value = { formula: "1+1", result: 2 };
    await formulaWorkbook.xlsx.writeFile(formulaPath);
    await expect(parser.parse(formulaPath, data, "skip")).rejects.toThrow("IMPORT_FORMULA_NOT_ALLOWED");

    const macroPath = await completedTemplate(directory, "recurring_items", data);
    const archive = await JSZip.loadAsync(await readFile(macroPath));
    archive.file("xl/vbaProject.bin", new Uint8Array([1, 2, 3]));
    await writeFile(macroPath, await archive.generateAsync({ type: "nodebuffer" }));
    await expect(parser.parse(macroPath, data, "skip")).rejects.toThrow("IMPORT_FILE_UNSAFE");

    const linkPath = await completedTemplate(directory, "recurring_items", data);
    const linkArchive = await JSZip.loadAsync(await readFile(linkPath));
    linkArchive.file("xl/externalLinks/externalLink1.xml", "<externalLink/>");
    await writeFile(linkPath, await linkArchive.generateAsync({ type: "nodebuffer" }));
    await expect(parser.parse(linkPath, data, "skip")).rejects.toThrow("IMPORT_FILE_UNSAFE");
  }, 30_000);

  it("rejects rows beyond the declared limit and reports ambiguous catalog names deterministically", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-limits-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const parser = new ExcelImportTemplateParser();
    const limitedPath = await completedTemplate(directory, "transactions", data);
    const limitedWorkbook = new ExcelJS.Workbook();
    await limitedWorkbook.xlsx.readFile(limitedPath);
    limitedWorkbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET)!.getCell("A26").value = "2026-01-01";
    await limitedWorkbook.xlsx.writeFile(limitedPath);
    await expect(parser.parse(limitedPath, data, "skip")).rejects.toThrow("IMPORT_ROW_LIMIT");

    const original = data.categories.find((item) => item.kind === "income")!;
    data.categories.push({ ...original, id: crypto.randomUUID() });
    const rows = syntheticRows("transactions", data);
    rows[0]!.category = `${original.nameIt} / ${original.nameEn}`;
    const ambiguousPath = await completedTemplate(directory, "transactions", data, rows);
    const ambiguous = await parser.parse(ambiguousPath, data, "skip");
    expect(ambiguous.preview.errors).toContainEqual({
      row: 6, column: "category", code: "AMBIGUOUS_REFERENCE",
    });
    expect(ambiguous.commands).toEqual([]);
  });

  it("uses each explicit duplicate strategy only for an exact unambiguous match", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-duplicates-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const rows = syntheticRows("transactions", data);
    const filePath = await completedTemplate(directory, "transactions", data, rows);
    const initial = await new ExcelImportTemplateParser().parse(filePath, data, "skip");
    const withExisting = applyFinanceCommands(data, initial.commands);
    const parser = new ExcelImportTemplateParser();

    const skipped = await parser.parse(filePath, withExisting, "skip");
    const created = await parser.parse(filePath, withExisting, "create");
    const updated = await parser.parse(filePath, withExisting, "update");

    expect(skipped.preview.actions).toMatchObject({ skip: 1, create: 0, update: 0 });
    expect(skipped.commands).toHaveLength(0);
    expect(created.preview.actions.create).toBe(1);
    expect(created.commands[0]?.type).toBe("addTransaction");
    expect(updated.preview.actions.update).toBe(1);
    expect(updated.commands[0]?.type).toBe("updateTransaction");
  });

  it("produces domain data that remains valid through year rollover", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-rollover-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const filePath = await completedTemplate(directory, "residence", data);
    const prepared = await new ExcelImportTemplateParser().parse(filePath, data, "skip");
    const imported = applyFinanceCommands(data, prepared.commands);

    const nextYear = createRolloverFinanceData(imported, 2027);

    expect(nextYear.properties).toHaveLength(1);
    expect(nextYear.propertyAnnualSummaries).toEqual([
      expect.objectContaining({ propertyId: imported.properties[0]!.id, year: 2026, expenses: 700 }),
    ]);
    expect(nextYear.transactions).toEqual([]);
  });
});
