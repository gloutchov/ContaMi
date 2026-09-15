import { useState, type FormEvent } from "react";
import type { FinanceCommand } from "../../domain/commands";
import { normalizeOptionalIsin, validateOptionalIsin } from "../../domain/isin";
import type { InvestmentCorrectionKind } from "../../domain/investments";
import type { FinanceData, InvestmentEntry } from "../../domain/models";
import { Field, Modal } from "../components/Modal";
import { IsinField } from "../components/IsinField";
import { useI18n } from "../i18n/I18nContext";
import type { TranslationKey } from "../i18n/translations";
import { todayIso } from "../utils/format";
import { saveAndClose } from "../utils/save";

export function InvestmentCorrectionForm({ data, investmentId, value, targetLabel = "investment", onClose, onSave }: {
  data: FinanceData;
  investmentId: string;
  value?: InvestmentEntry;
  targetLabel?: TranslationKey;
  onClose: () => void;
  onSave: (command: FinanceCommand) => Promise<void>;
}) {
  const { t } = useI18n();
  const investment = data.investments.find((item) => item.id === investmentId);
  const [date, setDate] = useState(value?.date ?? todayIso());
  const [kind, setKind] = useState<InvestmentCorrectionKind>(
    value?.kind === "withdrawal_correction" ? "withdrawal_correction" : "contribution_correction",
  );
  const [amount, setAmount] = useState(value ? String(value.amount) : "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [isin, setIsin] = useState(investment?.isin ?? "");
  const valid = Boolean(investment && date && description.trim() && Number(amount) > 0 && !validateOptionalIsin(isin));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    const item: InvestmentEntry = {
      ...value,
      id: value?.id ?? crypto.randomUUID(),
      investmentId,
      date,
      kind,
      amount: Number(amount),
      description: description.trim(),
      categoryId: undefined,
      paymentMethodId: undefined,
      accountId: undefined,
      transactionId: undefined,
      notes,
    };
    await saveAndClose(onSave, {
      type: value ? "updateInvestmentCorrectionWithIsin" : "addInvestmentCorrectionWithIsin",
      value: { correction: item, isin: normalizeOptionalIsin(isin) },
    }, onClose);
  };

  return <Modal title={value ? t("editInvestmentCorrection") : t("investmentCorrection")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <div className="notice wide" role="note">{t("investmentCorrectionHelp")}</div>
    <Field label={t(targetLabel)}><input value={investment?.name ?? ""} disabled /></Field>
    <IsinField value={isin} onChange={setIsin} />
    <Field label={t("date")}><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
    <Field label={t("correctionDirection")} wide><select value={kind} onChange={(event) => setKind(event.target.value as InvestmentCorrectionKind)}><option value="contribution_correction">{t("correctionContribution")}</option><option value="withdrawal_correction">{t("correctionWithdrawal")}</option></select></Field>
    <Field label={t("amount")}><input required type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
    <Field label={t("description")} wide><input required value={description} maxLength={240} onChange={(event) => setDescription(event.target.value)} autoFocus /></Field>
    <Field label={t("notes")} wide><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}
