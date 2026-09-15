import { useId } from "react";
import { normalizeOptionalIsin, validateOptionalIsin } from "../../domain/isin";
import { useI18n } from "../i18n/I18nContext";
import { Field } from "./Modal";

export function IsinField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const helpId = useId();
  const error = validateOptionalIsin(value);
  const message = error === "format"
    ? t("isinInvalidFormat")
    : error === "checksum"
      ? t("isinInvalidChecksum")
      : t("isinOptionalHelp");

  return <Field label={t("isin")}>
    <input
      value={value}
      maxLength={32}
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      aria-label={t("isin")}
      aria-invalid={Boolean(error)}
      aria-describedby={helpId}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => onChange(normalizeOptionalIsin(value) ?? "")}
    />
    <small id={helpId} className={error ? "field-error" : undefined} role={error ? "alert" : undefined}>{message}</small>
  </Field>;
}
