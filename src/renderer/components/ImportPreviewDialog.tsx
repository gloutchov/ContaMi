import type { FormEvent } from "react";
import type { ImportErrorCode, ImportPreview } from "../../domain/imports";
import { useI18n } from "../i18n/I18nContext";
import type { TranslationKey } from "../i18n/translations";
import { Modal } from "./Modal";

const errorKeys: Record<ImportErrorCode, TranslationKey> = {
  ACTIVE_CONTENT: "importErrorActiveContent",
  AMBIGUOUS_REFERENCE: "importErrorAmbiguousReference",
  DUPLICATE_KEY: "importErrorDuplicateKey",
  FORMULA_NOT_ALLOWED: "importErrorFormula",
  INVALID_DATE: "importErrorDate",
  INVALID_ENUM: "importErrorEnum",
  INVALID_HEADERS: "importErrorHeaders",
  INVALID_ISIN: "importErrorIsin",
  INVALID_NUMBER: "importErrorNumber",
  INVALID_REFERENCE: "importErrorReference",
  INVALID_ROW: "importErrorRow",
  INVALID_TEMPLATE: "importErrorTemplate",
  MISSING_REFERENCE: "importErrorMissingReference",
  REQUIRED_VALUE: "importErrorRequired",
  ROW_LIMIT: "importErrorLimit",
  TEXT_TOO_LONG: "importErrorText",
  UNSUPPORTED_TEMPLATE_VERSION: "importErrorVersion",
};

export function ImportPreviewDialog({ preview, onClose, onConfirm }: {
  preview: ImportPreview;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t, language } = useI18n();
  const amount = new Intl.NumberFormat(language === "it" ? "it-IT" : "en-US", { style: "currency", currency: "EUR" }).format(preview.amountTotal);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onConfirm();
  };
  return <Modal
    title={t("importPreviewTitle")}
    onClose={onClose}
    onSubmit={submit}
    submitLabel={t("importConfirm")}
    submitDisabled={!preview.previewId || preview.actions.create + preview.actions.update === 0}
  >
    <div className="import-file-summary">
      <strong>{preview.fileName}</strong>
      <span>{preview.templateType ? t(`templateType_${preview.templateType}`) : ""}</span>
    </div>
    <div className="import-stats" aria-label={t("importPreviewStats")}>
      <div><strong>{preview.validRows}</strong><span>{t("importValidRows")}</span></div>
      <div><strong>{preview.rejectedRows}</strong><span>{t("importRejectedRows")}</span></div>
      <div><strong>{preview.conflictRows}</strong><span>{t("importConflictRows")}</span></div>
      <div><strong>{amount}</strong><span>{t("importAmount")}</span></div>
    </div>
    <p className="import-actions-summary">{t("importActionsSummary", {
      create: preview.actions.create,
      update: preview.actions.update,
      skip: preview.actions.skip,
    })}</p>
    {preview.errors.length > 0
      ? <section className="import-errors" aria-labelledby="import-errors-title">
        <h3 id="import-errors-title">{t("importErrors")}</h3>
        <ul>{preview.errors.map((error, index) => <li key={`${error.row}-${error.column}-${index}`}>
          {t("importErrorLine", { row: error.row, column: error.column, message: t(errorKeys[error.code]) })}
        </li>)}</ul>
        {preview.errorsTruncated && <p>{t("importErrorsTruncated")}</p>}
      </section>
      : <p className="import-ready">{t("importReady")}</p>}
  </Modal>;
}
