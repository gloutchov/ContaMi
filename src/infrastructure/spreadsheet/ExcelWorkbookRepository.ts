import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { APP_CONFIG } from "../../config/appConfig";
import { computeDashboard } from "../../domain/finance";
import { reconcileInvestmentTransactions } from "../../domain/investmentTransactionSync";
import { migrateFinanceData } from "../../domain/migrations";
import { financeDataSchema, type FinanceData } from "../../domain/models";
import { repairOperationalData } from "../../domain/operationalDataRepair";
import { assertUniqueRecordIds, repairDuplicateRecordIds } from "../../domain/uuidRepair";
import { WorkbookLockManager } from "./WorkbookLockManager";
import {
  WorkbookRevisionGuard,
  type WorkbookRevision,
  type WorkbookRevisionState,
} from "./WorkbookRevisionGuard";
import { preflightXlsxWorkbook } from "./XlsxWorkbookPreflight";
import { WORKBOOK_SCHEMA_VERSION, WORKBOOK_TABLES, WORKBOOK_TABLES_V1, WORKBOOK_TABLES_V10, WORKBOOK_TABLES_V11, WORKBOOK_TABLES_V2, WORKBOOK_TABLES_V3, WORKBOOK_TABLES_V4, WORKBOOK_TABLES_V5, WORKBOOK_TABLES_V6, WORKBOOK_TABLES_V7, WORKBOOK_TABLES_V8, WORKBOOK_TABLES_V9, type WorkbookTableDefinition } from "./workbookSchema";

const HEADER_FILL = "FF073B4C";
const ACCENT_FILL = "FF74D6B1";
const GOLD_FILL = "FFFFBA49";
const LIGHT_FILL = "FFEAF7F2";

function assertWorkbookPath(filePath: string): void {
  if (filePath.length > 4_096 || path.extname(filePath).toLowerCase() !== ".xlsx") throw new Error("INVALID_WORKBOOK_PATH");
  if (!path.isAbsolute(filePath) || filePath.includes("\0")) throw new Error("INVALID_WORKBOOK_PATH");
}

function toExcelDate(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function readTimestampValue(value: ExcelJS.CellValue): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + Math.round(value * 86_400_000)).toISOString();
  }
  return readCellValue(value);
}

function readCellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value === "object") {
    if ("result" in value) return readCellValue(value.result as ExcelJS.CellValue);
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
  }
  return value;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function styleHeader(row: ExcelJS.Row): void {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "thin", color: { argb: ACCENT_FILL } } };
  });
}

function configureDataSheet(sheet: ExcelJS.Worksheet, definition: WorkbookTableDefinition): void {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: { row: 1, column: definition.columns.length } };
  sheet.columns = definition.columns.map((name) => ({
    key: name,
    width: name === "description" || name === "notes" ? 32 : name === "id" || name.endsWith("Id") ? 38 : 16,
  }));
  styleHeader(sheet.getRow(1));
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6FAF8" } }; });
    }
  });
  for (const column of definition.dateColumns ?? []) sheet.getColumn(column).numFmt = "yyyy-mm-dd";
  for (const column of ["amount", "openingBalance", "purchasePrice", "salePrice", "fuelUnitPrice", "cadastralValue", "expectedMonthlyRent", "periodicAmount", "ownerShare", "partnerShare", "income", "expenses", "netCashFlow", "closingNetWorth", "liquidBalance", "propertyValue", "investmentValue", "pensionValue", "monthlyRecurring", "vehicleCosts", "closingValue", "contributions", "withdrawals", "totalCosts", "fuelCosts", "installments", "taxes", "insurance", "tires", "maintenance", "repairs", "electricityCost", "gasCost", "waterCost", "phoneInternetCost", "condominiumCost", "valuePerSqm"]) {
    if (definition.columns.includes(column)) sheet.getColumn(column).numFmt = '#,##0.00 [$€-it-IT]';
  }
  if (definition.columns.includes("ownershipShare")) sheet.getColumn("ownershipShare").numFmt = "0%";
  if (definition.columns.includes("returnRate")) sheet.getColumn("returnRate").numFmt = "0.00%";
}

