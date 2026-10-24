import { createAssetReport, type AssetReportScope } from "./assetReport";
import type { FinanceData } from "./models";

export {
  INVESTMENT_REPORT_DETAIL_LIMIT,
  INVESTMENT_REPORT_PERIOD_LIMIT,
} from "./assetReport";
export type {
  AssetReport as InvestmentReport,
  AssetReportCurrency as InvestmentReportCurrency,
  AssetReportMovement as InvestmentReportMovement,
  AssetReportPeriod as InvestmentReportPeriod,
  AssetReportPosition as InvestmentReportPosition,
  AssetReportScope as InvestmentReportScope,
} from "./assetReport";

export function createInvestmentReport(
  data: FinanceData,
  investmentId: string | undefined,
  scope: AssetReportScope,
  asOf: string,
) {
  return createAssetReport(data, investmentId, scope, asOf, "investment");
}
