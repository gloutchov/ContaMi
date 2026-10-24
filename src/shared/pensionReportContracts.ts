import { z } from "zod";
import { investmentReportTranslations } from "./investmentReportContracts";

export const pensionReportRequestSchema = z.object({
  pensionId: z.string().uuid().optional(),
  scope: z.enum(["current-year", "lifetime"]),
  language: z.enum(["it", "en"]),
  action: z.enum(["save-pdf", "print"]),
}).strict();

export type PensionReportRequest = z.infer<typeof pensionReportRequestSchema>;
export interface PensionReportResult { canceled: boolean; fileName?: string }

export const pensionReportTranslations = {
  it: {
    ...investmentReportTranslations.it,
    pensionReport: "Report pensione integrativa",
    pensionReportAll: "Tutte le pensioni integrative",
    pensionReportDescription: "Crea un resoconto locale dei comparti, del capitale, del controvalore e dei rendimenti.",
    pensionReportSaved: "Report pensione salvato come {fileName}.",
    pensionReportPrintOpened: "Report pensione inviato al dialogo di stampa.",
    pensionReportError: "Non è stato possibile creare il report pensione. Nessun dato è stato modificato.",
    investmentReportTitle: "Resoconto pensione integrativa",
    investmentReportAll: "Tutte le pensioni integrative",
    investmentReportSummary: "Sintesi previdenziale",
    investmentReportPositions: "Comparti inclusi",
    investmentReportPosition: "Comparto",
    investmentReportNoData: "Nessun comparto disponibile.",
    investmentReportValueNote: "Il controvalore segue solo i dati disponibili. Valutazioni assenti, periodi futuri, rendite, benefici fiscali e costi non registrati non vengono stimati.",
  },
  en: {
    ...investmentReportTranslations.en,
    pensionReport: "Private pension report",
    pensionReportAll: "All private pensions",
    pensionReportDescription: "Create a local statement of compartments, capital, value and returns.",
    pensionReportSaved: "Pension report saved as {fileName}.",
    pensionReportPrintOpened: "Pension report sent to the print dialog.",
    pensionReportError: "The pension report could not be created. No data was changed.",
    investmentReportTitle: "Private pension statement",
    investmentReportAll: "All private pensions",
    investmentReportSummary: "Pension summary",
    investmentReportPositions: "Included compartments",
    investmentReportPosition: "Compartment",
    investmentReportNoData: "No compartment available.",
    investmentReportValueNote: "Value follows available data only. Missing valuations, future periods, annuities, tax benefits and unrecorded costs are not estimated.",
  },
} as const;
