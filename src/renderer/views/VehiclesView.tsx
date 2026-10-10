import { CarFront, Fuel, Gauge, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { FinanceCommand } from "../../domain/commands";
import type { FinanceData, Vehicle, VehicleEntry } from "../../domain/models";
import { confirmedVehicleEntries } from "../../domain/vehicleEntries";
import { vehicleHasRecordedHistory } from "../../domain/vehicleInstallments";
import { DetailDialog } from "../components/DetailDialog";
import { EntryFilters } from "../components/EntryFilters";
import { EmptyState } from "../components/EmptyState";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { TrendBars } from "../components/TrendBars";
import { VehicleEntryForm, VehicleForm } from "../forms/VehicleForms";
import { useI18n } from "../i18n/I18nContext";
import { filterDatedEntries } from "../utils/detailFilters";
import { formatCurrency, formatDate, todayIso } from "../utils/format";
import { runUiAction } from "../utils/save";
import { vehicleCostComparison, vehicleHistory, vehicleLifetimeSummary, vehicleUnitemizedCosts } from "../utils/vehicleHistory";

export function VehiclesView({ data, onSave }: { data: FinanceData; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null | undefined>();
  const [editingEntry, setEditingEntry] = useState<VehicleEntry | null | undefined>();
  const [entryVehicleId, setEntryVehicleId] = useState<string>();
  const [selected, setSelected] = useState<Vehicle>();
  const [detailSearch, setDetailSearch] = useState("");
  const [detailMonth, setDetailMonth] = useState("");
  const currentYear = String(data.meta.activeYear);
  const confirmedEntries = useMemo(() => confirmedVehicleEntries(data), [data]);
  const confirmedEntryIds = useMemo(() => new Set(confirmedEntries.map((item) => item.id)), [confirmedEntries]);
  const yearEntries = confirmedEntries.filter((item) => item.date.startsWith(currentYear));
  const totalCosts = yearEntries.filter((item) => item.kind !== "valuation").reduce((sum, item) => sum + item.amount, 0);
  const fuelCosts = yearEntries.filter((item) => item.kind === "fuel").reduce((sum, item) => sum + item.amount, 0);
  const distance = yearEntries.reduce((sum, item) => sum + (item.distanceKm ?? 0), 0);
  const remove = (entity: "vehicle" | "vehicleEntry", id: string) => { if (window.confirm(t("deleteConfirm"))) runUiAction(() => onSave({ type: "deleteEntity", entity, id })); };
  const entries = useMemo(() => selected ? data.vehicleEntries.filter((item) => item.vehicleId === selected.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [data.vehicleEntries, selected]);
  const filteredEntries = useMemo(() => filterDatedEntries(entries, detailMonth, detailSearch), [entries, detailMonth, detailSearch]);
  const summary = selected ? vehicleLifetimeSummary(data, selected.id) : undefined;
  const annualHistory = selected ? vehicleHistory(data, selected.id) : [];
  const comparison = useMemo(() => vehicleCostComparison(data), [data]);
  const openEntry = (id: string) => { setEntryVehicleId(id); setEditingEntry(null); };
  const openDetails = (vehicle: Vehicle) => { setDetailSearch(""); setDetailMonth(""); setSelected(vehicle); };
  return <><PageHeader title={t("vehicles")} subtitle={t("vehiclesSubtitle")} actionLabel={t("newVehicle")} onAction={() => setEditingVehicle(null)} secondary={<button className="secondary-button" onClick={() => openEntry(data.vehicles.find((item) => item.active)?.id ?? "")} disabled={!data.vehicles.some((item) => item.active)}><Plus size={16}/>{t("newVehicleEntry")}</button>} />
    <section className="view-kpi-grid"><KpiCard label={t("vehicleCosts")} value={formatCurrency(totalCosts, language)} icon={ReceiptText} tone="coral"/><KpiCard label={t("fuel")} value={formatCurrency(fuelCosts, language)} icon={Fuel} tone="gold"/><KpiCard label={t("distanceKm")} value={`${Math.round(distance).toLocaleString(language)} km`} icon={Gauge} tone="mint"/></section>
    {data.vehicles.length ? <section className="entity-grid">{data.vehicles.map((vehicle) => {
      const item = vehicleLifetimeSummary(data, vehicle.id); const odometer = item.closingOdometer; const hasHistory = vehicleHasRecordedHistory(data, vehicle.id);
      return <article className="panel entity-card clickable" key={vehicle.id} onClick={() => openDetails(vehicle)}><header><div><h3>{vehicle.name}</h3><p className="meta">{[vehicle.manufacturer, vehicle.model, t(vehicle.fuelType)].filter(Boolean).join(" · ")}</p></div><span className="pill">{vehicle.active ? t("active") : t("closed")}</span></header><small className="entity-value-label">{t("lifetimeCosts")}</small><div className="entity-value">{formatCurrency(item.totalCosts, language)}</div><div className="mini-totals"><span>{t("fuel")} <strong>{formatCurrency(item.fuelCosts, language)}</strong></span><span>{t("odometerKm")} <strong>{odometer === undefined ? "—" : `${Math.round(odometer).toLocaleString(language)} km`}</strong></span></div><footer><span>{t("openDetails")}</span><div className="entity-actions" onClick={(event) => event.stopPropagation()}>{vehicle.active && <button className="text-button" onClick={() => openEntry(vehicle.id)}>{t("newVehicleEntry")}</button>}<button className="text-button" onClick={() => runUiAction(() => onSave({ type: "setActive", entity: "vehicle", id: vehicle.id, active: !vehicle.active, closedAt: vehicle.active ? todayIso() : undefined }))}>{vehicle.active ? t("close") : t("reopen")}</button><button className="icon-button" aria-label={t("edit")} onClick={() => setEditingVehicle(vehicle)}><Pencil size={15}/></button><button className="icon-button danger" disabled={hasHistory} title={hasHistory ? t("entityInUse") : undefined} aria-label={t("delete")} onClick={() => remove("vehicle", vehicle.id)}><Trash2 size={15}/></button></div></footer></article>;
    })}</section> : <section className="panel"><EmptyState title={t("noVehicles")} actionLabel={t("addFirst")} onAction={() => setEditingVehicle(null)} icon={CarFront} /></section>}
    {selected && <DetailDialog title={selected.name} onClose={() => setSelected(undefined)} actions={<><button className="secondary-button" onClick={() => { setEditingVehicle(selected); setSelected(undefined); }}>{t("editVehicle")}</button><button className="primary-button" onClick={() => { openEntry(selected.id); setSelected(undefined); }}>{t("newVehicleEntry")}</button></>}>
      <div className="detail-facts"><span><small>{t("manufacturer")}</small><strong>{selected.manufacturer || "—"}</strong></span><span><small>{t("model")}</small><strong>{selected.model || "—"}</strong></span><span><small>{t("fuelType")}</small><strong>{t(selected.fuelType)}</strong></span><span><small>{t("purchasePrice")}</small><strong>{selected.purchasePrice === undefined ? "—" : formatCurrency(selected.purchasePrice, language)}</strong></span></div>
      <section className="vehicle-history"><h3>{t("vehicleComparison")}</h3><TrendBars variant="costComparison" points={comparison.map((item) => ({ label: item.label, value: item.costPerKm }))} format={(value) => `${formatCurrency(value, language)}/km`} /></section>
      {summary && <>
        <div className="type-totals">
          <span><small>{t("installment")}</small><strong>{formatCurrency(summary.installments, language)}</strong></span>
          <span><small>{t("insurance")}</small><strong>{formatCurrency(summary.insurance, language)}</strong></span>
          <span><small>{t("tax")}</small><strong>{formatCurrency(summary.taxes, language)}</strong></span>
          <span><small>{t("maintenance")}</small><strong>{formatCurrency(summary.maintenance + summary.repairs, language)}</strong></span>
          <span><small>{t("tires")}</small><strong>{formatCurrency(summary.tires, language)}</strong></span>
          <span><small>{t("fuel")}</small><strong>{formatCurrency(summary.fuelCosts, language)}</strong></span>
          <span><small>{t("vehicleOtherCosts")}</small><strong>{formatCurrency(vehicleUnitemizedCosts(summary), language)}</strong></span>
          <span><small>{t("vehicleTotalCosts")}</small><strong>{formatCurrency(summary.totalCosts, language)}</strong></span>
          <span><small>{t("costPerKm")}</small><strong>{summary.distanceKm > 0 ? `${formatCurrency(summary.totalCosts / summary.distanceKm, language)}/km` : "—"}</strong></span>
          <span><small>{t("distanceKm")}</small><strong>{summary.distanceKm.toLocaleString(language, { maximumFractionDigits: 3 })} km</strong></span>
          <span><small>{t("kilometersPerLiter")}</small><strong>{summary.averageKmPerLiter === undefined ? "—" : `${summary.averageKmPerLiter.toLocaleString(language, { maximumFractionDigits: 2 })} km/l`}</strong></span>
        </div>
        <p className="meta">{t("vehicleCostBasisHelp")}</p>
        {annualHistory.length > 0 && <section className="vehicle-history">
          <h3>{t("vehicleYearlyCosts")}</h3>
          <div className="detail-table"><table className="data-table"><thead><tr><th>{t("year")}</th><th>{t("vehicleCosts")}</th><th>{t("vehicleUnitemizedCosts")}</th><th>{t("distanceKm")}</th></tr></thead><tbody>
            {annualHistory.map((item) => <tr key={item.year}><td>{item.year}</td><td>{formatCurrency(item.totalCosts, language)}</td><td>{formatCurrency(vehicleUnitemizedCosts(item), language)}</td><td>{item.distanceKm.toLocaleString(language, { maximumFractionDigits: 3 })} km</td></tr>)}
          </tbody></table></div>
        </section>}
      </>}
      <EntryFilters activeYear={data.meta.activeYear} search={detailSearch} month={detailMonth} onSearchChange={setDetailSearch} onMonthChange={setDetailMonth} summary={<span>{t("confirmedFilteredTotal")} <strong>{formatCurrency(filteredEntries.filter((item) => confirmedEntryIds.has(item.id) && item.kind !== "valuation").reduce((sum, item) => sum + item.amount, 0), language)}</strong></span>} />
      <div className="detail-table"><table className="data-table"><thead><tr><th>{t("date")}</th><th>{t("type")}</th><th>{t("description")}</th><th>{t("amount")}</th><th /></tr></thead><tbody>{filteredEntries.map((item) => <tr key={item.id}><td>{formatDate(item.date, language)}</td><td><span className="pill">{t(item.kind)}</span>{!confirmedEntryIds.has(item.id) && <span className="pill">{t("planned")}</span>}</td><td>{item.description}</td><td>{formatCurrency(item.amount, language)}</td><td><div className="row-actions"><button className="icon-button" aria-label={t("edit")} onClick={() => { setEditingEntry(item); setEntryVehicleId(item.vehicleId); setSelected(undefined); }}><Pencil size={14}/></button><button className="icon-button danger" aria-label={t("delete")} onClick={() => remove("vehicleEntry", item.id)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table>{!filteredEntries.length && <p className="empty-inline">{t("noFilteredEntries")}</p>}</div>
    </DetailDialog>}
    {editingVehicle !== undefined && <VehicleForm data={data} value={editingVehicle ?? undefined} onClose={() => setEditingVehicle(undefined)} onSave={onSave} />}
    {editingEntry !== undefined && <VehicleEntryForm data={data} value={editingEntry ?? undefined} initialVehicleId={entryVehicleId} onClose={() => { setEditingEntry(undefined); setEntryVehicleId(undefined); }} onSave={onSave} />}
  </>;
}
