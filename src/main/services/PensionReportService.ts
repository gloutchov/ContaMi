import { type BrowserWindow } from "electron";
import { createPensionReport } from "../../domain/pensionReport";
import { buildPensionReportHtml, pensionReportFileName } from "../../infrastructure/pdf/PensionReportDocument";
import { pensionReportTranslations, type PensionReportRequest, type PensionReportResult } from "../../shared/pensionReportContracts";
import type { FinanceFileService } from "./FinanceFileService";
import { localTodayIso, renderLocalPdfReport } from "./LocalPdfReport";

export class PensionReportService {
  constructor(
    private readonly parentWindow: BrowserWindow,
    private readonly finance: FinanceFileService,
  ) {}

  async generate(request: PensionReportRequest): Promise<PensionReportResult> {
    const data = await this.finance.dataForReport();
    const today = localTodayIso();
    const asOf = today < `${data.meta.activeYear}-12-31` ? today : `${data.meta.activeYear}-12-31`;
    const report = createPensionReport(data, request.pensionId, request.scope, asOf);
    const labels = pensionReportTranslations[request.language];
    return renderLocalPdfReport({
      parentWindow: this.parentWindow,
      action: request.action,
      saveTitle: labels.investmentReportSavePdf,
      defaultFileName: pensionReportFileName(report),
      html: buildPensionReportHtml(report, request.language),
      footer: { confidential: labels.investmentReportConfidential, page: labels.investmentReportPage, of: labels.investmentReportOf },
      failureCode: "PENSION_REPORT_FAILED",
    });
  }
}
