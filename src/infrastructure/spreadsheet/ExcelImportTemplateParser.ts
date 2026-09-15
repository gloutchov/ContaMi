import path from "node:path";
import ExcelJS from "exceljs";
import { financeCommandSchema, type FinanceCommand } from "../../domain/commands";
import { applyFinanceCommands } from "../../domain/finance";
import {
  IMPORT_TEMPLATE_DATA_SHEET,
  IMPORT_TEMPLATE_LISTS_SHEET,
  IMPORT_TEMPLATE_META_SHEET,
  SUPPORTED_IMPORT_TEMPLATE_VERSIONS,
  importTemplateContractForVersion,
  importTemplateTypeSchema,
  type ImportTemplateContract,
  type ImportTemplateType,
  type ImportTemplateVersion,
} from "../../domain/importTemplates";
import { normalizeOptionalIsin, validateOptionalIsin } from "../../domain/isin";
import type { ImportDuplicateStrategy, ImportErrorCode, ImportRowError, PreparedImport } from "../../domain/imports";
import type {
  FinanceData,
  Investment,
  InvestmentEntry,
  Property,
  PropertyEntry,
  RecurringItem,
  SharedExpense,
  Transaction,
  Vehicle,
  VehicleEntry,
} from "../../domain/models";
import { preflightXlsxImport } from "./XlsxImportPreflight";

const MAX_ERRORS = 200;
const MAX_COMMANDS = 15_000;
const UUID_IN_LABEL = /\[([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\]\s*$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface CatalogItem {
  id: string;
  labels: string[];
  active: boolean;
}

interface ParsedWorkbook {
  type: ImportTemplateType;
  contract: ImportTemplateContract;
  dataSheet: ExcelJS.Worksheet;
  dataStartRow: number;
  maxDataRows: number;
  populatedRows: number[];
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function token(value: string): string {
  return value.split(/\s+\|\s+/, 1)[0]!.trim();
}

function dateExists(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function excelDate(value: Date): string | undefined {
  if (!Number.isFinite(value.valueOf())) return undefined;
  const year = value.getFullYear();
  const month = value.getMonth() + 1;
  const day = value.getDate();
  const result = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return dateExists(result) ? result : undefined;
}

function formulaPresent(workbook: ExcelJS.Workbook): boolean {
  let found = false;
  workbook.eachSheet((sheet) => {
    sheet.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (cell) => {
      const value = cell.value;
      if (typeof value === "object" && value !== null && ("formula" in value || "sharedFormula" in value)) found = true;
    }));
  });
  return found;
}

function passiveCellValue(value: ExcelJS.CellValue): string | number | boolean | Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  throw new Error("ACTIVE_CELL_VALUE");
}

class RowReader {
  readonly errors: ImportRowError[] = [];

  constructor(
    private readonly row: ExcelJS.Row,
    private readonly columns: ReadonlyMap<string, number>,
  ) {}

  hasColumn(column: string): boolean {
    return this.columns.has(column);
  }

  private error(column: string, code: ImportErrorCode): undefined {
    this.errors.push({ row: this.row.number, column, code });
    return undefined;
  }

  raw(column: string): string | number | boolean | Date | null | undefined {
    const index = this.columns.get(column);
    if (!index) return null;
    try {
      return passiveCellValue(this.row.getCell(index).value);
    } catch {
      return this.error(column, "FORMULA_NOT_ALLOWED");
    }
  }

  issue(column: string, code: ImportErrorCode): void {
    this.errors.push({ row: this.row.number, column, code });
  }

  text(column: string, required = false, max = 240): string | undefined {
    const raw = this.raw(column);
    if (raw === null || raw === undefined) return required ? this.error(column, "REQUIRED_VALUE") : undefined;
    if (raw instanceof Date || typeof raw === "object") return this.error(column, "INVALID_ROW");
    const value = String(raw).trim();
    if (!value) return required ? this.error(column, "REQUIRED_VALUE") : undefined;
    if (value.length > max) return this.error(column, "TEXT_TOO_LONG");
    return value;
  }

  number(column: string, required = false, options: { positive?: boolean; integer?: boolean; max?: number } = {}): number | undefined {
    const raw = this.raw(column);
    if (raw === null || raw === undefined) return required ? this.error(column, "REQUIRED_VALUE") : undefined;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || (options.positive && raw <= 0)
      || (options.integer && !Number.isInteger(raw)) || raw > (options.max ?? 1_000_000_000_000)) {
      return this.error(column, "INVALID_NUMBER");
    }
    return raw;
  }

  date(column: string, required = false): string | undefined {
    const raw = this.raw(column);
    if (raw === null || raw === undefined) return required ? this.error(column, "REQUIRED_VALUE") : undefined;
    const value = raw instanceof Date ? excelDate(raw) : typeof raw === "string" ? raw.trim() : undefined;
    if (!value || !dateExists(value)) return this.error(column, "INVALID_DATE");
    return value;
  }

  enum<T extends string>(column: string, values: readonly T[], required = false): T | undefined {
    const value = this.text(column, required, 120);
    if (value === undefined) return undefined;
    const parsed = token(value);
    if (!values.includes(parsed as T)) return this.error(column, "INVALID_ENUM");
    return parsed as T;
  }

  boolean(column: string, required = false): boolean | undefined {
    const raw = this.raw(column);
    if (raw === null || raw === undefined) return required ? this.error(column, "REQUIRED_VALUE") : undefined;
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
      const parsed = token(raw);
      if (parsed === "true") return true;
      if (parsed === "false") return false;
    }
    return this.error(column, "INVALID_ENUM");
  }

  catalog(column: string, items: readonly CatalogItem[], required = false): string | undefined {
    const value = this.text(column, required, 500);
    if (value === undefined) return undefined;
    const id = value.match(UUID_IN_LABEL)?.[1]?.toLocaleLowerCase();
    if (id) {
      const item = items.find((candidate) => candidate.id.toLocaleLowerCase() === id);
      if (!item || !item.active) return this.error(column, "INVALID_REFERENCE");
      return item.id;
    }
    const sought = normalize(value);
    const matches = items.filter((item) => item.active && item.labels.some((label) => normalize(label) === sought));
    if (matches.length === 0) return this.error(column, "MISSING_REFERENCE");
    if (matches.length > 1) return this.error(column, "AMBIGUOUS_REFERENCE");
    return matches[0]!.id;
  }
}