function addOverview(workbook: ExcelJS.Workbook, data: FinanceData): void {
  const metrics = computeDashboard(data);
  const sheet = workbook.addWorksheet("Overview", { properties: { tabColor: { argb: ACCENT_FILL } } });
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [{ width: 28 }, { width: 20 }, { width: 4 }, { width: 28 }, { width: 20 }];
  sheet.mergeCells("A1:E2");
  const title = sheet.getCell("A1");
  title.value = "ContaMì — Financial overview / Panoramica finanziaria";
  title.font = { bold: true, size: 22, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  const cards: Array<[string, number, string]> = [
    ["Net worth / Patrimonio netto", metrics.netWorth, "A4"],
    ["Liquidity / Liquidità", metrics.liquidBalance, "D4"],
    ["Properties / Immobili", metrics.propertyValue, "A7"],
    ["Investments / Investimenti", metrics.investmentValue, "D7"],
    ["Private pensions / Pensioni integrative", metrics.pensionValue, "A10"],
    ["Monthly commitments / Impegni mensili", metrics.monthlyRecurring, "D10"],
    ["Year income / Entrate anno", metrics.yearIncome, "A13"],
    ["Year expenses / Uscite anno", metrics.yearExpenses, "D13"],
  ];
  for (const [label, value, anchor] of cards) {
    const cell = sheet.getCell(anchor);
    cell.value = label;
    cell.font = { bold: true, color: { argb: HEADER_FILL } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_FILL } };
    const valueCell = sheet.getCell(cell.row + 1, cell.col);
    valueCell.value = value;
    valueCell.numFmt = '#,##0.00 [$€-it-IT]';
    valueCell.font = { bold: true, size: 18, color: { argb: HEADER_FILL } };
  }
  sheet.getCell("A17").value = "This overview is refreshed whenever ContaMì saves the workbook.";
  sheet.getCell("A18").value = "La panoramica viene aggiornata a ogni salvataggio di ContaMì.";
  sheet.getCell("A20").value = "Schema version";
  sheet.getCell("B20").value = WORKBOOK_SCHEMA_VERSION;
  sheet.getCell("D20").value = "Updated";
  sheet.getCell("E20").value = data.meta.updatedAt;
}

