import { createAssetReport, type AssetReportScope } from "./assetReport";
import type { FinanceData } from "./models";

export function createPensionReport(
  data: FinanceData,
  pensionId: string | undefined,
  scope: AssetReportScope,
  asOf: string,
) {
  return createAssetReport(data, pensionId, scope, asOf, "pension");
}