class ImportBuilder {
  readonly commands: FinanceCommand[] = [];
  readonly errors: ImportRowError[] = [];
  readonly rejectedRows = new Set<number>();
  readonly conflictRows = new Set<number>();
  readonly actions = { create: 0, update: 0, skip: 0 };
  amountTotal = 0;

  constructor(readonly data: FinanceData, readonly strategy: ImportDuplicateStrategy) {}

  reject(reader: RowReader): void {
    if (!reader.errors.length) reader.errors.push({ row: 0, column: "record_type", code: "INVALID_ROW" });
    this.rejectedRows.add(reader.errors[0]!.row);
    for (const error of reader.errors) {
      if (this.errors.length < MAX_ERRORS) this.errors.push(error);
    }
  }

  add(row: number, column: string, action: keyof ImportBuilder["actions"], command?: FinanceCommand, amount = 0): boolean {
    if (this.commands.length >= MAX_COMMANDS) {
      this.rejectWith(row, column, "ROW_LIMIT");
      return false;
    }
    if (action !== "create") this.conflictRows.add(row);
    this.actions[action] += 1;
    if (action === "skip") return true;
    try {
      this.commands.push(financeCommandSchema.parse(command));
      this.amountTotal += amount;
      return true;
    } catch {
      this.actions[action] -= 1;
      this.rejectWith(row, column, "INVALID_ROW");
      return false;
    }
  }

  rejectWith(row: number, column: string, code: ImportErrorCode): void {
    this.rejectedRows.add(row);
    if (this.errors.length < MAX_ERRORS) this.errors.push({ row, column, code });
  }
}

function columnsFor(contract: ImportTemplateContract): Map<string, number> {
  return new Map(contract.fields.map((field, index) => [field.key, index + 1]));
}

function metaValues(sheet: ExcelJS.Worksheet): Map<string, unknown> {
  const values = new Map<string, unknown>();
  sheet.eachRow((row, index) => {
    if (index > 1) values.set(String(row.getCell(1).value ?? ""), row.getCell(2).value);
  });
  return values;
}

function isPopulated(row: ExcelJS.Row, fieldCount: number): boolean {
  for (let column = 1; column <= fieldCount; column += 1) {
    if (row.getCell(column).value !== null && row.getCell(column).value !== undefined && row.getCell(column).value !== "") return true;
  }
  return false;
}

async function readSupportedWorkbook(filePath: string): Promise<ParsedWorkbook> {
  await preflightXlsxImport(filePath);
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    throw new Error("INVALID_IMPORT_TEMPLATE");
  }
  if (formulaPresent(workbook)) throw new Error("IMPORT_FORMULA_NOT_ALLOWED");
  const model = workbook.model as unknown as { externalLinks?: unknown[] };
  if ((model.externalLinks?.length ?? 0) > 0) throw new Error("IMPORT_FILE_UNSAFE");
  const expectedNames = [IMPORT_TEMPLATE_DATA_SHEET, IMPORT_TEMPLATE_META_SHEET, IMPORT_TEMPLATE_LISTS_SHEET].sort();
  if (workbook.worksheets.map((sheet) => sheet.name).sort().join("\0") !== expectedNames.join("\0")) throw new Error("INVALID_IMPORT_TEMPLATE");
  const dataSheet = workbook.getWorksheet(IMPORT_TEMPLATE_DATA_SHEET);
  const metaSheet = workbook.getWorksheet(IMPORT_TEMPLATE_META_SHEET);
  const listsSheet = workbook.getWorksheet(IMPORT_TEMPLATE_LISTS_SHEET);
  if (!dataSheet || !metaSheet || !listsSheet || dataSheet.state !== "visible" || metaSheet.state !== "veryHidden" || listsSheet.state !== "veryHidden") {
    throw new Error("INVALID_IMPORT_TEMPLATE");
  }
  const meta = metaValues(metaSheet);
  if (meta.get("signature") !== "ContaMi Import Template") throw new Error("INVALID_IMPORT_TEMPLATE");
  const templateVersion = Number(meta.get("templateVersion"));
  if (!SUPPORTED_IMPORT_TEMPLATE_VERSIONS.some((version) => version === templateVersion)) throw new Error("IMPORT_TEMPLATE_VERSION_UNSUPPORTED");
  const type = importTemplateTypeSchema.safeParse(meta.get("templateType"));
  if (!type.success) throw new Error("INVALID_IMPORT_TEMPLATE");
  const contract = importTemplateContractForVersion(type.data, templateVersion as ImportTemplateVersion);
  const headerRow = Number(meta.get("headerRow"));
  const dataStartRow = Number(meta.get("dataStartRow"));
  const maxDataRows = Number(meta.get("maxDataRows"));
  if (!Number.isInteger(headerRow) || !Number.isInteger(dataStartRow) || !Number.isInteger(maxDataRows)
    || headerRow !== 5 || dataStartRow !== 6 || maxDataRows < 1 || maxDataRows > 5_000) throw new Error("INVALID_IMPORT_TEMPLATE");
  const actualHeaders = (dataSheet.getRow(headerRow).values as unknown[]).slice(1, contract.fields.length + 1);
  if (JSON.stringify(actualHeaders) !== JSON.stringify(contract.fields.map((field) => field.key))
    || dataSheet.getRow(headerRow).cellCount > contract.fields.length) throw new Error("IMPORT_HEADERS_INVALID");
  const populatedRows: number[] = [];
  const lastAllowed = dataStartRow + maxDataRows - 1;
  dataSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= dataStartRow && isPopulated(row, contract.fields.length)) populatedRows.push(rowNumber);
  });
  if (populatedRows.some((row) => row > lastAllowed) || populatedRows.length > maxDataRows) throw new Error("IMPORT_ROW_LIMIT");
  return { type: type.data, contract, dataSheet, dataStartRow, maxDataRows, populatedRows };
}