function addSchemaSheet(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet("Schema", { properties: { tabColor: { argb: GOLD_FILL } } });
  sheet.columns = [{ width: 24 }, { width: 58 }, { width: 58 }];
  sheet.addRow(["Sheet / Foglio", "Italiano", "English"]);
  const descriptions: Record<string, [string, string]> = {
    Categories: ["Categorie disponibili per classificare le registrazioni.", "Categories available for classifying entries."],
    "Payment Methods": ["Metodi di pagamento selezionabili.", "Selectable payment methods."],
    "Investment Types": ["Tipologie personalizzabili di investimento.", "Customizable investment types."],
    "Tax Types": ["Catalogo configurabile delle tasse immobiliari.", "Configurable property-tax catalog."],
    Accounts: ["Conti, Casse, saldi iniziali e conti di alimentazione predefiniti.", "Accounts, cash registers, opening balances, and default funding accounts."],
    Transactions: ["Entrate, uscite e trasferimenti, inclusi quelli interni tra conto e Cassa.", "Income, expenses, and transfers, including internal account-to-cash-register transfers."],
    Properties: ["Anagrafica degli immobili.", "Property registry."],
    "Property Entries": ["Entrate, spese, valutazioni e consumi degli immobili.", "Property income, expenses, valuations and consumption."],
    Investments: ["Anagrafica di investimenti e pensioni integrative, con pensioni raccoglitore e comparti collegati.", "Investment and private-pension registry, including pension collectors and linked compartments."],
    "Investment Entries": ["Versamenti, liquidazioni e valutazioni di investimenti e comparti pensione.", "Contributions, liquidations, and valuations for investments and pension compartments."],
    "Recurring Items": ["Abbonamenti, servizi, rate e versamenti periodici.", "Subscriptions, services, installments and recurring contributions."],
    "Recurring Rate Changes": ["Cronologia degli importi ricorrenti con decorrenza mensile.", "Recurring amount history with monthly effective dates."],
    "Shared Expenses": ["Spese condivise e relativo saldo.", "Shared expenses and related balance."],
    Vehicles: ["Anagrafica delle automobili attuali e precedenti.", "Registry of current and previous vehicles."],
    "Vehicle Entries": ["Rifornimenti, rate, bollo, assicurazione, pneumatici, manutenzione e riparazioni.", "Fuel, installments, road tax, insurance, tyres, maintenance and repairs."],
    "Annual Summaries": ["Consuntivi degli anni archiviati.", "Archived annual summaries."],
    "Property History": ["Consuntivi annuali per immobile, inclusi consumi, utenze, telefono/internet, condominio e valore commerciale.", "Annual property actuals, including utility consumption, utilities, phone/internet, condominium fees, and commercial value."],
    "Investment History": ["Valori e movimenti annuali per investimento e comparto pensione.", "Annual values and movements for each investment and pension compartment."],
    "Vehicle History": ["Consuntivi annuali per il confronto tra automobili.", "Annual actuals for comparing vehicles."],
  };
  for (const definition of WORKBOOK_TABLES) {
    const description = descriptions[definition.sheet];
    sheet.addRow([definition.sheet, description[0], description[1]]);
  }
  styleHeader(sheet.getRow(1));
  const footerRow = WORKBOOK_TABLES.length + 3;
  sheet.getCell(`A${footerRow}`).value = "Do not rename columns if you want to keep the workbook compatible with ContaMì.";
  sheet.getCell(`A${footerRow + 1}`).value = "Non rinominare le colonne se vuoi mantenere il workbook compatibile con ContaMì.";
}

export class ExcelWorkbookRepository {
  constructor(
    private readonly revisions = new WorkbookRevisionGuard(),
    private readonly locks = new WorkbookLockManager(),
  ) {}

  async load(filePath: string): Promise<FinanceData> {
    return (await this.loadWithUuidRepair(filePath)).data;
  }

