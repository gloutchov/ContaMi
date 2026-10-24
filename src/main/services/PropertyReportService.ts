import { type BrowserWindow } from "electron";
import { createPropertyReport } from "../../domain/propertyReport";
import { buildPropertyReportHtml, propertyReportFileName } from "../../infrastructure/pdf/PropertyReportDocument";
import { propertyReportTranslations, type PropertyReportRequest, type PropertyReportResult } from "../../shared/propertyReportContracts";
import type { FinanceFileService } from "./FinanceFileService";
import { localTodayIso, renderLocalPdfReport, savePdfAtomically, validPdf } from "./LocalPdfReport";

export class PropertyReportService {
  constructor(
    private readonly parentWindow: BrowserWindow,
    private readonly finance: FinanceFileService,
  ) {}

  async generate(request: PropertyReportRequest): Promise<PropertyReportResult> {
    const data = await this.finance.dataForReport();
    const report = createPropertyReport(
      data,
      request.propertyId,
      request.scope,
      [request.ownerName, request.coOwnerName],
      localTodayIso(),
    );
    const labels = propertyReportTranslations[request.language];
    return renderLocalPdfReport({
      parentWindow: this.parentWindow,
      action: request.action,
      saveTitle: labels.propertyReportSavePdf,
      defaultFileName: propertyReportFileName(report),
      html: buildPropertyReportHtml(report, request.language),
      footer: { confidential: labels.propertyReportConfidential, page: labels.propertyReportPage, of: labels.propertyReportOf },
      failureCode: "PROPERTY_REPORT_FAILED",
    });
  }
}

export const propertyReportInternals = { localTodayIso, validPdf, savePdfAtomically };