function categoryItems(data: FinanceData, kind?: "income" | "expense"): CatalogItem[] {
  return data.categories
    .filter((item) => !kind || item.kind === kind || item.kind === "both")
    .map((item) => ({ id: item.id, active: item.active, labels: [item.nameIt, item.nameEn, `${item.nameIt} / ${item.nameEn}`] }));
}

function catalogItems<T extends { id: string; active: boolean }>(items: readonly T[], labels: (item: T) => string[]): CatalogItem[] {
  return items.map((item) => ({ id: item.id, active: item.active, labels: labels(item) }));
}

function simpleItems(data: FinanceData) {
  return {
    payments: catalogItems(data.paymentMethods, (item) => [item.name]),
    accounts: catalogItems(data.accounts, (item) => [item.name]),
    properties: catalogItems(data.properties, (item) => [item.name]),
    investments: catalogItems(data.investments, (item) => [item.name]),
    vehicles: catalogItems(data.vehicles, (item) => [item.name]),
    investmentTypes: catalogItems(data.investmentTypes.filter((item) => item.code !== "pension"), (item) => {
      const localized = item.nameIt === item.nameEn ? item.nameIt : `${item.nameIt} / ${item.nameEn}`;
      return [item.nameIt, item.nameEn, localized, `${localized} · ${item.code}`];
    }),
    taxes: catalogItems(data.taxTypes, (item) => [item.name, `${item.name} · ${item.installments} rate / instalments`]),
  };
}

function existingChoice<T>(
  row: number,
  column: string,
  matches: readonly T[],
  builder: ImportBuilder,
): { action: "create"; current?: undefined } | { action: "skip" | "update"; current: T } | undefined {
  if (matches.length > 1) {
    builder.rejectWith(row, column, "AMBIGUOUS_REFERENCE");
    return undefined;
  }
  if (matches.length === 0) return { action: "create" };
  builder.conflictRows.add(row);
  if (builder.strategy === "create") return { action: "create" };
  return { action: builder.strategy, current: matches[0]! };
}

function notes(reader: RowReader): string {
  return reader.text("notes", false, 2_000) ?? "";
}

function readCurrency(reader: RowReader, column = "currency", required = true): string | undefined {
  const value = reader.text(column, required, 3)?.toUpperCase();
  if (value && !/^[A-Z]{3}$/.test(value)) {
    reader.issue(column, "INVALID_ROW");
    return undefined;
  }
  return value;
}

function recordFingerprint(values: readonly unknown[]): string {
  return JSON.stringify(values.map((value) => typeof value === "string" ? normalize(value) : value ?? null));
}

function recordAction<T>(
  row: number,
  fingerprint: string,
  existing: readonly T[],
  seen: Set<string>,
  builder: ImportBuilder,
): { action: "create" | "update" | "skip"; current?: T } | undefined {
  if (seen.has(fingerprint) && builder.strategy !== "create") {
    builder.conflictRows.add(row);
    builder.actions.skip += 1;
    return { action: "skip" };
  }
  seen.add(fingerprint);
  const choice = existingChoice(row, "record_type", existing, builder);
  if (choice?.action === "skip") builder.add(row, "record_type", "skip");
  return choice;
}

function parseTransactions(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const seen = new Set<string>();
  for (const rowNumber of parsed.populatedRows) {
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const date = reader.date("date", true);
    const description = reader.text("description", true);
    const kind = reader.enum("kind", ["income", "expense", "transfer"] as const, true);
    const amount = reader.number("amount", true, { positive: true });
    const currency = readCurrency(reader);
    const categoryId = reader.catalog("category", categoryItems(data, kind === "income" ? "income" : kind === "expense" ? "expense" : undefined), true);
    const paymentMethodId = reader.catalog("payment_method", catalogs.payments, true);
    const cashFlowDirection = reader.enum("cash_flow_direction", ["inflow", "outflow", "neutral"] as const, kind === "transfer");
    const accountId = reader.catalog("account", catalogs.accounts, reader.hasColumn("account"));
    const destinationAccountId = reader.catalog("destination_account", catalogs.accounts, reader.hasColumn("destination_account") && kind === "transfer" && cashFlowDirection === "neutral");
    const planned = reader.boolean("planned", true);
    const rowNotes = notes(reader);
    if (reader.errors.length || !date || !description || !kind || amount === undefined || !currency || !categoryId || !paymentMethodId || planned === undefined) {
      builder.reject(reader);
      continue;
    }
    const fingerprint = recordFingerprint([date, description, kind, amount, currency, categoryId, paymentMethodId, accountId, destinationAccountId, cashFlowDirection]);
    const matches = data.transactions.filter((item) => recordFingerprint([
      item.date, item.description, item.kind, item.amount, item.currency, item.categoryId, item.paymentMethodId, item.accountId, item.destinationAccountId, item.cashFlowDirection,
    ]) === fingerprint);
    const choice = recordAction(rowNumber, fingerprint, matches, seen, builder);
    if (!choice || choice.action === "skip") continue;
    const timestamp = new Date().toISOString();
    const value: Transaction = {
      ...choice.current,
      id: choice.current?.id ?? crypto.randomUUID(), date, description, kind, amount, currency, categoryId, paymentMethodId,
      accountId, destinationAccountId, cashFlowDirection, planned, shared: false, notes: rowNotes,
      createdAt: choice.current?.createdAt ?? timestamp, updatedAt: timestamp,
    };
    builder.add(rowNumber, "record_type", choice.action, { type: choice.action === "update" ? "updateTransaction" : "addTransaction", value }, amount);
  }
}