  async loadWithUuidRepair(filePath: string): Promise<{
    data: FinanceData;
    repairedIds: number;
    repairedLinks: number;
    repairedInvestmentLinks: number;
    ambiguousInvestmentLinks: number;
    repairedTransactionAccounts: number;
    unresolvedTransactionAccounts: number;
    closedInstallmentPlans: number;
    migratedSchema: boolean;
    revision: WorkbookRevision;
  }> {
    assertWorkbookPath(filePath);
    const openedRevision = await this.revisions.capture(filePath);
    await preflightXlsxWorkbook(filePath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const metaSheet = workbook.getWorksheet("_Meta");
    if (!metaSheet) throw new Error("INVALID_WORKBOOK_SCHEMA");
    const metaValues: Record<string, unknown> = {};
    metaSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const key = readCellValue(row.getCell(1).value);
      if (typeof key === "string") {
        metaValues[key] = key === "createdAt" || key === "updatedAt"
          ? readTimestampValue(row.getCell(2).value)
          : readCellValue(row.getCell(2).value);
      }
    });
    const raw: Record<string, unknown> = {
      meta: {
        schemaVersion: Number(metaValues.schemaVersion),
        activeYear: Number(metaValues.activeYear),
        createdAt: metaValues.createdAt,
        updatedAt: metaValues.updatedAt,
      },
    };
    const schemaVersion = Number(metaValues.schemaVersion);
    const definitions = schemaVersion === 1
      ? WORKBOOK_TABLES_V1
      : schemaVersion === 2
        ? WORKBOOK_TABLES_V2
        : schemaVersion === 3
          ? WORKBOOK_TABLES_V3
          : schemaVersion === 4
            ? WORKBOOK_TABLES_V4
            : schemaVersion === 5
              ? WORKBOOK_TABLES_V5
              : schemaVersion === 6
                ? WORKBOOK_TABLES_V6
                : schemaVersion === 7
                  ? WORKBOOK_TABLES_V7
                  : schemaVersion === 8
                    ? WORKBOOK_TABLES_V8
                    : schemaVersion === 9
                      ? WORKBOOK_TABLES_V9
                      : schemaVersion === 10
                        ? WORKBOOK_TABLES_V10
                        : schemaVersion === 11
                          ? WORKBOOK_TABLES_V11
                          : schemaVersion === WORKBOOK_SCHEMA_VERSION
                            ? WORKBOOK_TABLES
                            : undefined;
    if (!definitions) throw new Error("INVALID_WORKBOOK_SCHEMA");
    const physicalRows = new Map<WorkbookTableDefinition["key"], number[]>();
    for (const definition of definitions) {
      const sheet = workbook.getWorksheet(definition.sheet);
      if (!sheet) throw new Error("INVALID_WORKBOOK_SCHEMA");
      const rows: Record<string, unknown>[] = [];
      const rowNumbers: number[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const record: Record<string, unknown> = {};
        let hasValue = false;
        definition.columns.forEach((column, index) => {
          const cellValue = row.getCell(index + 1).value;
          const value = column === "createdAt" || column === "updatedAt"
            ? readTimestampValue(cellValue)
            : readCellValue(cellValue);
          if (value !== undefined) {
            record[column] = value;
            hasValue = true;
          }
        });
        if (hasValue) {
          rows.push(normalizeRow(record));
          rowNumbers.push(rowNumber);
        }
      });
      raw[definition.key] = rows;
      physicalRows.set(definition.key, rowNumbers);
    }
    const migrated = migrateFinanceData(raw);
    const repaired = repairDuplicateRecordIds(migrated);
    const investmentReconciliation = reconcileInvestmentTransactions(repaired.data);
    const operationalRepair = repairOperationalData(investmentReconciliation.data);
    await this.revisions.assertUnchanged(openedRevision, filePath);
    let revision = openedRevision;
    if (schemaVersion !== WORKBOOK_SCHEMA_VERSION
      || investmentReconciliation.repairs.length > 0
      || operationalRepair.repairedTransactionAccounts > 0
      || operationalRepair.closedInstallmentPlans > 0) {
      operationalRepair.data.meta.updatedAt = new Date().toISOString();
      revision = await this.save(filePath, operationalRepair.data, openedRevision);
    } else if (repaired.repairs.length > 0) {
      repaired.data.meta.updatedAt = new Date().toISOString();
      revision = await this.persistUuidRepairs(filePath, workbook, definitions, physicalRows, migrated, repaired.data, openedRevision);
    }
    return {
      data: operationalRepair.data,
      repairedIds: repaired.repairs.length,
      repairedLinks: repaired.repairedLinks,
      repairedInvestmentLinks: investmentReconciliation.repairs.length,
      ambiguousInvestmentLinks: investmentReconciliation.ambiguousEntries + investmentReconciliation.ambiguousTransactions,
      repairedTransactionAccounts: operationalRepair.repairedTransactionAccounts,
      unresolvedTransactionAccounts: operationalRepair.unresolvedTransactionAccounts,
      closedInstallmentPlans: operationalRepair.closedInstallmentPlans,
      migratedSchema: schemaVersion !== WORKBOOK_SCHEMA_VERSION,
      revision,
    };
  }

  async save(filePath: string, data: FinanceData, expectedRevision?: WorkbookRevision): Promise<WorkbookRevision> {
    assertWorkbookPath(filePath);
    const validated = financeDataSchema.parse(data);
    assertUniqueRecordIds(validated);
    await mkdir(path.dirname(filePath), { recursive: true });
    const expectedState = expectedRevision ?? await this.revisions.captureState(filePath);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ContaMì";
    workbook.company = "ContaMì";
    workbook.created = new Date(validated.meta.createdAt);
    workbook.modified = new Date(validated.meta.updatedAt);
    workbook.calcProperties.fullCalcOnLoad = true;
    addOverview(workbook, validated);
    addSchemaSheet(workbook);
    const meta = workbook.addWorksheet("_Meta", { state: "veryHidden" });
    meta.addRow(["key", "value"]);
    meta.addRows([
      ["schemaVersion", validated.meta.schemaVersion],
      ["activeYear", validated.meta.activeYear],
      ["createdAt", validated.meta.createdAt],
      ["updatedAt", validated.meta.updatedAt],
    ]);
    for (const definition of WORKBOOK_TABLES) {
      const sheet = workbook.addWorksheet(definition.sheet);
      sheet.addRow(definition.columns);
      const rows = validated[definition.key] as Array<Record<string, unknown>>;
      for (const value of rows) {
        sheet.addRow(definition.columns.map((column) => {
          const cell = value[column];
          if (cell === undefined || cell === "") return null;
          return definition.dateColumns?.includes(column) && typeof cell === "string" ? toExcelDate(cell) : cell;
        }));
      }
      configureDataSheet(sheet, definition);
    }
    const temporary = `${filePath}.tmp-${randomUUID()}.xlsx`;
    let lease;
    try {
      await workbook.xlsx.writeFile(temporary);
      const verification = new ExcelJS.Workbook();
      await verification.xlsx.readFile(temporary);
      if (!verification.getWorksheet("_Meta") || !verification.getWorksheet("Transactions")) {
        throw new Error("WORKBOOK_VERIFICATION_FAILED");
      }
      lease = await this.locks.acquire(filePath);
      await lease.assertOwned();
      await this.revisions.assertState(expectedState, filePath);
      await this.createBackup(filePath, expectedState);
      await lease.assertOwned();
      await this.revisions.assertState(expectedState, filePath);
      await this.replace(filePath, temporary);
      return await this.revisions.capture(filePath);
    } finally {
      await lease?.release();
      await rm(temporary, { force: true });
    }
  }

  async recoverStaleLock(filePath: string): Promise<boolean> {
    assertWorkbookPath(filePath);
    return this.locks.recoverStale(filePath);
  }

  private async persistUuidRepairs(
    filePath: string,
    workbook: ExcelJS.Workbook,
    definitions: WorkbookTableDefinition[],
    physicalRows: Map<WorkbookTableDefinition["key"], number[]>,
    previous: FinanceData,
    next: FinanceData,
    expectedRevision: WorkbookRevision,
  ): Promise<WorkbookRevision> {
    const changedCells: Array<{ sheet: string; row: number; column: number; value: unknown }> = [];
    for (const definition of definitions) {
      const sheet = workbook.getWorksheet(definition.sheet);
      const rowNumbers = physicalRows.get(definition.key);
      if (!sheet || !rowNumbers) throw new Error("WORKBOOK_VERIFICATION_FAILED");
      const previousRows = previous[definition.key] as unknown as Array<Record<string, unknown>>;
      const nextRows = next[definition.key] as unknown as Array<Record<string, unknown>>;
      if (previousRows.length !== nextRows.length || rowNumbers.length !== nextRows.length) {
        throw new Error("WORKBOOK_VERIFICATION_FAILED");
      }
      nextRows.forEach((record, index) => {
        definition.columns.forEach((column, columnIndex) => {
          if (Object.is(record[column], previousRows[index]?.[column])) return;
          const rowNumber = rowNumbers[index]!;
          const value = record[column] ?? null;
          sheet.getRow(rowNumber).getCell(columnIndex + 1).value = value as ExcelJS.CellValue;
          changedCells.push({ sheet: definition.sheet, row: rowNumber, column: columnIndex + 1, value: record[column] });
        });
      });
    }
    if (changedCells.length === 0) throw new Error("UUID_REPAIR_FAILED");

    const metaSheet = workbook.getWorksheet("_Meta");
    if (!metaSheet) throw new Error("INVALID_WORKBOOK_SCHEMA");
    let updatedAtWritten = false;
    metaSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && readCellValue(row.getCell(1).value) === "updatedAt") {
        row.getCell(2).value = next.meta.updatedAt;
        updatedAtWritten = true;
      }
    });
    if (!updatedAtWritten) throw new Error("INVALID_WORKBOOK_SCHEMA");
    const overview = workbook.getWorksheet("Overview");
    if (overview) overview.getCell("E20").value = next.meta.updatedAt;
    workbook.modified = new Date(next.meta.updatedAt);

    const temporary = `${filePath}.tmp-${randomUUID()}.xlsx`;
    let lease;
    try {
      await workbook.xlsx.writeFile(temporary);
      const verification = new ExcelJS.Workbook();
      await verification.xlsx.readFile(temporary);
      if (!verification.getWorksheet("_Meta") || verification.worksheets.length !== workbook.worksheets.length) {
        throw new Error("WORKBOOK_VERIFICATION_FAILED");
      }
      for (const changed of changedCells) {
        const value = readCellValue(verification.getWorksheet(changed.sheet)?.getRow(changed.row).getCell(changed.column).value);
        if (!Object.is(value, changed.value)) throw new Error("WORKBOOK_VERIFICATION_FAILED");
      }
      lease = await this.locks.acquire(filePath);
      await lease.assertOwned();
      await this.revisions.assertUnchanged(expectedRevision, filePath);
      await this.createBackup(filePath, expectedRevision);
      await lease.assertOwned();
      await this.revisions.assertUnchanged(expectedRevision, filePath);
      await this.replace(filePath, temporary);
      return await this.revisions.capture(filePath);
    } finally {
      await lease?.release();
      await rm(temporary, { force: true });
    }
  }

  private async createBackup(filePath: string, expected: WorkbookRevisionState): Promise<void> {
    if ("missing" in expected) return;
    const backupDirectory = path.join(path.dirname(filePath), ".contami-backups");
    await mkdir(backupDirectory, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupStem = path.basename(filePath, ".xlsx");
    const backupPath = path.join(backupDirectory, `${backupStem}-${stamp}-${randomUUID()}.xlsx`);
    try {
      await copyFile(filePath, backupPath);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        throw new Error("WORKBOOK_CHANGED_EXTERNALLY", { cause: error });
      }
      throw error;
    }
    const backupRevision = await this.revisions.capture(backupPath);
    if (backupRevision.sha256 !== expected.sha256) {
      await rm(backupPath, { force: true });
      throw new Error("WORKBOOK_CHANGED_EXTERNALLY");
    }
    const files = (await readdir(backupDirectory))
      .filter((file) => file.startsWith(`${backupStem}-`) && file.endsWith(".xlsx"))
      .sort()
      .reverse();
    for (const old of files.slice(APP_CONFIG.workbook.backupLimit)) await rm(path.join(backupDirectory, old), { force: true });
  }

  private async replace(filePath: string, temporary: string): Promise<void> {
    try {
      await rename(temporary, filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST" && code !== "EPERM") throw error;
    }
    const rollback = `${filePath}.rollback-${randomUUID()}`;
    await rename(filePath, rollback);
    try {
      await rename(temporary, filePath);
      await rm(rollback, { force: true });
    } catch (error) {
      await rename(rollback, filePath);
      throw error;
    }
  }
}
