import { useState, type FormEvent } from "react";
import type { FinanceCommand } from "../../domain/commands";
import type { FinanceData, PropertyWaterReading } from "../../domain/models";
import { Field, Modal } from "../components/Modal";
import { useI18n } from "../i18n/I18nContext";
import { todayIso } from "../utils/format";
import { saveAndClose } from "../utils/save";

export function PropertyWaterReadingForm({ data, value, initialPropertyId, onClose, onSave }: {
  data: FinanceData;
  value?: PropertyWaterReading;
  initialPropertyId?: string;
  onClose: () => void;
  onSave: (command: FinanceCommand) => Promise<void>;
}) {
  const { t } = useI18n();
  const today = todayIso();
  const residenceProperties = data.properties.filter((item) => item.usage === "residence" && (item.active || item.id === value?.propertyId));
  const [propertyId, setPropertyId] = useState(value?.propertyId ?? initialPropertyId ?? residenceProperties[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(value?.periodStart ?? `${today.slice(0, 7)}-01`);
  const [periodEnd, setPeriodEnd] = useState(value?.periodEnd ?? today);
  const [readingDate, setReadingDate] = useState(value?.readingDate ?? today);
  const [measurementMode, setMeasurementMode] = useState<PropertyWaterReading["measurementMode"]>(value?.measurementMode ?? "period_consumption");
  const [coldCubicMeters, setColdCubicMeters] = useState(value ? String(value.coldCubicMeters) : "");
  const [hotCubicMeters, setHotCubicMeters] = useState(value ? String(value.hotCubicMeters) : "");
  const [totalCost, setTotalCost] = useState(value ? String(value.totalCost) : "");
  const [splitCost, setSplitCost] = useState(value?.coldCost !== undefined && value?.hotCost !== undefined);
  const [coldCost, setColdCost] = useState(value?.coldCost !== undefined ? String(value.coldCost) : "");
  const [hotCost, setHotCost] = useState(value?.hotCost !== undefined ? String(value.hotCost) : "");
  const [coldStartsNewCycle, setColdStartsNewCycle] = useState(value?.coldStartsNewCycle ?? false);
  const [hotStartsNewCycle, setHotStartsNewCycle] = useState(value?.hotStartsNewCycle ?? false);
  const [notes, setNotes] = useState(value?.notes ?? "");
  const sameYear = periodStart.slice(0, 4) === periodEnd.slice(0, 4);
  const splitMatches = !splitCost || Math.abs(Number(coldCost || 0) + Number(hotCost || 0) - Number(totalCost || 0)) <= 0.01;
  const valid = Boolean(propertyId && periodStart && periodEnd && readingDate
    && periodStart <= periodEnd && sameYear
    && coldCubicMeters !== "" && hotCubicMeters !== "" && totalCost !== ""
    && Number(coldCubicMeters) >= 0 && Number(hotCubicMeters) >= 0 && Number(totalCost) >= 0
    && (!splitCost || (coldCost !== "" && hotCost !== "" && Number(coldCost) >= 0 && Number(hotCost) >= 0 && splitMatches)));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid) return;
    const reading: PropertyWaterReading = {
      ...value,
      id: value?.id ?? crypto.randomUUID(),
      propertyId,
      periodStart,
      periodEnd,
      readingDate,
      measurementMode,
      coldCubicMeters: Number(coldCubicMeters),
      hotCubicMeters: Number(hotCubicMeters),
      totalCost: Number(totalCost),
      coldCost: splitCost ? Number(coldCost) : undefined,
      hotCost: splitCost ? Number(hotCost) : undefined,
      coldStartsNewCycle: measurementMode === "meter_reading" && coldStartsNewCycle,
      hotStartsNewCycle: measurementMode === "meter_reading" && hotStartsNewCycle,
      notes,
    };
    await saveAndClose(onSave, { type: value ? "updatePropertyWaterReading" : "addPropertyWaterReading", value: reading }, onClose);
  };

  return <Modal title={t(value ? "editWaterReading" : "newWaterReading")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <p className="modal-intro">{t("waterReadingStatisticalHelp")}</p>
    <Field label={t("property")}><select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>{residenceProperties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label={t("waterMeasurementMode")}><select value={measurementMode} onChange={(event) => setMeasurementMode(event.target.value as PropertyWaterReading["measurementMode"])}><option value="period_consumption">{t("waterPeriodConsumption")}</option><option value="meter_reading">{t("waterMeterReading")}</option></select></Field>
    <Field label={t("waterReadingPeriodStart")}><input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></Field>
    <Field label={t("waterReadingPeriodEnd")} hint={!sameYear ? t("waterPeriodSameYear") : undefined}><input required type="date" value={periodEnd} min={periodStart} aria-invalid={periodStart > periodEnd || !sameYear} onChange={(event) => setPeriodEnd(event.target.value)} /></Field>
    <Field label={t("waterReadingDate")}><input required type="date" value={readingDate} onChange={(event) => setReadingDate(event.target.value)} /></Field>
    <span />
    <Field label={t("coldWaterCubicMeters")} hint={measurementMode === "meter_reading" ? t("waterMeterReadingHelp") : undefined}><input required type="number" min="0" step="0.001" value={coldCubicMeters} onChange={(event) => setColdCubicMeters(event.target.value)} /></Field>
    <Field label={t("hotWaterCubicMeters")} hint={measurementMode === "meter_reading" ? t("waterMeterReadingHelp") : undefined}><input required type="number" min="0" step="0.001" value={hotCubicMeters} onChange={(event) => setHotCubicMeters(event.target.value)} /></Field>
    {measurementMode === "meter_reading" && <><Field label={t("coldStartsNewMeterCycle")}><span className="check-field"><input type="checkbox" checked={coldStartsNewCycle} onChange={(event) => setColdStartsNewCycle(event.target.checked)} />{t("newMeterCycleHelp")}</span></Field><Field label={t("hotStartsNewMeterCycle")}><span className="check-field"><input type="checkbox" checked={hotStartsNewCycle} onChange={(event) => setHotStartsNewCycle(event.target.checked)} />{t("newMeterCycleHelp")}</span></Field></>}
    <Field label={t("totalWaterCost")}><input required type="number" min="0" step="0.01" value={totalCost} onChange={(event) => setTotalCost(event.target.value)} /></Field>
    <Field label={t("splitWaterCost")}><span className="check-field"><input type="checkbox" checked={splitCost} onChange={(event) => setSplitCost(event.target.checked)} />{t("splitWaterCostHelp")}</span></Field>
    {splitCost && <><Field label={t("coldWaterCost")}><input required type="number" min="0" step="0.01" value={coldCost} onChange={(event) => setColdCost(event.target.value)} /></Field><Field label={t("hotWaterCost")} hint={!splitMatches ? t("waterCostSplitMismatch") : undefined}><input required type="number" min="0" step="0.01" aria-invalid={!splitMatches} value={hotCost} onChange={(event) => setHotCost(event.target.value)} /></Field></>}
    <Field label={t("notes")} wide><textarea value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}
