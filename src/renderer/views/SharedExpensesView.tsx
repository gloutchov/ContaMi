import { CheckCheck, CircleCheckBig, Clock3, Pencil, Printer, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { FinanceCommand } from "../../domain/commands";
import { confirmedSharedExpenses, summarizeSharedExpenses } from "../../domain/sharedExpenses";
import type { FinanceData, SharedExpense, Transaction } from "../../domain/models";
import { EntryFilters } from "../components/EntryFilters";
import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { SharedExpenseForm } from "../forms/SharedExpenseForm";
import { TransactionForm } from "../forms/TransactionForm";
import { useI18n } from "../i18n/I18nContext";
import { filterDatedEntries, formatDetailMonth } from "../utils/detailFilters";
import { formatCurrency, formatDate } from "../utils/format";
import { runUiAction } from "../utils/save";

export function SharedExpensesView({ data, onSave }: { data: FinanceData; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const [editing, setEditing] = useState<SharedExpense | null | undefined>();
  const [confirming, setConfirming] = useState<Transaction>();
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const confirmed = useMemo(() => confirmedSharedExpenses(data), [data]);
  const rows = useMemo(() => filterDatedEntries([...data.sharedExpenses].sort((a, b) => b.date.localeCompare(a.date)), month, search), [data.sharedExpenses, month, search]);
  const { pending, balance, total, settledCount, plannedIds, plannedTotal } = useMemo(() => summarizeSharedExpenses(data, rows), [data, rows]);
  const transactionsById = useMemo(() => new Map(data.transactions.map((item) => [item.id, item])), [data.transactions]);
  const transactionsByShared = useMemo(() => new Map(data.transactions.filter((item) => item.sharedExpenseId).map((item) => [item.sharedExpenseId!, item])), [data.transactions]);
  const monthHasPending = Boolean(month && confirmed.some((item) => item.date.startsWith(month) && !item.settled));
  const remove = (id: string) => { if (window.confirm(t("deleteConfirm"))) runUiAction(() => onSave({ type: "deleteEntity", entity: "sharedExpense", id })); };
  const settleMonth = () => { if (month && window.confirm(t("settleMonthConfirm"))) runUiAction(() => onSave({ type: "settleSharedExpenseMonth", month, settled: true })); };
  return <><PageHeader title={t("shared")} subtitle={t("sharedSubtitle")} actionLabel={t("newShared")} onAction={() => setEditing(null)} />
    <section className="view-kpi-grid"><KpiCard label={t("sharedBalance")} value={formatCurrency(balance, language)} icon={UsersRound} tone="blue" tooltip={t("sharedBalanceHelp")}/><KpiCard label={t("filteredTotal")} value={formatCurrency(total, language)} icon={Clock3} tone="gold" detail={t("sharedPlannedTotal", { amount: formatCurrency(plannedTotal, language) })} tooltip={t("sharedFilteredTotalHelp")}/><KpiCard label={t("settledExpenses")} value={String(settledCount)} icon={CircleCheckBig} tone="mint" tooltip={t("sharedSettledHelp")}/></section>
    <EntryFilters activeYear={data.meta.activeYear} search={search} month={month} onSearchChange={setSearch} onMonthChange={setMonth} />
    <div className="data-toolbar filter-toolbar"><div className="filter-row filter-row-two"><button className="secondary-button" disabled={!monthHasPending} onClick={settleMonth}><CheckCheck size={16}/>{t("settleWholeMonth")}</button><button className="secondary-button" disabled={!month || !pending.length} onClick={() => window.print()}><Printer size={16}/>{t("printPending")}</button></div></div>
    <section className="panel table-panel scroll-table">{rows.length ? <table className="data-table"><thead><tr><th>{t("date")}</th><th>{t("description")}</th><th>{t("paidBy")}</th><th>{t("yourShare")}</th><th>{t("partnerShare")}</th><th>{t("status")}</th><th /></tr></thead><tbody>{rows.map((item) => {
      const planned = plannedIds.has(item.id);
      const transaction = (item.transactionId ? transactionsById.get(item.transactionId) : undefined) ?? transactionsByShared.get(item.id);
      return <tr key={item.id}>
        <td>{formatDate(item.date, language)}</td><td>{item.description}</td><td>{item.paidBy === "owner" ? t("you") : t("partner")}</td>
        <td>{formatCurrency(item.ownerShare, language)}</td><td>{formatCurrency(item.partnerShare, language)}</td>
        <td><span className={`pill ${planned ? "planned-badge" : item.settled ? "kind-income" : "kind-expense"}`}>{t(planned ? "planned" : item.settled ? "settled" : "pending")}</span></td>
        <td><div className="row-actions">
          {planned
            ? <button className="text-button" disabled={!transaction} onClick={() => setConfirming(transaction)}>{t("confirm")}</button>
            : <button className="text-button" onClick={() => runUiAction(() => onSave({ type: "setSharedExpenseSettled", id: item.id, settled: !item.settled }))}>{item.settled ? t("markPending") : t("markSettled")}</button>}
          <button className="icon-button" onClick={() => setEditing(item)} aria-label={t("edit")}><Pencil size={15}/></button>
          <button className="icon-button danger" onClick={() => remove(item.id)} aria-label={t("delete")}><Trash2 size={15}/></button>
        </div></td>
      </tr>;
    })}</tbody></table> : <EmptyState title={t(data.sharedExpenses.length ? "noFilteredEntries" : "noShared")} actionLabel={t("addFirst")} onAction={() => setEditing(null)} />}</section>
    <section className="print-report"><h1>ContaMì — {t("pendingExpenses")}</h1><h2>{month ? formatDetailMonth(month, language) : ""}</h2><table><thead><tr><th>{t("date")}</th><th>{t("description")}</th><th>{t("paidBy")}</th><th>{t("amount")}</th><th>{t("partnerShare")}</th></tr></thead><tbody>{pending.map((item) => <tr key={item.id}><td>{formatDate(item.date, language)}</td><td>{item.description}</td><td>{item.paidBy === "owner" ? t("you") : t("partner")}</td><td>{formatCurrency(item.amount, language)}</td><td>{formatCurrency(item.partnerShare, language)}</td></tr>)}</tbody></table><p>{t("sharedBalance")}: <strong>{formatCurrency(balance, language)}</strong></p></section>
    {editing !== undefined && <SharedExpenseForm data={data} value={editing ?? undefined} onClose={() => setEditing(undefined)} onSave={onSave} />}
    {confirming && <TransactionForm data={data} value={confirming} confirming onClose={() => setConfirming(undefined)} onSave={onSave} />}
  </>;
}