function propertyValue(reader: RowReader, id: string, usage: "residence" | "rental", current?: Property): Property | undefined {
  const name = reader.text("name", true);
  const kind = reader.enum("property_kind", ["apartment", "house", "garage", "land", "commercial", "other"] as const, true);
  const ownershipShare = reader.number("ownership_share", true, { max: 1 });
  const purchasePrice = reader.number("purchase_price", true);
  const active = reader.boolean("active", true);
  const areaSqm = reader.number("area_sqm", false, { positive: true, max: 1_000_000 });
  const rentDueDay = reader.number("rent_due_day", false, { integer: true, positive: true, max: 31 });
  if (reader.errors.length || !name || !kind || ownershipShare === undefined || purchasePrice === undefined || active === undefined) return undefined;
  return {
    id, name, kind, usage, address: reader.text("address", false, 320), areaSqm, ownershipShare,
    cadastralValue: reader.number("cadastral_value"), expectedMonthlyRent: reader.number("expected_monthly_rent"),
    rentDueDay, purchaseDate: reader.date("purchase_date"), purchasePrice, active,
    closedAt: active ? undefined : (reader.date("closed_at") ?? current?.closedAt), notes: notes(reader),
  };
}

function processPropertyRegistries(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder, keys: Map<string, string>): void {
  const columns = columnsFor(parsed.contract);
  const usage = parsed.type === "residence" ? "residence" : "rental";
  for (const rowNumber of parsed.populatedRows) {
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    if (reader.enum("record_type", ["property", "valuation", "income", "expense", "utility", "tax"] as const, true) !== "property") continue;
    const rawKey = reader.text("property_key", true, 120);
    const name = reader.text("name", true);
    if (!rawKey || !name || reader.errors.length) { builder.reject(reader); continue; }
    const key = normalize(rawKey);
    if (keys.has(key)) { builder.rejectWith(rowNumber, "property_key", "DUPLICATE_KEY"); continue; }
    const matches = data.properties.filter((item) => normalize(item.name) === normalize(name) && item.usage === usage);
    const choice = existingChoice(rowNumber, "name", matches, builder);
    if (!choice) continue;
    const id = choice.current?.id ?? crypto.randomUUID();
    const value = propertyValue(reader, id, usage, choice.current);
    if (!value || reader.errors.length) { builder.reject(reader); continue; }
    keys.set(key, id);
    builder.add(rowNumber, "name", choice.action, choice.action === "skip" ? undefined : {
      type: choice.action === "update" ? "updateProperty" : "addProperty", value,
    });
  }
}

function parseProperties(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const keys = new Map<string, string>();
  const seen = new Set<string>();
  processPropertyRegistries(parsed, data, builder, keys);
  for (const rowNumber of parsed.populatedRows) {
    if (builder.rejectedRows.has(rowNumber)) continue;
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const recordType = reader.enum("record_type", ["property", "valuation", "income", "expense", "utility", "tax"] as const, true);
    if (recordType === "property") continue;
    const key = reader.text("property_key", true, 120);
    const propertyId = key ? keys.get(normalize(key)) : undefined;
    if (!propertyId) reader.errors.push({ row: rowNumber, column: "property_key", code: "MISSING_REFERENCE" });
    const date = reader.date("date", true);
    const description = reader.text("description", true);
    const amount = reader.number("amount", true, { positive: recordType !== "valuation" });
    const monetaryKind = recordType === "income" ? "income" : recordType === "valuation" ? undefined : "expense";
    const categoryId = monetaryKind ? reader.catalog("category", categoryItems(data, monetaryKind), true) : undefined;
    const paymentMethodId = monetaryKind ? reader.catalog("payment_method", catalogs.payments, true) : undefined;
    const accountId = monetaryKind ? reader.catalog("account", catalogs.accounts, reader.hasColumn("account")) : undefined;
    const taxTypeId = recordType === "tax" ? reader.catalog("tax_type", catalogs.taxes, true) : undefined;
    const taxInstallmentNumber = recordType === "tax" ? reader.number("installment_number", false, { integer: true, positive: true, max: 24 }) : undefined;
    const detail = recordType === "utility"
      ? reader.enum("utility_type", ["electricity", "gas", "water", "phone_internet"] as const, true)
      : undefined;
    const shared = monetaryKind === "expense" ? (reader.boolean("shared") ?? false) : false;
    const isCommonExpense = reader.boolean("is_common_expense") ?? false;
    const ownerShare = shared ? reader.number("owner_share", true) : undefined;
    const partnerShare = shared ? reader.number("partner_share", true) : undefined;
    const paidBy = shared ? reader.enum("paid_by", ["owner", "partner"] as const, true) : undefined;
    const settled = shared ? reader.boolean("settled", true) : undefined;
    const quantity = reader.number("quantity");
    const unit = reader.text("unit", false, 24);
    const electricityKwhF1 = reader.number("electricity_kwh_f1");
    const electricityKwhF2 = reader.number("electricity_kwh_f2");
    const electricityKwhF3 = reader.number("electricity_kwh_f3");
    const electricityKwhF23 = reader.number("electricity_kwh_f23");
    const rowNotes = notes(reader);
    if (taxTypeId) {
      const tax = data.taxTypes.find((item) => item.id === taxTypeId);
      const pendingProperty = builder.commands.find((command) => command.type === "addProperty" && command.value.id === propertyId);
      const property = data.properties.find((item) => item.id === propertyId)
        ?? (pendingProperty?.type === "addProperty" ? pendingProperty.value : undefined);
      if (!tax || !property || (tax.appliesTo !== "all" && tax.appliesTo !== property.usage)
        || (tax.installments > 1 && !taxInstallmentNumber) || (taxInstallmentNumber && taxInstallmentNumber > tax.installments)) {
        reader.errors.push({ row: rowNumber, column: "installment_number", code: "INVALID_REFERENCE" });
      }
    }
    if (shared && ownerShare !== undefined && partnerShare !== undefined && amount !== undefined && Math.abs(ownerShare + partnerShare - amount) > 0.01) {
      reader.errors.push({ row: rowNumber, column: "partner_share", code: "INVALID_NUMBER" });
    }
    if (reader.errors.length || !recordType || !propertyId || !date || !description || amount === undefined) { builder.reject(reader); continue; }
    const kind = recordType === "valuation" ? "valuation" : recordType === "income" ? "income" : "expense";
    const detailKind = detail ? `utility_${detail}` as PropertyEntry["detailKind"] : undefined;
    const fingerprint = recordFingerprint([propertyId, date, recordType, description, amount, categoryId, paymentMethodId, taxTypeId, taxInstallmentNumber, detailKind]);
    const matches = data.propertyEntries.filter((item) => recordFingerprint([
      item.propertyId, item.date, item.taxTypeId ? "tax" : item.detailKind ? "utility" : item.kind, item.description, item.amount,
      item.categoryId, item.paymentMethodId, item.taxTypeId, item.taxInstallmentNumber, item.detailKind,
    ]) === fingerprint);
    const choice = recordAction(rowNumber, fingerprint, matches, seen, builder);
    if (!choice || choice.action === "skip") continue;
    const entry: PropertyEntry = {
      id: choice.current?.id ?? crypto.randomUUID(), propertyId, date, kind,
      category: recordType === "valuation" ? "Valuation" : data.categories.find((item) => item.id === categoryId)?.nameIt ?? description,
      categoryId, description, amount, quantity, unit, detailKind,
      taxTypeId, taxInstallmentNumber, electricityKwhF1, electricityKwhF2, electricityKwhF3,
      electricityKwhF23, paymentMethodId, accountId, transactionId: choice.current?.transactionId,
      isCommonExpense, notes: rowNotes,
    };
    if (reader.errors.length) { builder.reject(reader); continue; }
    const existingTransaction = data.transactions.find((item) => item.id === choice.current?.transactionId);
    const existingShared = data.sharedExpenses.find((item) => item.id === existingTransaction?.sharedExpenseId);
    if (kind === "expense" && (shared || existingShared)) {
      builder.add(rowNumber, "record_type", choice.action, {
        type: choice.action === "update" ? "updatePropertyExpense" : "addPropertyExpense",
        value: {
          entry,
          shared: shared
            ? { id: existingShared?.id ?? crypto.randomUUID(), ownerShare: ownerShare!, partnerShare: partnerShare!, paidBy: paidBy!, settled: settled! }
            : undefined,
        },
      }, amount);
    } else {
      builder.add(rowNumber, "record_type", choice.action, {
        type: choice.action === "update" ? "updatePropertyEntry" : "addPropertyEntry", value: entry,
      }, amount);
    }
  }
}

