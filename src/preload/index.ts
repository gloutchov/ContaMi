import { contextBridge, ipcRenderer } from "electron";
import type { AppSettings, ContaMiApi } from "../shared/contracts";
import type { FinanceCommand } from "../domain/commands";
import type { ImportTemplateType } from "../domain/importTemplates";
import type { ImportDuplicateStrategy } from "../domain/imports";
import { IPC } from "../shared/ipc";
import type { PropertyReportRequest } from "../shared/propertyReportContracts";
import type { InvestmentReportRequest } from "../shared/investmentReportContracts";

const api: ContaMiApi = Object.freeze({
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  updateSettings: (patch: Pick<Partial<AppSettings>, "language" | "theme" | "workbookFormat">) => ipcRenderer.invoke(IPC.settingsUpdate, patch),
  getCapabilities: () => ipcRenderer.invoke(IPC.capabilitiesGet),
  getSnapshot: () => ipcRenderer.invoke(IPC.financeSnapshot),
  createWorkbook: (format: AppSettings["workbookFormat"]) => ipcRenderer.invoke(IPC.financeCreateWorkbook, format),
  openWorkbook: () => ipcRenderer.invoke(IPC.financeOpenWorkbook),
  execute: (command: FinanceCommand) => ipcRenderer.invoke(IPC.financeExecute, command),
  rolloverYear: () => ipcRenderer.invoke(IPC.financeRollover),
  revealWorkbook: () => ipcRenderer.invoke(IPC.financeRevealWorkbook),
  recoverStaleWorkbookLock: () => ipcRenderer.invoke(IPC.financeRecoverStaleLock),
  generateImportTemplate: (type: ImportTemplateType, language: "it" | "en") => ipcRenderer.invoke(IPC.importTemplateGenerate, type, language),
  previewImport: (strategy: ImportDuplicateStrategy, language: "it" | "en") => ipcRenderer.invoke(IPC.importPreview, strategy, language),
  confirmImport: (previewId: string) => ipcRenderer.invoke(IPC.importConfirm, previewId),
  discardImport: (previewId: string) => ipcRenderer.invoke(IPC.importDiscard, previewId),
  generatePropertyReport: (request: PropertyReportRequest) => ipcRenderer.invoke(IPC.propertyReportGenerate, request),
  generateInvestmentReport: (request: InvestmentReportRequest) => ipcRenderer.invoke(IPC.investmentReportGenerate, request),
});

contextBridge.exposeInMainWorld("contami", api);
