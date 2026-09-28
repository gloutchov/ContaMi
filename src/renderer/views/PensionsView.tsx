import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { investmentReturnSeries } from "../../domain/assetReturns";
import type { FinanceCommand } from "../../domain/commands";
import { addInvestmentMovementTotals, investmentEntryMovementKind, investmentPositionIsLoss, investmentPositionMovementTotals, investmentPositionResult, investmentPositionValue, investmentValuationTrend, isInvestmentCorrectionKind, pensionCompartments, pensionPlans, portfolioValues } from "../../domain/investments";
import type { FinanceData, Investment, InvestmentEntry } from "../../domain/models";
import { DetailDialog } from "../components/DetailDialog";
import { EntryFilters } from "../components/EntryFilters";
import { EmptyState } from "../components/EmptyState";
import { HistoryChart } from "../components/HistoryChart";
import { InvestmentCurrentValue, InvestmentMovementFacts, InvestmentMovementKpis } from "../components/InvestmentMovementSummary";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { ReturnChart } from "../components/ReturnChart";
import { InvestmentEntryForm } from "../forms/InvestmentForms";
import { InvestmentCorrectionForm } from "../forms/InvestmentCorrectionForm";
import { PensionEntityForm } from "../forms/PensionForms";
import { useI18n } from "../i18n/I18nContext";
import { filterDatedEntries } from "../utils/detailFilters";
import { formatCurrency, formatDate, todayIso } from "../utils/format";
import { investmentValueTimeline } from "../utils/investmentHistory";
import { investmentCardReturnPeriod } from "../utils/investmentReturnPresentation";
import { runUiAction } from "../utils/save";

