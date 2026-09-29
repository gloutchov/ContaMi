import { AlertTriangle, ArrowDownRight, ArrowUpRight, Building2, Droplets, FileText, Pencil, Plus, ReceiptText, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { rentalPropertyReturnSeries } from "../../domain/assetReturns";
import type { FinanceCommand } from "../../domain/commands";
import type { FinanceData, Property, PropertyEntry, PropertyWaterReading } from "../../domain/models";
import type { PropertyReportRequest, PropertyReportResult } from "../../shared/propertyReportContracts";
import { propertyHasOverdueRent } from "../../domain/rent";
import { DetailDialog } from "../components/DetailDialog";
import { EntryFilters } from "../components/EntryFilters";
import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { PropertyDetail } from "../components/PropertyDetail";
import { PropertyReportDialog } from "../components/PropertyReportDialog";
import { ReturnChart } from "../components/ReturnChart";
import { PropertyEntryForm, PropertyForm } from "../forms/PropertyForms";
import { PropertyExpenseForm } from "../forms/PropertyExpenseForms";
import { PropertyWaterReadingForm } from "../forms/PropertyWaterReadingForm";
import { useI18n } from "../i18n/I18nContext";
import { filterDatedEntries } from "../utils/detailFilters";
import { formatCurrency, formatDate, todayIso } from "../utils/format";
import { runUiAction } from "../utils/save";

export function PropertiesView({ data, onSave, onGenerateReport }: { data: FinanceData; onSave: (command: FinanceCommand) => Promise<void>; onGenerateReport: (request: PropertyReportRequest) => Promise<PropertyReportResult> }) {
  const { t, language } = useI18n();
  const [editingProperty, setEditingProperty] = useState<Property | null | undefined>();
  const [editingEntry, setEditingEntry] = useState<PropertyEntry | null | undefined>();
  const [editingPropertyExpense, setEditingPropertyExpense] = useState<PropertyEntry | null | undefined>();
  const [editingWaterReading, setEditingWaterReading] = useState<PropertyWaterReading | null | undefined>();
  const [propertyExpenseMode, setPropertyExpenseMode] = useState<"utility" | "tax">("utility");
  const [entryPropertyId, setEntryPropertyId] = useState<string>();
  const [waterReadingPropertyId, setWaterReadingPropertyId] = useState<string>();
  const [selected, setSelected] = useState<Property>();
  const [reportProperty, setReportProperty] = useState<Property>();
  const [commonExpenseSearch, setCommonExpenseSearch] = useState("");
  const [commonExpenseMonth, setCommonExpenseMonth] = useState("");
  const asOf = todayIso();
  const latestValue = (id: string) => [...data.propertyEntries].filter((item) => item.propertyId === id && item.kind === "valuation").sort((a, b) => b.date.localeCompare(a.date))[0]?.amount;
  const currentEntries = data.propertyEntries.filter((item) => item.date.startsWith(String(data.meta.activeYear))
    && !data.transactions.find((transaction) => transaction.id === item.transactionId)?.planned);
  const totalValue = data.properties.filter((item) => item.active).reduce((sum, item) => sum + (latestValue(item.id) ?? item.purchasePrice) * item.ownershipShare, 0);
  const income = currentEntries.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const costs = currentEntries.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  const rentOverdue = (property: Property) => property.active && property.usage === "rental"
    && propertyHasOverdueRent(data, property.id, todayIso());
  const commonExpenses = currentEntries.filter((item) => item.kind === "expense" && item.isCommonExpense);
  const filteredCommonExpenses = filterDatedEntries(commonExpenses, commonExpenseMonth, commonExpenseSearch);
  const remove = (entity: "property" | "propertyEntry", id: string) => { if (window.confirm(t("deleteConfirm"))) runUiAction(() => onSave({ type: "deleteEntity", entity, id })); };
  const openNewEntry = (id: string) => { setEntryPropertyId(id); setEditingEntry(null); };
  const openPropertyExpense = (mode: "utility" | "tax", propertyId?: string, value: PropertyEntry | null = null) => { setPropertyExpenseMode(mode); setEntryPropertyId(propertyId); setEditingPropertyExpense(value); };
  const openWaterReading = (propertyId?: string, value: PropertyWaterReading | null = null) => { setWaterReadingPropertyId(propertyId); setEditingWaterReading(value); };
  const editPropertyEntry = (item: PropertyEntry) => {
    if (item.detailKind?.startsWith("utility_")) openPropertyExpense("utility", item.propertyId, item);
    else if (item.detailKind?.startsWith("tax_")) openPropertyExpense("tax", item.propertyId, item);
    else { setEditingEntry(item); setEntryPropertyId(item.propertyId); }
    setSelected(undefined);
  };
  const editWaterReading = (item: PropertyWaterReading) => { openWaterReading(item.propertyId, item); setSelected(undefined); };
  const deleteWaterReading = (id: string) => { if (window.confirm(t("deleteWaterReadingConfirm"))) runUiAction(() => onSave({ type: "deleteEntity", entity: "propertyWaterReading", id })); };
  const firstActivePropertyId = data.properties.find((item) => item.active)?.id ?? "";
  return <><PageHeader title={t("properties")} subtitle={t("propertiesSubtitle")} actionLabel={t("newProperty")} onAction={() => setEditingProperty(null)} secondary={<div className="page-actions"><button className="secondary-button" onClick={() => openNewEntry(firstActivePropertyId)} disabled={!firstActivePropertyId}><Plus size={16}/>{t("newPropertyEntry")}</button><button className="secondary-button" onClick={() => openPropertyExpense("utility", firstActivePropertyId)} disabled={!firstActivePropertyId}><Zap size={16}/>{t("utilities")}</button><button className="secondary-button" onClick={() => openPropertyExpense("tax", firstActivePropertyId)} disabled={!firstActivePropertyId}><ReceiptText size={16}/>{t("propertyTaxes")}</button></div>} />
    <section className="view-kpi-grid"><KpiCard label={t("propertyValue")} value={formatCurrency(totalValue, language)} icon={Building2} tone="gold"/><KpiCard label={t("propertyIncome")} value={formatCurrency(income, language)} icon={ArrowUpRight} tone="mint"/><KpiCard label={t("propertyCosts")} value={formatCurrency(costs, language)} icon={ArrowDownRight} tone="coral"/></section>
    {data.properties.length ? <section className="entity-grid">{data.properties.map((item) => {
      const entries = currentEntries.filter((entry) => entry.propertyId === item.id); const itemIncome = entries.filter((entry) => entry.kind === "income").reduce((sum, entry) => sum + entry.amount, 0); const itemCosts = entries.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.amount, 0);
      return <article className="panel entity-card clickable" key={item.id} onClick={() => setSelected(item)}><header><div><h3>{item.name}</h3><p className="meta">{t(item.kind)} · {t(item.usage ?? "other")} · {Math.round(item.ownershipShare * 100)}%</p></div><span className="pill">{item.active ? t("active") : t("closed")}</span></header>{rentOverdue(item) && <div className="warning-line"><AlertTriangle size={15}/>{t("rentOverdue")}</div>}<div className="entity-value">{formatCurrency((latestValue(item.id) ?? item.purchasePrice) * item.ownershipShare, language)}</div><div className="mini-totals"><span>{t("income")} <strong className="amount-income">{formatCurrency(itemIncome, language)}</strong></span><span>{t("expenses")} <strong className="amount-expense">{formatCurrency(itemCosts, language)}</strong></span></div>{item.usage === "rental" && <ReturnChart compact period="annual" series={rentalPropertyReturnSeries(data, item.id, asOf)} />}<footer><span>{t("openDetails")}</span><div className="entity-actions" onClick={(event) => event.stopPropagation()}>{item.active && <button className="text-button" onClick={() => openNewEntry(item.id)}>{t("newPropertyEntry")}</button>}<button className="text-button" onClick={() => runUiAction(() => onSave({ type: "setActive", entity: "property", id: item.id, active: !item.active, closedAt: item.active ? todayIso() : undefined }))}>{item.active ? t("close") : t("reopen")}</button><button className="icon-button" aria-label={t("edit")} onClick={() => setEditingProperty(item)}><Pencil size={15}/></button><button className="icon-button danger" aria-label={t("delete")} onClick={() => remove("property", item.id)}><Trash2 size={15}/></button></div></footer></article>;
    })}</section> : <section className="panel"><EmptyState title={t("noProperties")} actionLabel={t("addFirst")} onAction={() => setEditingProperty(null)} /></section>}
    <section className="panel table-panel section-gap">
      <div className="panel-header"><h2>{t("commonExpenses")}</h2><strong>{formatCurrency(filteredCommonExpenses.reduce((sum, item) => sum + item.amount, 0), language)}</strong></div>
      {commonExpenses.length ? <>
        <EntryFilters activeYear={data.meta.activeYear} search={commonExpenseSearch} month={commonExpenseMonth} onSearchChange={setCommonExpenseSearch} onMonthChange={setCommonExpenseMonth} />
        {filteredCommonExpenses.length ? <table className="data-table"><thead><tr><th>{t("date")}</th><th>{t("property")}</th><th>{t("description")}</th><th>{t("amount")}</th></tr></thead><tbody>{filteredCommonExpenses.map((item) => <tr key={item.id}><td>{formatDate(item.date, language)}</td><td>{data.properties.find((property) => property.id === item.propertyId)?.name}</td><td>{item.description}</td><td>{formatCurrency(item.amount, language)}</td></tr>)}</tbody></table> : <p className="empty-inline">{t("noFilteredEntries")}</p>}
      </> : <p className="empty-inline">{t("noCommonExpenses")}</p>}
    </section>
    {selected && <DetailDialog title={selected.name} onClose={() => setSelected(undefined)} actions={<><button className="secondary-button" onClick={() => { setReportProperty(selected); setSelected(undefined); }}><FileText size={16}/>{t("propertyReport")}</button>{selected.usage === "residence" && <button className="secondary-button" onClick={() => { openWaterReading(selected.id); setSelected(undefined); }}><Droplets size={16}/>{t("waterReading")}</button>}<button className="secondary-button" onClick={() => { openPropertyExpense("utility", selected.id); setSelected(undefined); }}>{t("utilities")}</button><button className="secondary-button" onClick={() => { openPropertyExpense("tax", selected.id); setSelected(undefined); }}>{t("propertyTaxes")}</button><button className="secondary-button" onClick={() => { setEditingProperty(selected); setSelected(undefined); }}>{t("editProperty")}</button><button className="primary-button" onClick={() => { openNewEntry(selected.id); setSelected(undefined); }}>{t("newPropertyEntry")}</button></>}>
      <PropertyDetail data={data} property={selected} onEditEntry={editPropertyEntry} onDeleteEntry={(id) => remove("propertyEntry", id)} onEditWaterReading={editWaterReading} onDeleteWaterReading={deleteWaterReading} />
    </DetailDialog>}
    {editingProperty !== undefined && <PropertyForm value={editingProperty ?? undefined} onClose={() => setEditingProperty(undefined)} onSave={onSave} />}
    {editingEntry !== undefined && <PropertyEntryForm data={data} value={editingEntry ?? undefined} initialPropertyId={entryPropertyId} onClose={() => { setEditingEntry(undefined); setEntryPropertyId(undefined); }} onSave={onSave} />}
    {editingPropertyExpense !== undefined && <PropertyExpenseForm data={data} mode={propertyExpenseMode} value={editingPropertyExpense ?? undefined} initialPropertyId={entryPropertyId} onClose={() => { setEditingPropertyExpense(undefined); setEntryPropertyId(undefined); }} onSave={onSave} />}
    {editingWaterReading !== undefined && <PropertyWaterReadingForm data={data} value={editingWaterReading ?? undefined} initialPropertyId={waterReadingPropertyId} onClose={() => { setEditingWaterReading(undefined); setWaterReadingPropertyId(undefined); }} onSave={onSave} />}
    {reportProperty && <PropertyReportDialog property={reportProperty} onClose={() => setReportProperty(undefined)} onGenerate={onGenerateReport} />}
  </>;
}
