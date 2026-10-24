import { app, ipcMain, nativeTheme, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import type { z } from "zod";
import type { SystemCapabilities } from "../../shared/contracts";
import { IPC } from "../../shared/ipc";
import {
  financeExecuteIpcArgumentsSchema,
  importTemplateGenerateIpcArgumentsSchema,
  importPreviewIpcArgumentsSchema,
  importPreviewIdIpcArgumentsSchema,
  noIpcArgumentsSchema,
  propertyReportIpcArgumentsSchema,
  investmentReportIpcArgumentsSchema,
  settingsUpdateIpcArgumentsSchema,
  workbookCreateIpcArgumentsSchema,
} from "../../shared/ipcValidation";
import type { SettingsService } from "../../infrastructure/settings/SettingsService";
import type { FinanceFileService } from "../services/FinanceFileService";
import type { ImportTemplateService } from "../services/ImportTemplateService";
import type { ImportDataService } from "../services/ImportDataService";
import type { PropertyReportService } from "../services/PropertyReportService";
import type { InvestmentReportService } from "../services/InvestmentReportService";

function safeError(error: unknown): Error {
  const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const allowed = new Set([
    "DUPLICATE_ID", "DUPLICATE_TAX_NAME", "PROPERTY_NOT_FOUND", "INVESTMENT_NOT_FOUND", "ENTITY_NOT_FOUND", "ENTITY_IN_USE", "SHARED_EXPENSE_NOT_FOUND",
    "VEHICLE_NOT_FOUND", "INVALID_VEHICLE_INSTALLMENT", "VEHICLE_INSTALLMENT_PLAN_EXISTS", "VEHICLE_INSTALLMENT_MANAGED",
    "TAX_TYPE_NOT_FOUND", "TAX_TYPE_INACTIVE", "TAX_TYPE_NOT_APPLICABLE", "INVALID_TAX_INSTALLMENT",
    "PAYMENT_METHOD_NOT_FOUND", "ACCOUNT_REQUIRED", "ACCOUNT_PAYMENT_METHOD_MISMATCH", "INVALID_INTERNAL_TRANSFER", "INVALID_CASH_REGISTER_FUNDING_ACCOUNT",
    "INVALID_WORKBOOK_PATH", "INVALID_WORKBOOK_SCHEMA", "WORKBOOK_TOO_LARGE", "WORKBOOK_RESOURCE_LIMIT", "WORKBOOK_UNSAFE", "WORKBOOK_VERIFICATION_FAILED",
    "NUMBERS_NOT_AVAILABLE", "NUMBERS_MIRROR_FAILED", "WORKBOOK_NOT_CONFIGURED", "WORKBOOK_CHANGED_EXTERNALLY",
    "WORKBOOK_LOCKED", "WORKBOOK_LOCK_STALE", "WORKBOOK_LOCK_LOST", "WORKBOOK_LOCK_UNAVAILABLE",
    "IMPORT_TEMPLATE_VERIFICATION_FAILED",
    "INVALID_IMPORT_TEMPLATE", "IMPORT_FILE_UNSAFE", "IMPORT_FILE_TOO_LARGE", "IMPORT_FORMULA_NOT_ALLOWED",
    "IMPORT_HEADERS_INVALID", "IMPORT_TEMPLATE_VERSION_UNSUPPORTED", "IMPORT_ROW_LIMIT", "IMPORT_PLAN_INVALID",
    "IMPORT_PREVIEW_EXPIRED", "IMPORT_NO_VALID_ROWS",
    "PROPERTY_REPORT_FAILED", "INVESTMENT_REPORT_FAILED",
  ]);
  return new Error(allowed.has(code) ? code : "OPERATION_FAILED");
}

export function registerIpc(
  window: BrowserWindow,
  settings: SettingsService,
  finance: FinanceFileService,
  importTemplates: ImportTemplateService,
  imports: ImportDataService,
  propertyReports: PropertyReportService,
  investmentReports: InvestmentReportService,
): void {
  for (const channel of Object.values(IPC)) ipcMain.removeHandler(channel);
  const trusted = (event: IpcMainInvokeEvent): void => {
    const expectedUrl = window.webContents.getURL();
    if (event.sender.id !== window.webContents.id
      || event.senderFrame !== window.webContents.mainFrame
      || event.senderFrame.url !== expectedUrl) throw new Error("UNTRUSTED_RENDERER");
  };
  const handle = <TArgs extends unknown[], TResult>(channel: string, schema: z.ZodType<TArgs>, fn: (args: TArgs) => Promise<TResult> | TResult) => {
    ipcMain.handle(channel, async (event, ...args: unknown[]) => {
      try {
        trusted(event);
        return await fn(schema.parse(args));
      } catch (error) {
        throw safeError(error);
      }
    });
  };

  handle(IPC.settingsGet, noIpcArgumentsSchema, () => settings.get());
  handle(IPC.settingsUpdate, settingsUpdateIpcArgumentsSchema, ([patch]) => settings.update(patch));
  handle(IPC.capabilitiesGet, noIpcArgumentsSchema, async (): Promise<SystemCapabilities> => ({
    platform: process.platform,
    systemLanguage: app.getLocale().toLowerCase().startsWith("it") ? "it" : "en",
    systemTheme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
    numbersAvailable: await finance.numbersAvailable(),
  }));
  handle(IPC.financeSnapshot, noIpcArgumentsSchema, () => finance.snapshot());
  handle(IPC.financeCreateWorkbook, workbookCreateIpcArgumentsSchema, ([format]) => finance.createWorkbook(format));
  handle(IPC.financeOpenWorkbook, noIpcArgumentsSchema, () => finance.openWorkbook());
  handle(IPC.financeExecute, financeExecuteIpcArgumentsSchema, ([command]) => finance.execute(command));
  handle(IPC.financeRollover, noIpcArgumentsSchema, () => finance.rollover());
  handle(IPC.financeRevealWorkbook, noIpcArgumentsSchema, () => finance.revealWorkbook());
  handle(IPC.financeRecoverStaleLock, noIpcArgumentsSchema, () => finance.recoverStaleLock());
  handle(IPC.importTemplateGenerate, importTemplateGenerateIpcArgumentsSchema, ([type, language]) => importTemplates.generate(type, language));
  handle(IPC.importPreview, importPreviewIpcArgumentsSchema, ([strategy, language]) => imports.preview(strategy, language));
  handle(IPC.importConfirm, importPreviewIdIpcArgumentsSchema, ([previewId]) => imports.confirm(previewId));
  handle(IPC.importDiscard, importPreviewIdIpcArgumentsSchema, ([previewId]) => imports.discard(previewId));
  handle(IPC.propertyReportGenerate, propertyReportIpcArgumentsSchema, ([request]) => propertyReports.generate(request));
  handle(IPC.investmentReportGenerate, investmentReportIpcArgumentsSchema, ([request]) => investmentReports.generate(request));
}