export function PensionsView({ data, onSave }: { data: FinanceData; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const [editingPension, setEditingPension] = useState<Investment | null | undefined>();
  const [editingCompartment, setEditingCompartment] = useState<Investment | null | undefined>();
  const [initialPensionId, setInitialPensionId] = useState<string>();
  const [editingEntry, setEditingEntry] = useState<InvestmentEntry | null | undefined>();
  const [editingCorrection, setEditingCorrection] = useState<InvestmentEntry | null | undefined>();
  const [correctionCompartmentId, setCorrectionCompartmentId] = useState<string>();
  const [entryCompartmentId, setEntryCompartmentId] = useState<string>();
  const [entryKind, setEntryKind] = useState<InvestmentEntry["kind"]>("contribution");
  const [selected, setSelected] = useState<Investment>();
  const [detailSearch, setDetailSearch] = useState("");
  const [detailMonth, setDetailMonth] = useState("");
  const asOf = todayIso();
  const plans = pensionPlans(data);
  const compartments = pensionCompartments(data);
  const totalValue = portfolioValues(data).pensions;
  const movementTotals = compartments.filter((item) => item.active).reduce((totals, item) => addInvestmentMovementTotals(totals, investmentPositionMovementTotals(data, item)), { initialCapital: 0, subsequentContributions: 0, liquidations: 0, balance: 0 });
  const selectedIsPension = Boolean(selected && plans.some((item) => item.id === selected.id));
  const selectedCompartments = selectedIsPension && selected ? pensionCompartments(data, selected.id) : [];
  const selectedEntries = useMemo(() => selected ? data.investmentEntries.filter((item) => item.investmentId === selected.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [data.investmentEntries, selected]);
  const filteredSelectedEntries = useMemo(() => filterDatedEntries(selectedEntries, detailMonth, detailSearch), [selectedEntries, detailMonth, detailSearch]);
  const selectedHistory = useMemo(() => selected ? investmentValueTimeline(data, selected.id) : [], [data, selected]);
  const selectedReturns = useMemo(() => selected ? investmentReturnSeries(data, selected, asOf) : undefined, [asOf, data, selected]);
  const remove = (entity: "investment" | "investmentEntry", id: string) => { if (window.confirm(t("deleteConfirm"))) runUiAction(() => onSave({ type: "deleteEntity", entity, id })); };
  const toggleActive = (item: Investment) => runUiAction(() => onSave({ type: "setActive", entity: "investment", id: item.id, active: !item.active, closedAt: item.active ? todayIso() : undefined }));
  const openCompartment = (pensionId?: string, value: Investment | null = null) => { setInitialPensionId(pensionId); setEditingCompartment(value); };
  const openEntry = (compartmentId: string, kind: InvestmentEntry["kind"] = "contribution") => { setEntryCompartmentId(compartmentId); setEntryKind(kind); setEditingEntry(null); };
  const openCorrection = (compartmentId: string) => { setCorrectionCompartmentId(compartmentId); setEditingCorrection(null); };
  const openDetails = (item: Investment) => { setDetailSearch(""); setDetailMonth(""); setSelected(item); };

  return <>
    <PageHeader title={t("pension")} subtitle={t("pensionsSubtitle")} actionLabel={t("createPension")} onAction={() => setEditingPension(null)} secondary={<button className="secondary-button" disabled={!plans.some((item) => item.active)} onClick={() => openCompartment(plans.find((item) => item.active)?.id)}><Plus size={16}/>{t("createCompartment")}</button>} />
    <section className="view-kpi-grid investment-overview-kpi-grid"><KpiCard label={t("pensionValue")} value={formatCurrency(totalValue, language)} icon={ShieldCheck} tone="gold"/><InvestmentMovementKpis totals={movementTotals} /></section>
    {plans.length ? plans.map((plan) => {
      const children = pensionCompartments(data, plan.id);
      return <section className="pension-group" key={plan.id}>
        <article className="panel entity-card clickable pension-collector-card" onClick={() => openDetails(plan)}>
          <header><div><h3>{plan.name}</h3><p className="meta">{t("pensionCollector")}{plan.provider ? ` · ${plan.provider}` : ""}</p></div><span className="pill">{plan.active ? t("active") : t("closed")}</span></header>
          <div className="pension-collector-summary"><div className={`entity-value${investmentPositionIsLoss(data, plan) ? " value-loss" : ""}`}>{formatCurrency(investmentPositionValue(data, plan), language, plan.currency)}</div><span><small>{t("compartments")}</small><strong>{children.length}</strong></span></div>
          <InvestmentMovementFacts totals={investmentPositionMovementTotals(data, plan)} currency={plan.currency} result={investmentPositionResult(data, plan)} />
          <ReturnChart compact period={investmentCardReturnPeriod(plan.openedAt, data.meta.activeYear)} series={investmentReturnSeries(data, plan, asOf)} />
          <footer><span>{t("openDetails")}</span><div className="entity-actions" onClick={(event) => event.stopPropagation()}>{plan.active && <button className="text-button" onClick={() => openCompartment(plan.id)}>{t("createCompartment")}</button>}<button className="text-button" onClick={() => toggleActive(plan)}>{plan.active ? t("close") : t("reopen")}</button><button className="icon-button" aria-label={t("edit")} onClick={() => setEditingPension(plan)}><Pencil size={15}/></button><button className="icon-button danger" aria-label={t("delete")} onClick={() => remove("investment", plan.id)}><Trash2 size={15}/></button></div></footer>
        </article>
        <div className="section-heading pension-compartment-heading"><h2>{t("compartments")}</h2><strong>{formatCurrency(children.filter((item) => item.active).reduce((sum, item) => sum + investmentPositionValue(data, item), 0), language)}</strong></div>
        {children.length ? <div className="entity-grid">{children.map((item) => <article className="panel entity-card clickable component-card" key={item.id} onClick={() => openDetails(item)}><header><div><h3>{item.name}</h3><p className="meta">{t("compartment")}{item.provider ? ` · ${item.provider}` : ""}</p></div><span className="pill">{item.active ? t("active") : t("closed")}</span></header><InvestmentCurrentValue value={investmentPositionValue(data, item)} currency={item.currency} isLoss={investmentPositionIsLoss(data, item)} trend={investmentValuationTrend(data, item.id)} /><InvestmentMovementFacts totals={investmentPositionMovementTotals(data, item)} currency={item.currency} result={investmentPositionResult(data, item)} /><ReturnChart compact period={investmentCardReturnPeriod(item.openedAt, data.meta.activeYear)} series={investmentReturnSeries(data, item, asOf)} /><footer><span>{t("openDetails")}</span><div className="entity-actions" onClick={(event) => event.stopPropagation()}><button className="text-button" onClick={() => openCorrection(item.id)}>{t("investmentCorrection")}</button>{item.active && <button className="text-button" onClick={() => openEntry(item.id)}>{t("newInvestmentEntry")}</button>}<button className="text-button" onClick={() => toggleActive(item)}>{item.active ? t("close") : t("reopen")}</button><button className="icon-button" aria-label={t("edit")} onClick={() => openCompartment(plan.id, item)}><Pencil size={15}/></button><button className="icon-button danger" aria-label={t("delete")} onClick={() => remove("investment", item.id)}><Trash2 size={15}/></button></div></footer></article>)}</div> : <div className="panel pension-empty-compartments"><p>{t("noCompartments")}</p><button className="secondary-button" onClick={() => openCompartment(plan.id)}>{t("createCompartment")}</button></div>}
      </section>;
    }) : <section className="panel"><EmptyState title={t("noPensions")} actionLabel={t("createPension")} onAction={() => setEditingPension(null)} /></section>}

    {selected && selectedReturns && <DetailDialog title={selected.name} onClose={() => setSelected(undefined)} actions={selectedIsPension ? <><button className="secondary-button" onClick={() => { setEditingPension(selected); setSelected(undefined); }}>{t("editPension")}</button><button className="primary-button" onClick={() => { openCompartment(selected.id); setSelected(undefined); }}>{t("createCompartment")}</button></> : <><button className="secondary-button" onClick={() => { openCompartment(selected.parentInvestmentId, selected); setSelected(undefined); }}>{t("editCompartment")}</button><button className="secondary-button" onClick={() => { openEntry(selected.id, "valuation"); setSelected(undefined); }}>{t("newValuation")}</button><button className="secondary-button" onClick={() => { openCorrection(selected.id); setSelected(undefined); }}>{t("investmentCorrection")}</button><button className="primary-button" onClick={() => { openEntry(selected.id); setSelected(undefined); }}>{t("newInvestmentEntry")}</button></>}>
      <div className="detail-facts"><span><small>{t("type")}</small><strong>{t(selectedIsPension ? "pensionCollector" : "compartment")}</strong></span><span><small>{t("provider")}</small><strong>{selected.provider || "—"}</strong></span><span><small>{t("currentValue")}</small><strong>{formatCurrency(investmentPositionValue(data, selected), language)}</strong></span><span><small>{selectedIsPension ? t("compartments") : t("periodicContribution")}</small><strong>{selectedIsPension ? String(selectedCompartments.length) : selected.periodicAmount ? formatCurrency(selected.periodicAmount, language) : "—"}</strong></span></div>
      <InvestmentMovementFacts totals={investmentPositionMovementTotals(data, selected)} currency={selected.currency} result={investmentPositionResult(data, selected)} />
      <section className="detail-history-section"><h3>{t("investmentValueHistory")}</h3><HistoryChart ariaLabel={t("investmentValueHistory")} data={selectedHistory.map((item) => ({ date: item.date, investedValue: item.investedValue, closingValue: item.closingValue }))} xKey="date" xTickFormatter={(value) => formatDate(String(value), language)} series={[{ key: "investedValue", label: t("investedAmount"), color: "#4e94a7" }, { key: "closingValue", label: t("countervalue"), color: "#72d5b0" }]} format={(value) => formatCurrency(value, language)} />{!selectedHistory.length && <p className="empty-inline">{t("noInvestmentHistory")}</p>}</section>
      <section className="detail-history-section"><h3>{t("monthlyReturnHistory")}</h3><ReturnChart period="monthly" series={selectedReturns} /></section>
      {selectedIsPension ? <div className="detail-table"><table className="data-table"><thead><tr><th>{t("compartment")}</th><th>{t("status")}</th><th>{t("currentValue")}</th></tr></thead><tbody>{selectedCompartments.map((item) => <tr key={item.id}><td>{item.name}</td><td><span className="pill">{item.active ? t("active") : t("closed")}</span></td><td>{formatCurrency(investmentPositionValue(data, item), language)}</td></tr>)}</tbody></table></div> : <><EntryFilters activeYear={data.meta.activeYear} search={detailSearch} month={detailMonth} onSearchChange={setDetailSearch} onMonthChange={setDetailMonth} summary={<><span>{t("totalContributions")} <strong>{formatCurrency(filteredSelectedEntries.filter((item) => investmentEntryMovementKind(item.kind) === "contribution").reduce((sum, item) => sum + item.amount, 0), language)}</strong></span><span>{t("totalWithdrawals")} <strong>{formatCurrency(filteredSelectedEntries.filter((item) => investmentEntryMovementKind(item.kind) === "withdrawal").reduce((sum, item) => sum + item.amount, 0), language)}</strong></span></>} /><div className="detail-table"><table className="data-table"><thead><tr><th>{t("date")}</th><th>{t("type")}</th><th>{t("description")}</th><th>{t("amount")}</th><th /></tr></thead><tbody>{filteredSelectedEntries.map((item) => <tr key={item.id}><td>{formatDate(item.date, language)}</td><td><span className="pill">{item.kind === "withdrawal" ? t("liquidation") : t(item.kind)}</span></td><td>{item.description}</td><td>{formatCurrency(item.amount, language)}</td><td><div className="row-actions"><button className="icon-button" onClick={() => { if (isInvestmentCorrectionKind(item.kind)) { setEditingCorrection(item); setCorrectionCompartmentId(item.investmentId); } else { setEditingEntry(item); setEntryCompartmentId(item.investmentId); } setSelected(undefined); }} aria-label={t("edit")}><Pencil size={14}/></button><button className="icon-button danger" onClick={() => remove("investmentEntry", item.id)} aria-label={t("delete")}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{!filteredSelectedEntries.length && <p className="empty-inline">{t("noFilteredEntries")}</p>}</div></>}
    </DetailDialog>}
    {editingPension !== undefined && <PensionEntityForm data={data} mode="pension" value={editingPension ?? undefined} onClose={() => setEditingPension(undefined)} onSave={onSave} />}
    {editingCompartment !== undefined && <PensionEntityForm data={data} mode="compartment" value={editingCompartment ?? undefined} initialPensionId={initialPensionId} onClose={() => { setEditingCompartment(undefined); setInitialPensionId(undefined); }} onSave={onSave} />}
    {editingEntry !== undefined && <InvestmentEntryForm data={data} value={editingEntry ?? undefined} initialInvestmentId={entryCompartmentId} initialKind={entryKind} allowedInvestmentIds={compartments.map((item) => item.id)} targetLabel="compartment" onClose={() => { setEditingEntry(undefined); setEntryCompartmentId(undefined); }} onSave={onSave} />}
    {editingCorrection !== undefined && correctionCompartmentId && <InvestmentCorrectionForm data={data} investmentId={correctionCompartmentId} value={editingCorrection ?? undefined} targetLabel="compartment" onClose={() => { setEditingCorrection(undefined); setCorrectionCompartmentId(undefined); }} onSave={onSave} />}
  </>;
}
