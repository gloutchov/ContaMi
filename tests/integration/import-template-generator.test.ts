import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, it } from "vitest";
import {
  IMPORT_TEMPLATE_CONTRACTS,
  IMPORT_TEMPLATE_DATA_SHEET,
  IMPORT_TEMPLATE_LISTS_SHEET,
  IMPORT_TEMPLATE_META_SHEET,
  IMPORT_TEMPLATE_TYPES,
} from "../../src/domain/importTemplates";
import { createEmptyFinanceData } from "../../src/domain/finance";
import { ExcelImportTemplateGenerator } from "../../src/infrastructure/spreadsheet/ExcelImportTemplateGenerator";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

function workbookHasFormula(workbook: ExcelJS.Workbook): boolean {
  let found = false;
  workbook.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (cell) => {
      if (typeof cell.value === "object" && cell.value !== null && "formula" in cell.value) found = true;
    }));
  });
  return found;
}

describe("ExcelImportTemplateGenerator", () => {
  it("creates all eight passive, protected and structurally versioned templates", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-templates-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    data.categories[0] = { ...data.categories[0], nameIt: "=Categoria sintetica", nameEn: "=Synthetic category" };
    data.accounts.push({
      id: crypto.randomUUID(), name: "Synthetic account", kind: "bank", currency: "EUR",
      openingBalance: 0, active: true, openedAt: "2026-01-01", notes: "",
    });
    const generator = new ExcelImportTemplateGenerator(12);

    for (const type of IMPORT_TEMPLATE_TYPES) {
      const contract = IMPORT_TEMPLATE_CONTRACTS[type];
      const filePath = path.join(directory, contract.fileName);
      await generator.save(filePath, type, { data, workbookConfigured: true });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      expect(workbook.worksheets).toHaveLength(3);
      expect(workbook.worksheets.filter((sheet) => sheet.state === "visible").map((sheet) => sheet.name)).toEqual([IMPORT_TEMPLATE_DATA_SHEET]);
      expect(workbook.getWorksheet(IMPORT_TEMPLATE_META_SHEET)?.state).toBe("veryHidden");
      expect(workbook.getWorksheet(IMPORT_TEMPLATE_LISTS_SHEET)?.state).toBe("veryHidden");
      expect((workbook.getWorksheet(IMPORT_TEMPLATE_META_SHEET)?.model as unknown as { sheetProtection?: { sheet?: boolean } }).sheetProtection?.sheet).toBe(true);
      expect((workbook.getWorksheet(IMPORT_TEMPLATE_LISTS_SHEET)?.model as unknown as { sheetProtection?: { sheet?: boolean } }).sheetProtection?.sheet).toBe(true);
      expect(workbookHasFormula(workbook)).toBe(false);
      expect((workbook.model as unknown as { externalLinks?: unknown[] }).externalLinks ?? []).toEqual([]);

      const meta = workbook.getWorksheet(IMPORT_TEMPLATE_META_SHEET)!;
      const metaValues = new Map<string, unknown>();
      meta.eachRow((row, index) => { if (index > 1) metaValues.set(String(row.getCell(1).value ?? ""), row.getCell(2).value); });
      expect(metaValues.get("signature")).toBe("ContaMi Import Template");
      expect(Number(metaValues.get("templateVersion"))).toBe(3);
      expect(metaValues.get("templateType")).toBe(type);
      expect(metaValues.get("catalogMode")).toBe("workbook_snapshot");

      const sheet = workbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET)!;
      const lists = workbook.getWorksheet(IMPORT_TEMPLATE_LISTS_SHEET)!;
      expect((sheet.getRow(5).values as unknown[]).slice(1, contract.fields.length + 1)).toEqual(contract.fields.map((field) => field.key));
      contract.fields.forEach((field, index) => {
        const cell = sheet.getCell(6, index + 1);
        const listColumn = field.list
          ? (lists.getRow(1).values as unknown[]).findIndex((value) => value === field.list)
          : -1;
        if (field.kind === "enum" || (listColumn > 0 && lists.getCell(2, listColumn).value)) {
          expect(cell.dataValidation.type).toBe("list");
          expect(String(cell.dataValidation.formulae?.[0])).toMatch(/^=contami_list_/);
        }
        if (field.kind === "date") expect(cell.numFmt).toBe("yyyy-mm-dd");
      });
    }
  }, 30_000);

  it("omits unstable UUIDs when no authoritative workbook is configured", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-defaults-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const filePath = path.join(directory, IMPORT_TEMPLATE_CONTRACTS.transactions.fileName);
    await new ExcelImportTemplateGenerator(5).save(filePath, "transactions", { data, workbookConfigured: false });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const lists = workbook.getWorksheet(IMPORT_TEMPLATE_LISTS_SHEET)!;
    const serializedValues = JSON.stringify(lists.getSheetValues());
    expect(serializedValues).not.toContain(data.categories[0].id);
    expect(serializedValues).toContain(data.categories[0].nameIt);
  });

  it("keeps validations usable through the configured 5,000-row production limit", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "contami-import-capacity-"));
    directories.push(directory);
    const data = createEmptyFinanceData(2026);
    const filePath = path.join(directory, IMPORT_TEMPLATE_CONTRACTS.transactions.fileName);
    await new ExcelImportTemplateGenerator().save(filePath, "transactions", { data, workbookConfigured: false });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET)!;
    const kindColumn = IMPORT_TEMPLATE_CONTRACTS.transactions.fields.findIndex((field) => field.key === "kind") + 1;
    expect(sheet.getCell(5_005, kindColumn).dataValidation.type).toBe("list");
    expect((await stat(filePath)).size).toBeLessThan(5 * 1024 * 1024);
  }, 30_000);
});
