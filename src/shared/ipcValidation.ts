import { z } from "zod";
import { financeCommandSchema } from "../domain/commands";
import { importTemplateTypeSchema } from "../domain/importTemplates";
import { importDuplicateStrategySchema } from "../domain/imports";
import { appSettingsSchema } from "./contracts";
import { propertyReportRequestSchema } from "./propertyReportContracts";
import { investmentReportRequestSchema } from "./investmentReportContracts";

export const noIpcArgumentsSchema = z.tuple([]);
export const settingsUpdateIpcArgumentsSchema = z.tuple([
  appSettingsSchema.pick({ language: true, theme: true, workbookFormat: true }).partial().strict(),
]);
export const workbookCreateIpcArgumentsSchema = z.tuple([z.enum(["excel", "numbers"])]);
export const financeExecuteIpcArgumentsSchema = z.tuple([financeCommandSchema]);
export const importTemplateGenerateIpcArgumentsSchema = z.tuple([importTemplateTypeSchema, z.enum(["it", "en"])]);
export const importPreviewIpcArgumentsSchema = z.tuple([importDuplicateStrategySchema, z.enum(["it", "en"])]);
export const importPreviewIdIpcArgumentsSchema = z.tuple([z.string().uuid()]);
export const propertyReportIpcArgumentsSchema = z.tuple([propertyReportRequestSchema]);
export const investmentReportIpcArgumentsSchema = z.tuple([investmentReportRequestSchema]);