function periodicInvestmentFields(reader: RowReader): Pick<Investment, "periodicAmount" | "periodicFrequency" | "periodicNextDueDate" | "periodicCategoryId" | "periodicPaymentMethodId" | "periodicAccountId"> {
  const amount = reader.number("periodic_amount", false, { positive: true });
  const frequency = reader.enum("periodic_frequency", ["monthly", "yearly"] as const, Boolean(amount));
  const due = reader.date("periodic_next_due_date", Boolean(amount));
  return { periodicAmount: amount, periodicFrequency: frequency, periodicNextDueDate: due, periodicCategoryId: undefined, periodicPaymentMethodId: undefined, periodicAccountId: undefined };
}

function readInvestment(
  reader: RowReader,
  data: FinanceData,
  id: string,
  kind: Investment["kind"],
  typeId: string | undefined,
  parentInvestmentId: string | undefined,
  current?: Investment,
  allowIsin = true,
): Investment | undefined {
  const catalogs = simpleItems(data);
  const name = reader.text("name", true);
  const currency = readCurrency(reader);
  const openedAt = reader.date("opened_at", true);
  const active = reader.boolean("active", true);
  const periodic = periodicInvestmentFields(reader);
  if (periodic.periodicAmount) {
    periodic.periodicCategoryId = reader.catalog("periodic_category", categoryItems(data, "expense"), true);
    periodic.periodicPaymentMethodId = reader.catalog("periodic_payment_method", catalogs.payments, true);
    periodic.periodicAccountId = reader.catalog("periodic_account", catalogs.accounts, reader.hasColumn("periodic_account"));
  }
  const rawIsin = allowIsin && reader.hasColumn("isin") ? reader.text("isin", false, 32) : undefined;
  const isin = allowIsin
    ? reader.hasColumn("isin")
      ? normalizeOptionalIsin(rawIsin ?? "")
      : current?.isin
    : undefined;
  if (rawIsin && validateOptionalIsin(rawIsin)) reader.issue("isin", "INVALID_ISIN");
  if (reader.errors.length || !name || !currency || !openedAt || active === undefined) return undefined;
  return {
    id, name, kind, typeId, parentInvestmentId, provider: reader.text("provider", false, 120) ?? "",
    isin, currency, ...periodic, active, openedAt, closedAt: active ? undefined : (reader.date("closed_at") ?? current?.closedAt), notes: notes(reader),
  };
}

function investmentKind(code: string): Investment["kind"] {
  return (["fund", "stock", "bond", "pension", "savings", "etf", "other"] as const).includes(code as Investment["kind"])
    ? code as Investment["kind"]
    : "other";
}

