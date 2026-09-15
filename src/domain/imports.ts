import { z } from "zod";
import type { FinanceCommand } from "./commands";
import type { ImportTemplateType } from "./importTemplates";

export const importDuplicateStrategySchema = z.enum(["skip", "create", "update"]);
export type ImportDuplicateStrategy = z.infer<typeof importDuplicateStrategySchema>;

export const importErrorCodeSchema = z.enum([
  "ACTIVE_CONTENT",
  "AMBIGUOUS_REFERENCE",
  "DUPLICATE_KEY",
  "FORMULA_NOT_ALLOWED",
  "INVALID_DATE",
  "INVALID_ENUM",
  "INVALID_HEADERS",
  "INVALID_ISIN",
  "INVALID_NUMBER",
  "INVALID_REFERENCE",
  "INVALID_ROW",
  "INVALID_TEMPLATE",
  "MISSING_REFERENCE",
  "REQUIRED_VALUE",
  "ROW_LIMIT",
  "TEXT_TOO_LONG",
  "UNSUPPORTED_TEMPLATE_VERSION",
]);
export type ImportErrorCode = z.infer<typeof importErrorCodeSchema>;

export interface ImportRowError {
  row: number;
  column: string;
  code: ImportErrorCode;
}

export interface ImportActionCounts {
  create: number;
  update: number;
  skip: number;
}

export interface ImportPreview {
  canceled: boolean;
  previewId?: string;
  fileName?: string;
  templateType?: ImportTemplateType;
  validRows: number;
  rejectedRows: number;
  conflictRows: number;
  totalRows: number;
  amountTotal: number;
  actions: ImportActionCounts;
  errors: ImportRowError[];
  errorsTruncated: boolean;
}

export interface ImportCommitResult {
  snapshotUpdated: boolean;
  templateType: ImportTemplateType;
  fileName: string;
  validRows: number;
  rejectedRows: number;
  amountTotal: number;
  actions: ImportActionCounts;
}

export interface PreparedImport {
  fileName: string;
  templateType: ImportTemplateType;
  commands: FinanceCommand[];
  preview: Omit<ImportPreview, "canceled" | "previewId">;
}
