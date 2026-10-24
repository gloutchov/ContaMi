import { z } from "zod";
import type { FinanceCommand } from "../domain/commands";
import type { DashboardMetrics } from "../domain/finance";
import type { ImportTemplateType } from "../domain/importTemplates";
import type { ImportCommitResult, ImportDuplicateStrategy, ImportPreview } from "../domain/imports";
import type { FinanceData } from "../domain/models";
import type { PropertyReportRequest, PropertyReportResult } from "./propertyReportContracts";
import type { InvestmentReportRequest, InvestmentReportResult } from "./investmentReportContracts";
import type { PensionReportRequest, PensionReportResult } from "./pensionReportContracts";

export const appSettingsSchema = z.object({
  language: z.enum(["system", "it", "en"]),
  theme: z.enum(["system", "light", "dark"]),
  workbookFormat: z.enum(["excel", "numbers"]),
  workbookPath: z.string().max(4_096).optional(),
  numbersMirrorPath: z.string().max(4_096).optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

export interface SystemCapabilities {
  platform: NodeJS.Platform;
  systemLanguage: "it" | "en";
  systemTheme: "light" | "dark";
  numbersAvailable: boolean;
}

export interface FinanceSnapshot {
  data: FinanceData;
  metrics: DashboardMetrics;
  workbookConfigured: boolean;
  workbookDisplayName?: string;
  lastSavedAt?: string;
  warningCode?: string;
}

export interface WorkbookChoiceResult {
  canceled: boolean;
  path?: string;
  mirrorPath?: string;
}

export interface RolloverResult {
  canceled: boolean;
  archivedPath?: string;
  newWorkbookPath?: string;
  year?: number;
}

export interface ImportTemplateResult {
  canceled: boolean;
  fileName?: string;
}

export interface ContaMiApi {
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Pick<Partial<AppSettings>, "language" | "theme" | "workbookFormat">): Promise<AppSettings>;
  getCapabilities(): Promise<SystemCapabilities>;
  getSnapshot(): Promise<FinanceSnapshot>;
  createWorkbook(format: AppSettings["workbookFormat"]): Promise<WorkbookChoiceResult>;
  openWorkbook(): Promise<WorkbookChoiceResult>;
  execute(command: FinanceCommand): Promise<FinanceSnapshot>;
  rolloverYear(): Promise<RolloverResult>;
  revealWorkbook(): Promise<boolean>;
  recoverStaleWorkbookLock(): Promise<boolean>;
  generateImportTemplate(type: ImportTemplateType, language: "it" | "en"): Promise<ImportTemplateResult>;
  previewImport(strategy: ImportDuplicateStrategy, language: "it" | "en"): Promise<ImportPreview>;
  confirmImport(previewId: string): Promise<ImportCommitResult>;
  discardImport(previewId: string): Promise<boolean>;
  generatePropertyReport(request: PropertyReportRequest): Promise<PropertyReportResult>;
  generateInvestmentReport(request: InvestmentReportRequest): Promise<InvestmentReportResult>;
  generatePensionReport(request: PensionReportRequest): Promise<PensionReportResult>;
}

declare global {
  interface Window {
    contami?: ContaMiApi;
  }
}