function parseInvestmentEntries(
  parsed: ParsedWorkbook,
  data: FinanceData,
  builder: ImportBuilder,
  keyForRow: (reader: RowReader, row: number) => string | undefined,
  registryTypes: readonly string[],
): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const seen = new Set<string>();
  for (const rowNumber of parsed.populatedRows) {
    if (builder.rejectedRows.has(rowNumber)) continue;
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const typeValues = parsed.type === "pension"
      ? ["pension", "compartment", "contribution", "withdrawal", "valuation"] as const
      : ["position", "contribution", "withdrawal", "valuation"] as const;
    const recordType = reader.enum("record_type", typeValues, true);
    if (!recordType || registryTypes.includes(recordType)) continue;
    if (recordType !== "contribution" && recordType !== "withdrawal" && recordType !== "valuation") continue;
    const investmentId = keyForRow(reader, rowNumber);
    if (!investmentId) reader.errors.push({ row: rowNumber, column: parsed.type === "pension" ? "compartment_key" : "investment_key", code: "MISSING_REFERENCE" });
    const date = reader.date("date", true);
    const description = reader.text("description", true);
    const amount = reader.number("amount", true, { positive: recordType !== "valuation" });
    const categoryId = recordType !== "valuation"
      ? reader.catalog("category", categoryItems(data, recordType === "contribution" ? "expense" : "income"), true)
      : undefined;
    const paymentMethodId = recordType !== "valuation" ? reader.catalog("payment_method", catalogs.payments, true) : undefined;
    const accountId = recordType !== "valuation" ? reader.catalog("account", catalogs.accounts, reader.hasColumn("account")) : undefined;
    const rowNotes = notes(reader);
    if (reader.errors.length || !investmentId || !date || !description || amount === undefined) { builder.reject(reader); continue; }
    const fingerprint = recordFingerprint([investmentId, date, recordType, description, amount, categoryId, paymentMethodId, accountId]);
    const matches = data.investmentEntries.filter((item) => recordFingerprint([
      item.investmentId, item.date, item.kind, item.description, item.amount, item.categoryId, item.paymentMethodId, item.accountId,
    ]) === fingerprint);
    const choice = recordAction(rowNumber, fingerprint, matches, seen, builder);
    if (!choice || choice.action === "skip") continue;
    const value: InvestmentEntry = {
      id: choice.current?.id ?? crypto.randomUUID(), investmentId, date, kind: recordType,
      amount, description, categoryId, paymentMethodId, accountId: recordType === "valuation" ? undefined : accountId,
      transactionId: choice.current?.transactionId, notes: rowNotes,
    };
    if (reader.errors.length) { builder.reject(reader); continue; }
    builder.add(rowNumber, "record_type", choice.action, {
      type: choice.action === "update" ? "updateInvestmentEntry" : "addInvestmentEntry", value,
    }, amount);
  }
}

function parseInvestments(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const keys = new Map<string, string>();
  for (const rowNumber of parsed.populatedRows) {
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const recordType = reader.enum("record_type", ["position", "contribution", "withdrawal", "valuation"] as const, true);
    if (recordType !== "position") continue;
    const rawKey = reader.text("investment_key", true, 120);
    const name = reader.text("name", true);
    const typeId = reader.catalog("investment_type", catalogs.investmentTypes, true);
    if (!rawKey || !name || !typeId || reader.errors.length) { builder.reject(reader); continue; }
    const key = normalize(rawKey);
    if (keys.has(key)) { builder.rejectWith(rowNumber, "investment_key", "DUPLICATE_KEY"); continue; }
    const matches = data.investments.filter((item) => !item.parentInvestmentId && item.kind !== "pension" && normalize(item.name) === normalize(name));
    const choice = existingChoice(rowNumber, "name", matches, builder);
    if (!choice) continue;
    const id = choice.current?.id ?? crypto.randomUUID();
    const type = data.investmentTypes.find((item) => item.id === typeId)!;
    const value = readInvestment(reader, data, id, investmentKind(type.code), typeId, undefined, choice.current);
    if (!value || reader.errors.length) { builder.reject(reader); continue; }
    keys.set(key, id);
    builder.add(rowNumber, "name", choice.action, choice.action === "skip" ? undefined : {
      type: choice.action === "update" ? "updateInvestment" : "addInvestment", value,
    });
  }
  parseInvestmentEntries(parsed, data, builder, (reader) => {
    const key = reader.text("investment_key", true, 120);
    return key ? keys.get(normalize(key)) : undefined;
  }, ["position"]);
}

function parsePension(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const pensionType = data.investmentTypes.find((item) => item.code === "pension");
  if (!pensionType) throw new Error("INVALID_IMPORT_TEMPLATE");
  const pensions = new Map<string, string>();
  const compartments = new Map<string, string>();
  for (const registryType of ["pension", "compartment"] as const) {
    for (const rowNumber of parsed.populatedRows) {
      if (builder.rejectedRows.has(rowNumber)) continue;
      const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
      const recordType = reader.enum("record_type", ["pension", "compartment", "contribution", "withdrawal", "valuation"] as const, true);
      if (recordType !== registryType) continue;
      const pensionKey = reader.text("pension_key", true, 120);
      const compartmentKey = registryType === "compartment" ? reader.text("compartment_key", true, 120) : undefined;
      const name = reader.text("name", true);
      const parentId = registryType === "compartment" && pensionKey ? pensions.get(normalize(pensionKey)) : undefined;
      if (registryType === "compartment" && !parentId) reader.issue("pension_key", "MISSING_REFERENCE");
      const map = registryType === "pension" ? pensions : compartments;
      const rawKey = registryType === "pension" ? pensionKey : compartmentKey;
      if (!rawKey || !name || reader.errors.length) { builder.reject(reader); continue; }
      const key = registryType === "pension" ? normalize(rawKey) : normalize(`${pensionKey ?? ""}\0${rawKey}`);
      if (map.has(key)) { builder.rejectWith(rowNumber, registryType === "pension" ? "pension_key" : "compartment_key", "DUPLICATE_KEY"); continue; }
      const matches = data.investments.filter((item) => item.kind === "pension" && item.parentInvestmentId === parentId && normalize(item.name) === normalize(name));
      const choice = existingChoice(rowNumber, "name", matches, builder);
      if (!choice) continue;
      const id = choice.current?.id ?? crypto.randomUUID();
      const value = readInvestment(reader, data, id, "pension", pensionType.id, parentId, choice.current, registryType === "compartment");
      if (!value || reader.errors.length) { builder.reject(reader); continue; }
      map.set(key, id);
      builder.add(rowNumber, "name", choice.action, choice.action === "skip" ? undefined : {
        type: choice.action === "update" ? "updateInvestment" : "addInvestment", value,
      });
    }
  }
  parseInvestmentEntries(parsed, data, builder, (reader) => {
    const pensionKey = reader.text("pension_key", true, 120);
    const compartmentKey = reader.text("compartment_key", true, 120);
    return pensionKey && compartmentKey ? compartments.get(normalize(`${pensionKey}\0${compartmentKey}`)) : undefined;
  }, ["pension", "compartment"]);
}

