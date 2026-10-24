import { type BrowserWindow } from "electron";
import { createInvestmentReport } from "../../domain/investmentReport";
import { buildInvestmentReportHtml, investmentReportFileName } from "../../infrastructure/pdf/InvestmentReportDocument";
import { investmentReportTranslations, type InvestmentReportRequest, type InvestmentReportResult } from "../../shared/investmentReportContracts";
import type { FinanceFileService } from "./FinanceFileService";
import { localTodayIso, renderLocalPdfReport } from "./LocalPdfReport";

export class InvestmentReportService {
  constructor(
    private readonly parentWindow: BrowserWindow,
    private readonly finance: FinanceFileService,
  ) {}

  async generate(request: InvestmentReportRequest): Promise<InvestmentReportResult> {
    const data = await this.finance.dataForReport();
    const today = localTodayIso();
    const asOf = today < `${data.meta.activeYear}-12-31` ? today : `${data.meta.activeYear}-12-31`;
    const report = createInvestmentReport(data, request.investmentId, request.scope, asOf);
    const labels = investmentReportTranslations[request.language];
    return renderLocalPdfReport({
      parentWindow: this.parentWindow,
      action: request.action,
      saveTitle: labels.investmentReportSavePdf,
      defaultFileName: investmentReportFileName(report),
      html: buildInvestmentReportHtml(report, request.language),
      footer: { confidential: labels.investmentReportConfidential, page: labels.investmentReportPage, of: labels.investmentReportOf },
      failureCode: "INVESTMENT_REPORT_FAILED",
    });
  }
}
