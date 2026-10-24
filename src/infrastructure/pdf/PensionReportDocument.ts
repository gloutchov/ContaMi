import type { AssetReport } from "../../domain/assetReport";
import { pensionReportTranslations } from "../../shared/pensionReportContracts";
import { assetReportFileName, buildAssetReportHtml } from "./AssetReportDocument";

export function pensionReportFileName(report: AssetReport): string {
  return assetReportFileName(report, "pension", "pensions");
}

export function buildPensionReportHtml(report: AssetReport, language: "it" | "en"): string {
  return buildAssetReportHtml(report, language, pensionReportTranslations[language], true);
}
