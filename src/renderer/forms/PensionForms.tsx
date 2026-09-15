import { useState, type FormEvent } from "react";
import type { FinanceCommand } from "../../domain/commands";
import { normalizeOptionalIsin, validateOptionalIsin } from "../../domain/isin";
import { pensionPlans } from "../../domain/investments";
import type { FinanceData, Investment } from "../../domain/models";
import { Field, Modal } from "../components/Modal";
import { IsinField } from "../components/IsinField";
import { PaymentAccountField } from "../components/PaymentAccountField";
import { useI18n } from "../i18n/I18nContext";
import { todayIso } from "../utils/format";
import { saveAndClose } from "../utils/save";

export function PensionEntityForm({ data, mode, value, initialPensionId, onClose, onSave }: {
  data: FinanceData;
  mode: "pension" | "compartment";
  value?: Investment;
  initialPensionId?: string;
  onClose: () => void;
  onSave: (command: FinanceCommand) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const pensionTypeId = data.investmentTypes.find((item) => item.code === "pension")?.id;
  const plans = pensionPlans(data).filter((item) => item.active || item.id === value?.parentInvestmentId);
  const initialPlan = plans.find((item) => item.id === (value?.parentInvestmentId ?? initialPensionId)) ?? plans[0];
  const [name, setName] = useState(value?.name ?? "");
  const [provider, setProvider] = useState(value?.provider ?? (mode === "compartment" ? initialPlan?.provider ?? "" : ""));
  const [openedAt, setOpenedAt] = useState(value?.openedAt ?? (mode === "compartment" ? initialPlan?.openedAt ?? todayIso() : todayIso()));
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [isin, setIsin] = useState(value?.isin ?? "");
  const [parentInvestmentId, setParentInvestmentId] = useState(value?.parentInvestmentId ?? initialPensionId ?? plans[0]?.id ?? "");
  const [periodic, setPeriodic] = useState(Boolean(value?.periodicAmount));
  const [periodicAmount, setPeriodicAmount] = useState(value?.periodicAmount ? String(value.periodicAmount) : "");
  const [periodicFrequency, setPeriodicFrequency] = useState<"monthly" | "yearly">(value?.periodicFrequency ?? "monthly");
  const [periodicNextDueDate, setPeriodicNextDueDate] = useState(value?.periodicNextDueDate ?? todayIso());
  const [periodicCategoryId, setPeriodicCategoryId] = useState(value?.periodicCategoryId ?? data.categories.find((item) => item.active && item.kind !== "income")?.id ?? "");
  const [periodicPaymentMethodId, setPeriodicPaymentMethodId] = useState(value?.periodicPaymentMethodId ?? data.paymentMethods.find((item) => item.active)?.id ?? "");
  const [periodicAccountId, setPeriodicAccountId] = useState(value?.periodicAccountId ?? data.accounts.find((item) => item.active)?.id ?? "");
  const validPeriodic = !periodic || (Number(periodicAmount) > 0 && periodicCategoryId && periodicPaymentMethodId && periodicAccountId && periodicNextDueDate);
  const valid = Boolean(name.trim() && pensionTypeId && (mode === "pension" || parentInvestmentId) && validPeriodic
    && (mode === "pension" || !validateOptionalIsin(isin)));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || !pensionTypeId) return;
    const item: Investment = {
      ...value,
      id: value?.id ?? crypto.randomUUID(),
      name,
      isin: mode === "compartment" ? normalizeOptionalIsin(isin) : value?.isin,
      kind: "pension",
      typeId: pensionTypeId,
      parentInvestmentId: mode === "compartment" ? parentInvestmentId : undefined,
      provider,
      currency: value?.currency ?? "EUR",
      active: value?.active ?? true,
      openedAt,
      closedAt: value?.closedAt,
      periodicAmount: mode === "compartment" && periodic ? Number(periodicAmount) : value?.periodicAmount,
      periodicFrequency: mode === "compartment" && periodic ? periodicFrequency : value?.periodicFrequency,
      periodicNextDueDate: mode === "compartment" && periodic ? periodicNextDueDate : value?.periodicNextDueDate,
      periodicCategoryId: mode === "compartment" && periodic ? periodicCategoryId : value?.periodicCategoryId,
      periodicPaymentMethodId: mode === "compartment" && periodic ? periodicPaymentMethodId : value?.periodicPaymentMethodId,
      periodicAccountId: mode === "compartment" && periodic ? periodicAccountId : value?.periodicAccountId,
      notes,
    };
    if (mode === "compartment" && !periodic) {
      item.periodicAmount = undefined;
      item.periodicFrequency = undefined;
      item.periodicNextDueDate = undefined;
      item.periodicCategoryId = undefined;
      item.periodicPaymentMethodId = undefined;
      item.periodicAccountId = undefined;
    }
    await saveAndClose(onSave, { type: value ? "updateInvestment" : "addInvestment", value: item }, onClose);
  };

  return <Modal title={value ? t(mode === "pension" ? "editPension" : "editCompartment") : t(mode === "pension" ? "createPension" : "createCompartment")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <Field label={t("name")} wide><input required value={name} maxLength={240} onChange={(event) => setName(event.target.value)} autoFocus /></Field>
    {mode === "compartment" && <Field label={t("pension")}><select required value={parentInvestmentId} onChange={(event) => setParentInvestmentId(event.target.value)}><option value="">—</option>{plans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
    {mode === "compartment" && <IsinField value={isin} onChange={setIsin} />}
    <Field label={t("provider")}><input value={provider} maxLength={120} onChange={(event) => setProvider(event.target.value)} /></Field>
    <Field label={t("date")}><input required type="date" value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} /></Field>
    {mode === "pension" && <Field label={t("pensionCollector")} wide><small>{t("pensionCollectorHelp")}</small></Field>}
    {mode === "compartment" && <><Field label={t("periodicContribution")} wide><span className="check-field"><input type="checkbox" checked={periodic} onChange={(event) => setPeriodic(event.target.checked)} />{t("periodicContributionHelp")}</span></Field>
      {periodic && <><Field label={t("amount")}><input required type="number" min="0.01" step="0.01" value={periodicAmount} onChange={(event) => setPeriodicAmount(event.target.value)} /></Field><Field label={t("frequency")}><select value={periodicFrequency} onChange={(event) => setPeriodicFrequency(event.target.value as "monthly" | "yearly")}><option value="monthly">{t("monthly")}</option><option value="yearly">{t("yearly")}</option></select></Field><Field label={t("nextDue")}><input required type="date" value={periodicNextDueDate} onChange={(event) => setPeriodicNextDueDate(event.target.value)} /></Field><Field label={t("category")}><select required value={periodicCategoryId} onChange={(event) => setPeriodicCategoryId(event.target.value)}>{data.categories.filter((item) => item.active && item.kind !== "income").map((item) => <option key={item.id} value={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field><Field label={t("paymentMethod")}><select required value={periodicPaymentMethodId} onChange={(event) => setPeriodicPaymentMethodId(event.target.value)}>{data.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><PaymentAccountField data={data} paymentMethodId={periodicPaymentMethodId} date={periodicNextDueDate} currency={value?.currency ?? "EUR"} value={periodicAccountId} onChange={setPeriodicAccountId} /></>}
    </>}
    <Field label={t("notes")} wide><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}
