import type { Investment } from "../../domain/models";
import type { InvestmentReportRequest, InvestmentReportResult } from "../../shared/investmentReportContracts";
import { useI18n } from "../i18n/I18nContext";
import { AssetReportDialog } from "./AssetReportDialog";

export function InvestmentReportDialog({
  investment,
  onClose,
  onGenerate,
}: {
  investment?: Investment;
  onClose: () => void;
  onGenerate: (request: InvestmentReportRequest) => Promise<InvestmentReportResult>;
}) {
  const { t } = useI18n();
  return <AssetReportDialog
    subjectName={investment?.name}
    title={t("investmentReport")}
    allName={t("investmentReportAll")}
    description={t("investmentReportDescription")}
    onClose={onClose}
    onGenerate={(choice) => onGenerate({ investmentId: investment?.id, ...choice })}
  />;
}