function parseSharedExpenses(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const seen = new Set<string>();
  for (const rowNumber of parsed.populatedRows) {
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const date = reader.date("date", true);
    const description = reader.text("description", true);
    const amount = reader.number("amount", true, { positive: true });
    const ownerShare = reader.number("owner_share", true);
    const partnerShare = reader.number("partner_share", true);
    const paidBy = reader.enum("paid_by", ["owner", "partner"] as const, true);
    const settled = reader.boolean("settled", true);
    const categoryId = reader.catalog("category", categoryItems(data, "expense"), true);
    const paymentMethodId = reader.catalog("payment_method", catalogs.payments, true);
    const accountId = reader.catalog("account", catalogs.accounts, reader.hasColumn("account"));
    const rowNotes = notes(reader);
    if (amount !== undefined && ownerShare !== undefined && partnerShare !== undefined && Math.abs(ownerShare + partnerShare - amount) > 0.01) {
      reader.errors.push({ row: rowNumber, column: "partner_share", code: "INVALID_NUMBER" });
    }
    if (reader.errors.length || !date || !description || amount === undefined || ownerShare === undefined || partnerShare === undefined || !paidBy || settled === undefined || !categoryId || !paymentMethodId) {
      builder.reject(reader); continue;
    }
    const fingerprint = recordFingerprint([date, description, amount, ownerShare, partnerShare, paidBy, categoryId, paymentMethodId, accountId]);
    const matches = data.sharedExpenses.filter((item) => recordFingerprint([
      item.date, item.description, item.amount, item.ownerShare, item.partnerShare, item.paidBy, item.categoryId, item.paymentMethodId, item.accountId,
    ]) === fingerprint);
    const choice = recordAction(rowNumber, fingerprint, matches, seen, builder);
    if (!choice || choice.action === "skip") continue;
    const value: SharedExpense = {
      id: choice.current?.id ?? crypto.randomUUID(), date, description, amount, ownerShare, partnerShare, paidBy, settled,
      categoryId, paymentMethodId, accountId, transactionId: choice.current?.transactionId, notes: rowNotes,
    };
    if (reader.errors.length) { builder.reject(reader); continue; }
    builder.add(rowNumber, "record_type", choice.action, {
      type: choice.action === "update" ? "updateSharedExpense" : "addSharedExpense", value,
    }, amount);
  }
}

function parseRecurring(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const seen = new Set<string>();
  for (const rowNumber of parsed.populatedRows) {
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const name = reader.text("name", true);
    const kind = reader.enum("kind", ["subscription", "service", "installment", "investment", "rent", "other"] as const, true);
    const direction = reader.enum("direction", ["income", "expense"] as const, true);
    const amount = reader.number("amount", true, { positive: true });
    const frequency = reader.enum("frequency", ["weekly", "monthly", "quarterly", "yearly"] as const, true);
    const categoryId = reader.catalog("category", categoryItems(data, direction), true);
    const paymentMethodId = reader.catalog("payment_method", catalogs.payments, true);
    const accountId = reader.catalog("account", catalogs.accounts, reader.hasColumn("account"));
    const nextDueDate = reader.date("next_due_date", true);
    const endDate = reader.date("end_date");
    const remainingInstallments = reader.number("remaining_installments", false, { integer: true, max: 10_000 });
    const active = reader.boolean("active", true);
    const propertyId = reader.catalog("property", catalogs.properties);
    const investmentId = reader.catalog("investment", catalogs.investments);
    const vehicleId = reader.catalog("vehicle", catalogs.vehicles);
    const rowNotes = notes(reader);
    if (reader.errors.length || !name || !kind || !direction || amount === undefined || !frequency || !categoryId || !paymentMethodId || !nextDueDate || active === undefined) {
      builder.reject(reader); continue;
    }
    const fingerprint = recordFingerprint([name, kind, direction, amount, frequency, categoryId, paymentMethodId, accountId, nextDueDate, propertyId, investmentId, vehicleId]);
    const matches = data.recurringItems.filter((item) => recordFingerprint([
      item.name, item.kind, item.direction ?? "expense", item.amount, item.frequency, item.categoryId, item.paymentMethodId, item.accountId,
      item.nextDueDate, item.propertyId, item.investmentId, item.vehicleId,
    ]) === fingerprint);
    const choice = recordAction(rowNumber, fingerprint, matches, seen, builder);
    if (!choice || choice.action === "skip") continue;
    const value: RecurringItem = {
      id: choice.current?.id ?? crypto.randomUUID(), name, kind, direction, amount, frequency, categoryId, paymentMethodId, accountId,
      nextDueDate, endDate, remainingInstallments, active, closedAt: active ? undefined : (choice.current?.closedAt ?? nextDueDate),
      propertyId, investmentId, vehicleId, notes: rowNotes,
    };
    if (reader.errors.length) { builder.reject(reader); continue; }
    builder.add(rowNumber, "record_type", choice.action, {
      type: choice.action === "update" ? "updateRecurringItem" : "addRecurringItem", value,
    }, amount);
  }
}

function vehicleValue(reader: RowReader, id: string, current?: Vehicle): Vehicle | undefined {
  const name = reader.text("name", true);
  const fuelType = reader.enum("fuel_type", ["petrol", "diesel", "lpg", "methane", "hybrid", "electric", "other"] as const, true);
  const active = reader.boolean("active", true);
  if (reader.errors.length || !name || !fuelType || active === undefined) return undefined;
  return {
    id, name, fuelType, manufacturer: reader.text("manufacturer", false, 120) ?? "",
    model: reader.text("model", false, 120) ?? "", purchaseDate: reader.date("purchase_date"),
    disposalDate: active ? undefined : (reader.date("disposal_date") ?? current?.disposalDate),
    purchasePrice: reader.number("purchase_price"), salePrice: reader.number("sale_price"), active, notes: notes(reader),
  };
}

