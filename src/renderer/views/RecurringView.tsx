import { CalendarClock, ListChecks, Pencil, ReceiptText, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { FinanceCommand } from "../../domain/commands";
import { monthlyAmount } from "../../domain/finance";
import type { FinanceData, RecurringItem } from "../../domain/models";
import { recurringRateAt } from "../../domain/recurringRates";
import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { RecurringForm } from "../forms/RecurringForm";
import { useI18n } from "../i18n/I18nContext";
import { formatCurrency, formatDate, todayIso } from "../utils/format";
import { runUiAction } from "../utils/save";

export function RecurringView({ data, onSave }: { data: FinanceData; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n(); const [editing, setEditing] = useState<RecurringItem | null | undefined>();
  const [query, setQuery] = useState(""); const [kind, setKind] = useState("all"); const [month, setMonth] = useState("all");
  const rows = useMemo(() => [...data.recurringItems].filter((item) => kind === "all" || item.kind === kind).filter((item) => month === "all" || item.nextDueDate.startsWith(month)).filter((item) => item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)), [data.recurringItems, kind, month, query]);
  const active = rows.filter((item) => item.active);
  const displayedRate = (item: RecurringItem) => recurringRateAt(data, item, item.nextDueDate);
  const monthlyExpenses = active.filter((item) => (item.direction ?? "expense") === "expense").reduce((sum, item) => sum + monthlyAmount(displayedRate(item), item.frequency), 0);
  const monthlyIncome = active.filter((item) => item.direction === "income").reduce((sum, item) => sum + monthlyAmount(displayedRate(item), item.frequency), 0);
  const installments = active.filter((item) => item.kind === "installment").reduce((sum, item) => sum + (item.remainingInstallments ?? 0), 0);
  const installmentDetails = active.filter((item) => item.kind === "installment" && (item.remainingInstallments ?? 0) > 0);
  const remove = (id: string) => { if (window.confirm(t("deleteConfirm"))) runUiAction(() => onSave({ type: "deleteEntity", entity: "recurringItem", id })); };
  const months = Array.from({ length: 12 }, (_, index) => `${data.meta.activeYear}-${String(index + 1).padStart(2, "0")}`);
  const monthLabel = (value: string) => new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00Z`));
  return <><PageHeader title={t("recurring")} subtitle={t("recurringSubtitle")} actionLabel={t("newRecurring")} onAction={() => setEditing(null)} />
    <section className="view-kpi-grid"><KpiCard label={t("monthlyExpenses")} value={formatCurrency(monthlyExpenses, language)} icon={CalendarClock} tone="gold"/><KpiCard label={t("monthlyIncome")} value={formatCurrency(monthlyIncome, language)} icon={ListChecks} tone="mint"/><KpiCard label={t("installmentsLeft")} value={String(installments)} icon={ReceiptText} tone="blue" tooltip={<><strong>{t("installmentsTooltipTitle")}</strong>{installmentDetails.length > 0 ? <ul>{installmentDetails.map((item) => <li key={item.id}>{item.name}<span>{t("installmentTooltipLine", { count: item.remainingInstallments ?? 0, date: formatDate(item.nextDueDate, language) })}</span></li>)}</ul> : <small>{t("noInstallmentsDetails")}</small>}</>}/></section>
    <div className="data-toolbar filter-toolbar"><div className="search-field filter-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchByName")} /></div><div className="filter-row filter-row-two"><select aria-label={t("type")} value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">{t("allTypes")}</option>{(["subscription", "service", "installment", "investment", "rent", "other"] as const).map((item) => <option key={item} value={item}>{t(item === "investment" ? "investmentPlan" : item)}</option>)}</select><select aria-label={t("month")} value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">{t("allMonths")}</option>{months.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}</select></div></div>
    <section className="panel list-panel">{rows.length ? rows.map((item) => { const rate = displayedRate(item); const managedVehicle = item.vehicleId && item.kind === "installment"; return <div className="list-row recurrence-list" key={item.id}><div><h3>{item.name}</h3><p><span className={`pill kind-${item.direction ?? "expense"}`}>{t(item.direction ?? "expense")}</span> {t(item.kind === "investment" ? "investmentPlan" : item.kind)}{item.shared && <> · {t("sharedExpense")}</>}{managedVehicle && <> · {t("managedByVehicle")}</>}</p></div><div className="list-cell"><span>{t("amount")}</span><strong>{formatCurrency(rate, language)}</strong></div><div className="list-cell"><span>{t("recurringMonthly")}</span><strong>{formatCurrency(monthlyAmount(rate, item.frequency), language)}</strong></div><div className="list-cell"><span>{t("nextDue")}</span><strong>{formatDate(item.nextDueDate, language)}</strong></div><div className="row-actions">{!managedVehicle && <button className="text-button" onClick={() => runUiAction(() => onSave({ type: "setActive", entity: "recurringItem", id: item.id, active: !item.active, closedAt: item.active ? todayIso() : undefined }))}>{item.active ? t("close") : t("reopen")}</button>}<button className="icon-button" onClick={() => setEditing(item)} aria-label={t("edit")}><Pencil size={15}/></button><button className="icon-button danger" disabled={Boolean(managedVehicle)} title={managedVehicle ? t("vehicleInstallmentManagedHelp") : undefined} onClick={() => remove(item.id)} aria-label={t("delete")}><Trash2 size={15}/></button></div></div>; }) : <EmptyState title={t("noRecurring")} actionLabel={t("addFirst")} onAction={() => setEditing(null)} />}</section>
    {editing !== undefined && <RecurringForm data={data} value={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={onSave} />}
  </>;
}
