import type { AssetReport } from "../../domain/assetReport";
import { investmentReportTranslations } from "../../shared/investmentReportContracts";
import { assetReportFileName, buildAssetReportHtml } from "./AssetReportDocument";

export function investmentReportFileName(report: AssetReport): string {
  return assetReportFileName(report, "investment", "investments");
}

export function buildInvestmentReportHtml(report: AssetReport, language: "it" | "en"): string {
  return buildAssetReportHtml(report, language, investmentReportTranslations[language]);
}