function parseVehicles(parsed: ParsedWorkbook, data: FinanceData, builder: ImportBuilder): void {
  const columns = columnsFor(parsed.contract);
  const catalogs = simpleItems(data);
  const keys = new Map<string, string>();
  const seen = new Set<string>();
  const types = ["vehicle", "fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "valuation", "other"] as const;
  for (const rowNumber of parsed.populatedRows) {
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    if (reader.enum("record_type", types, true) !== "vehicle") continue;
    const rawKey = reader.text("vehicle_key", true, 120);
    const name = reader.text("name", true);
    if (!rawKey || !name || reader.errors.length) { builder.reject(reader); continue; }
    const key = normalize(rawKey);
    if (keys.has(key)) { builder.rejectWith(rowNumber, "vehicle_key", "DUPLICATE_KEY"); continue; }
    const matches = data.vehicles.filter((item) => normalize(item.name) === normalize(name));
    const choice = existingChoice(rowNumber, "name", matches, builder);
    if (!choice) continue;
    const id = choice.current?.id ?? crypto.randomUUID();
    const value = vehicleValue(reader, id, choice.current);
    if (!value || reader.errors.length) { builder.reject(reader); continue; }
    keys.set(key, id);
    builder.add(rowNumber, "name", choice.action, choice.action === "skip" ? undefined : {
      type: choice.action === "update" ? "updateVehicle" : "addVehicle", value,
    });
  }
  for (const rowNumber of parsed.populatedRows) {
    if (builder.rejectedRows.has(rowNumber)) continue;
    const reader = new RowReader(parsed.dataSheet.getRow(rowNumber), columns);
    const recordType = reader.enum("record_type", types, true);
    if (!recordType || recordType === "vehicle") continue;
    const key = reader.text("vehicle_key", true, 120);
    const vehicleId = key ? keys.get(normalize(key)) : undefined;
    if (!vehicleId) reader.errors.push({ row: rowNumber, column: "vehicle_key", code: "MISSING_REFERENCE" });
    const date = reader.date("date", true);
    const description = reader.text("description", true);
    const amount = reader.number("amount", true, { positive: recordType !== "valuation" });
    const categoryId = recordType !== "valuation" ? reader.catalog("category", categoryItems(data, "expense"), true) : undefined;
    const paymentMethodId = recordType !== "valuation" ? reader.catalog("payment_method", catalogs.payments, true) : undefined;
    const accountId = recordType !== "valuation" ? reader.catalog("account", catalogs.accounts, reader.hasColumn("account")) : undefined;
    const fuelLiters = reader.number("fuel_liters", false, { positive: true, max: 1_000_000 });
    const odometerKm = reader.number("odometer_km", false, { max: 100_000_000 });
    const distanceKm = reader.number("distance_km", false, { max: 10_000_000 });
    const fuelUnitPrice = reader.number("fuel_unit_price");
    const entryFuelType = reader.text("entry_fuel_type", false, 80);
    const vendor = reader.text("vendor", false, 160);
    const rowNotes = notes(reader);
    if (recordType === "fuel" && fuelLiters === undefined) reader.errors.push({ row: rowNumber, column: "fuel_liters", code: "REQUIRED_VALUE" });
    if (reader.errors.length || !vehicleId || !date || !description || amount === undefined) { builder.reject(reader); continue; }
    const fingerprint = recordFingerprint([vehicleId, date, recordType, description, amount, categoryId, paymentMethodId, accountId]);
    const matches = data.vehicleEntries.filter((item) => recordFingerprint([
      item.vehicleId, item.date, item.kind, item.description, item.amount, item.categoryId, item.paymentMethodId, item.accountId,
    ]) === fingerprint);
    const choice = recordAction(rowNumber, fingerprint, matches, seen, builder);
    if (!choice || choice.action === "skip") continue;
    const value: VehicleEntry = {
      id: choice.current?.id ?? crypto.randomUUID(), vehicleId, date, kind: recordType, description, amount,
      odometerKm, distanceKm, fuelLiters, fuelUnitPrice, fuelType: entryFuelType,
      vendor, categoryId, paymentMethodId, accountId, transactionId: choice.current?.transactionId, notes: rowNotes,
    };
    if (reader.errors.length) { builder.reject(reader); continue; }
    builder.add(rowNumber, "record_type", choice.action, {
      type: choice.action === "update" ? "updateVehicleEntry" : "addVehicleEntry", value,
    }, amount);
  }
}

export interface ImportTemplateParser {
  parse(filePath: string, data: FinanceData, strategy: ImportDuplicateStrategy): Promise<PreparedImport>;
}

export class ExcelImportTemplateParser implements ImportTemplateParser {
  async parse(filePath: string, data: FinanceData, strategy: ImportDuplicateStrategy): Promise<PreparedImport> {
    const parsed = await readSupportedWorkbook(filePath);
    const builder = new ImportBuilder(data, strategy);
    if (parsed.type === "transactions") parseTransactions(parsed, data, builder);
    else if (parsed.type === "residence" || parsed.type === "rental_properties") parseProperties(parsed, data, builder);
    else if (parsed.type === "investments") parseInvestments(parsed, data, builder);
    else if (parsed.type === "pension") parsePension(parsed, data, builder);
    else if (parsed.type === "shared_expenses") parseSharedExpenses(parsed, data, builder);
    else if (parsed.type === "recurring_items") parseRecurring(parsed, data, builder);
    else parseVehicles(parsed, data, builder);

    if (builder.commands.length) {
      try {
        applyFinanceCommands(data, builder.commands);
      } catch {
        throw new Error("IMPORT_PLAN_INVALID");
      }
    }
    const rejectedRows = builder.rejectedRows.size;
    return {
      fileName: path.basename(filePath),
      templateType: parsed.type,
      commands: builder.commands,
      preview: {
        fileName: path.basename(filePath),
        templateType: parsed.type,
        totalRows: parsed.populatedRows.length,
        validRows: parsed.populatedRows.length - rejectedRows,
        rejectedRows,
        conflictRows: builder.conflictRows.size,
        amountTotal: Math.round(builder.amountTotal * 100) / 100,
        actions: builder.actions,
        errors: builder.errors,
        errorsTruncated: builder.errors.length >= MAX_ERRORS,
      },
    };
  }
}
