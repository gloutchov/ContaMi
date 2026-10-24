import { useState, type FormEvent } from "react";
import type { AssetReportScope } from "../../domain/assetReport";
import { useI18n } from "../i18n/I18nContext";
import { Field, Modal } from "./Modal";

export interface AssetReportChoice {
  scope: AssetReportScope;
  language: "it" | "en";
  action: "save-pdf" | "print";
}

export function AssetReportDialog({
  subjectName,
  title,
  allName,
  description,
  onClose,
  onGenerate,
}: {
  subjectName?: string;
  title: string;
  allName: string;
  description: string;
  onClose: () => void;
  onGenerate: (choice: AssetReportChoice) => Promise<{ canceled: boolean }>;
}) {
  const { t, language } = useI18n();
  const [scope, setScope] = useState<AssetReportScope>("current-year");
  const [pending, setPending] = useState(false);

  const generate = async (action: AssetReportChoice["action"]) => {
    if (pending) return;
    setPending(true);
    try {
      const result = await onGenerate({ scope, language, action });
      if (!result.canceled) onClose();
    } finally {
      setPending(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void generate("save-pdf").catch(() => undefined);
  };

  return <Modal
    title={`${title} · ${subjectName ?? allName}`}
    onClose={onClose}
    onSubmit={submit}
    submitDisabled={pending}
    submitLabel={t("investmentReportSavePdf")}
    secondaryActionLabel={t("investmentReportPrint")}
    onSecondaryAction={() => { void generate("print").catch(() => undefined); }}
  >
    <p className="modal-intro">{description}</p>
    <Field label={t("investmentReportScope")} wide>
      <select value={scope} onChange={(event) => setScope(event.target.value as AssetReportScope)} disabled={pending}>
        <option value="current-year">{t("investmentReportCurrentYear")}</option>
        <option value="lifetime">{t("investmentReportLifetime")}</option>
      </select>
    </Field>
    {pending && <p className="modal-status" role="status">{t("investmentReportGenerating")}</p>}
  </Modal>;
}
