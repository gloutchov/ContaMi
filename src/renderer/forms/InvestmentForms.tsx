import { useState, type FormEvent } from "react";
import type { FinanceCommand } from "../../domain/commands";
import { normalizeOptionalIsin, validateOptionalIsin } from "../../domain/isin";
import { regularInvestments, selectableFinancialPositions } from "../../domain/investments";
import type { FinanceData, Investment, InvestmentEntry } from "../../domain/models";
import { Field, Modal } from "../components/Modal";
import { IsinField } from "../components/IsinField";
import { PaymentAccountField } from "../components/PaymentAccountField";
import { useI18n } from "../i18n/I18nContext";
import type { TranslationKey } from "../i18n/translations";
import { todayIso } from "../utils/format";
import { saveAndClose } from "../utils/save";

function legacyKind(code: string): Investment["kind"] {
  return (["fund", "stock", "bond", "pension", "savings", "etf"] as const).find((item) => item === code) ?? "other";
}

export function InvestmentForm({ data, value, onClose, onSave }: { data: FinanceData; value?: Investment; onClose: () => void; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const availableTypes = data.investmentTypes.filter((item) => item.code !== "pension");
  const defaultType = value?.typeId ?? availableTypes.find((item) => item.active)?.id ?? "";
  const [name, setName] = useState(value?.name ?? ""); const [provider, setProvider] = useState(value?.provider ?? ""); const [openedAt, setOpenedAt] = useState(value?.openedAt ?? todayIso()); const [notes, setNotes] = useState(value?.notes ?? "");
  const [isin, setIsin] = useState(value?.isin ?? "");
  const [typeId, setTypeId] = useState(defaultType); const [parentInvestmentId, setParentInvestmentId] = useState(value?.parentInvestmentId ?? "");
  const [periodic, setPeriodic] = useState(Boolean(value?.periodicAmount)); const [periodicAmount, setPeriodicAmount] = useState(value?.periodicAmount ? String(value.periodicAmount) : "");
  const [periodicFrequency, setPeriodicFrequency] = useState<"monthly" | "yearly">(value?.periodicFrequency ?? "monthly");
  const [periodicNextDueDate, setPeriodicNextDueDate] = useState(value?.periodicNextDueDate ?? todayIso());
  const [periodicCategoryId, setPeriodicCategoryId] = useState(value?.periodicCategoryId ?? data.categories.find((item) => item.active && item.kind !== "income")?.id ?? "");
  const [periodicPaymentMethodId, setPeriodicPaymentMethodId] = useState(value?.periodicPaymentMethodId ?? data.paymentMethods.find((item) => item.active)?.id ?? "");
  const [periodicAccountId, setPeriodicAccountId] = useState(value?.periodicAccountId ?? data.accounts.find((item) => item.active)?.id ?? "");
  const [initialContribution, setInitialContribution] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const [initialCategoryId, setInitialCategoryId] = useState(data.categories.find((item) => item.active && item.kind === "both")?.id ?? data.categories.find((item) => item.active && item.kind !== "income")?.id ?? "");
  const [initialPaymentMethodId, setInitialPaymentMethodId] = useState(data.paymentMethods.find((item) => item.active)?.id ?? "");
  const [initialAccountId, setInitialAccountId] = useState(data.accounts.find((item) => item.active)?.id ?? "");
  const hasInitialContribution = !value && Number(initialContribution) > 0;
  const valid = Boolean(name.trim() && typeId && !validateOptionalIsin(isin)
    && (!periodic || (Number(periodicAmount) > 0 && periodicCategoryId && periodicPaymentMethodId && periodicAccountId && periodicNextDueDate))
    && (!hasInitialContribution || (initialCategoryId && initialPaymentMethodId && initialAccountId)));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!valid) return;
    const selectedType = data.investmentTypes.find((item) => item.id === typeId);
    const investmentId = value?.id ?? crypto.randomUUID();
    const item: Investment = {
      ...value, id: investmentId, name, isin: normalizeOptionalIsin(isin), provider, typeId,
      kind: legacyKind(selectedType?.code ?? "other"), parentInvestmentId: parentInvestmentId || undefined,
      currency: value?.currency ?? "EUR", active: value?.active ?? true, openedAt, closedAt: value?.closedAt,
      periodicAmount: periodic ? Number(periodicAmount) : undefined, periodicFrequency: periodic ? periodicFrequency : undefined,
      periodicNextDueDate: periodic ? periodicNextDueDate : undefined, periodicCategoryId: periodic ? periodicCategoryId : undefined,
      periodicPaymentMethodId: periodic ? periodicPaymentMethodId : undefined,
      periodicAccountId: periodic ? periodicAccountId : undefined, notes,
    };
    const command: FinanceCommand = value
      ? { type: "updateInvestment", value: item }
      : hasInitialContribution
        ? {
          type: "addInvestmentWithInitialContribution",
          value: {
            investment: item,
            initialContribution: {
              id: crypto.randomUUID(), investmentId, date: openedAt, kind: "contribution",
              amount: Number(initialContribution), description: initialDescription.trim() || `${t("initialContribution")} — ${name.trim()}`,
              categoryId: initialCategoryId, paymentMethodId: initialPaymentMethodId, accountId: initialAccountId, notes: "",
            },
          },
        }
        : { type: "addInvestment", value: item };
    await saveAndClose(onSave, command, onClose);
  };
  return <Modal title={value ? t("editInvestment") : t("newInvestment")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <Field label={t("name")} wide><input required value={name} maxLength={240} onChange={(event) => setName(event.target.value)} autoFocus /></Field>
    <Field label={t("type")}><select required value={typeId} onChange={(event) => setTypeId(event.target.value)}>{availableTypes.filter((item) => item.active || item.id === typeId).map((item) => <option value={item.id} key={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field>
    <IsinField value={isin} onChange={setIsin} />
    <Field label={t("investmentGroup")}><select value={parentInvestmentId} onChange={(event) => setParentInvestmentId(event.target.value)}><option value="">—</option>{regularInvestments(data).filter((item) => item.id !== value?.id && !item.parentInvestmentId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label={t("provider")}><input value={provider} maxLength={120} onChange={(event) => setProvider(event.target.value)} /></Field>
    <Field label={t("date")}><input required type="date" value={openedAt} onChange={(event) => setOpenedAt(event.target.value)} /></Field>
    {!value && <><Field label={t("initialContribution")} hint={t("initialContributionHelp")}><input type="number" min="0" step="0.01" value={initialContribution} onChange={(event) => setInitialContribution(event.target.value)} /></Field>{hasInitialContribution && <><Field label={t("initialContributionDescription")} wide><input value={initialDescription} maxLength={240} placeholder={`${t("initialContribution")} — ${name}`} onChange={(event) => setInitialDescription(event.target.value)} /></Field><Field label={t("category")}><select required value={initialCategoryId} onChange={(event) => setInitialCategoryId(event.target.value)}>{data.categories.filter((item) => item.active && item.kind !== "income").map((item) => <option key={item.id} value={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field><Field label={t("paymentMethod")}><select required value={initialPaymentMethodId} onChange={(event) => setInitialPaymentMethodId(event.target.value)}>{data.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><PaymentAccountField data={data} paymentMethodId={initialPaymentMethodId} date={openedAt} currency="EUR" value={initialAccountId} onChange={setInitialAccountId} /></>}</>}
    <Field label={t("periodicContribution")} wide><span className="check-field"><input type="checkbox" checked={periodic} onChange={(event) => setPeriodic(event.target.checked)} />{t("periodicContributionHelp")}</span></Field>
    {periodic && <><Field label={t("amount")}><input required type="number" min="0.01" step="0.01" value={periodicAmount} onChange={(event) => setPeriodicAmount(event.target.value)} /></Field><Field label={t("frequency")}><select value={periodicFrequency} onChange={(event) => setPeriodicFrequency(event.target.value as "monthly" | "yearly")}><option value="monthly">{t("monthly")}</option><option value="yearly">{t("yearly")}</option></select></Field><Field label={t("nextDue")}><input required type="date" value={periodicNextDueDate} onChange={(event) => setPeriodicNextDueDate(event.target.value)} /></Field><Field label={t("category")}><select required value={periodicCategoryId} onChange={(event) => setPeriodicCategoryId(event.target.value)}>{data.categories.filter((item) => item.active && item.kind !== "income").map((item) => <option key={item.id} value={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field><Field label={t("paymentMethod")}><select required value={periodicPaymentMethodId} onChange={(event) => setPeriodicPaymentMethodId(event.target.value)}>{data.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><PaymentAccountField data={data} paymentMethodId={periodicPaymentMethodId} date={periodicNextDueDate} currency={value?.currency ?? "EUR"} value={periodicAccountId} onChange={setPeriodicAccountId} /></>}
    <Field label={t("notes")} wide><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}

export function InvestmentEntryForm({ data, value, initialInvestmentId, initialKind = "contribution", allowedInvestmentIds, targetLabel = "investment", onClose, onSave }: { data: FinanceData; value?: InvestmentEntry; initialInvestmentId?: string; initialKind?: InvestmentEntry["kind"]; allowedInvestmentIds?: string[]; targetLabel?: TranslationKey; onClose: () => void; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const allowed = allowedInvestmentIds ? new Set(allowedInvestmentIds) : undefined;
  const positions = selectableFinancialPositions(data).filter((item) => !allowed || allowed.has(item.id));
  const [investmentId, setInvestmentId] = useState(value?.investmentId ?? initialInvestmentId ?? positions[0]?.id ?? "");
  const linkedTransaction = value?.transactionId ? data.transactions.find((item) => item.id === value.transactionId) : undefined;
  const [date, setDate] = useState(value?.date ?? todayIso()); const [description, setDescription] = useState(value?.description ?? ""); const [amount, setAmount] = useState(value ? String(value.amount) : ""); const [notes, setNotes] = useState(value?.notes ?? ""); const [paymentMethodId, setPaymentMethodId] = useState(value?.paymentMethodId ?? "");
  const [accountId, setAccountId] = useState(value?.accountId ?? linkedTransaction?.accountId ?? data.accounts.find((item) => item.active)?.id ?? "");
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? data.categories.find((item) => item.active && item.kind === "both")?.id ?? data.categories.find((item) => item.active && item.kind !== "income")?.id ?? "");
  const [kind, setKind] = useState<InvestmentEntry["kind"]>(value?.kind ?? initialKind);
  const monetary = kind !== "valuation";
  const valid = Boolean(investmentId && description.trim() && (monetary ? Number(amount) > 0 : Number(amount) >= 0) && (!monetary || (paymentMethodId && categoryId && accountId)));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!valid) return;
    const item: InvestmentEntry = { ...value, id: value?.id ?? crypto.randomUUID(), investmentId, date, kind, amount: Number(amount), description, categoryId: monetary ? categoryId : undefined, paymentMethodId: monetary ? paymentMethodId : undefined, accountId: monetary ? accountId : undefined, transactionId: value?.transactionId, notes };
    await saveAndClose(onSave, { type: value ? "updateInvestmentEntry" : "addInvestmentEntry", value: item }, onClose);
  };
  const kinds: InvestmentEntry["kind"][] = value?.kind === "valuation" || initialKind === "valuation" ? ["valuation"] : ["contribution", "withdrawal"];
  return <Modal title={kind === "valuation" ? t("newValuation") : value ? t("editInvestmentEntry") : t("newInvestmentEntry")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <Field label={t(targetLabel)}><select required value={investmentId} onChange={(event) => setInvestmentId(event.target.value)}>{data.investments.filter((item) => (item.active || item.id === investmentId) && (positions.some((position) => position.id === item.id) || item.id === investmentId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label={t("date")}><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
    <Field label={t("type")}><select value={kind} onChange={(event) => setKind(event.target.value as InvestmentEntry["kind"])}>{kinds.map((item) => <option key={item} value={item}>{item === "withdrawal" ? t("liquidation") : t(item)}</option>)}</select></Field>
    <Field label={t("amount")}><input required type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
    <Field label={t("description")} wide><input required value={description} maxLength={240} onChange={(event) => setDescription(event.target.value)} /></Field>
    {monetary && <><Field label={t("category")}><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{data.categories.filter((item) => item.active && (item.kind === (kind === "withdrawal" ? "income" : "expense") || item.kind === "both")).map((item) => <option key={item.id} value={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field><Field label={t("paymentMethod")}><select required value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}><option value="">—</option>{data.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><PaymentAccountField data={data} paymentMethodId={paymentMethodId} date={date} currency={data.investments.find((item) => item.id === investmentId)?.currency} value={accountId} onChange={setAccountId} /></>}
    <Field label={t("notes")} wide><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}
