import type { Investment } from "../../domain/models";
import type { PensionReportRequest, PensionReportResult } from "../../shared/pensionReportContracts";
import { useI18n } from "../i18n/I18nContext";
import { AssetReportDialog } from "./AssetReportDialog";

export function PensionReportDialog({
  pension,
  onClose,
  onGenerate,
}: {
  pension?: Investment;
  onClose: () => void;
  onGenerate: (request: PensionReportRequest) => Promise<PensionReportResult>;
}) {
  const { t } = useI18n();
  return <AssetReportDialog
    subjectName={pension?.name}
    title={t("pensionReport")}
    allName={t("pensionReportAll")}
    description={t("pensionReportDescription")}
    onClose={onClose}
    onGenerate={(choice) => onGenerate({ pensionId: pension?.id, ...choice })}
  />;
}
