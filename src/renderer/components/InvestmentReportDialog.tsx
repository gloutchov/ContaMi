import { useState, type FormEvent } from "react";
import type { Investment } from "../../domain/models";
import type { InvestmentReportRequest, InvestmentReportResult } from "../../shared/investmentReportContracts";
import { useI18n } from "../i18n/I18nContext";
import { Field, Modal } from "./Modal";

export function InvestmentReportDialog({
  investment,
  onClose,
  onGenerate,
}: {
  investment?: Investment;
  onClose: () => void;
  onGenerate: (request: InvestmentReportRequest) => Promise<InvestmentReportResult>;
}) {
  const { t, language } = useI18n();
  const [scope, setScope] = useState<InvestmentReportRequest["scope"]>("current-year");
  const [pending, setPending] = useState(false);

  const generate = async (action: InvestmentReportRequest["action"]) => {
    if (pending) return;
    setPending(true);
    let result: InvestmentReportResult;
    try {
      result = await onGenerate({ investmentId: investment?.id, scope, language, action });
    } finally {
      setPending(false);
    }
    if (!result.canceled) onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void generate("save-pdf").catch(() => undefined);
  };

  return <Modal
    title={`${t("investmentReport")} · ${investment?.name ?? t("investmentReportAll")}`}
    onClose={onClose}
    onSubmit={submit}
    submitDisabled={pending}
    submitLabel={t("investmentReportSavePdf")}
    secondaryActionLabel={t("investmentReportPrint")}
    onSecondaryAction={() => { void generate("print").catch(() => undefined); }}
  >
    <p className="modal-intro">{t("investmentReportDescription")}</p>
    <Field label={t("investmentReportScope")} wide>
      <select value={scope} onChange={(event) => setScope(event.target.value as InvestmentReportRequest["scope"])} disabled={pending}>
        <option value="current-year">{t("investmentReportCurrentYear")}</option>
        <option value="lifetime">{t("investmentReportLifetime")}</option>
      </select>
    </Field>
    {pending && <p className="modal-status" role="status">{t("investmentReportGenerating")}</p>}
  </Modal>;
}
