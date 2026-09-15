import { useMemo, useState, type FormEvent } from "react";
import type { FinanceCommand } from "../../domain/commands";
import type { FinanceData, RecurringItem, Vehicle, VehicleEntry } from "../../domain/models";
import { calculateFuelLiters, calculateVehicleDistance, previousVehicleOdometer } from "../../domain/vehicleEntries";
import { vehicleInstallmentPlan } from "../../domain/vehicleInstallments";
import { Field, Modal } from "../components/Modal";
import { PaymentAccountField } from "../components/PaymentAccountField";
import { RecurringRateChangesEditor } from "../components/RecurringRateChangesEditor";
import { useI18n } from "../i18n/I18nContext";
import { todayIso } from "../utils/format";
import { saveAndClose } from "../utils/save";

const fuelTypes: Vehicle["fuelType"][] = ["petrol", "diesel", "lpg", "methane", "hybrid", "electric", "other"];
const entryKinds: VehicleEntry["kind"][] = ["fuel", "installment", "tax", "insurance", "tires", "maintenance", "repair", "valuation", "other"];
const entryFuelTypes = [
  { value: "petrol", label: "petrol" },
  { value: "diesel", label: "diesel" },
  { value: "lpg", label: "lpg" },
  { value: "methane", label: "methane" },
  { value: "electric", label: "fuelElectricity" },
  { value: "hydrogen", label: "hydrogen" },
] as const;

function numberFromInput(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function VehicleForm({ data, value, onClose, onSave }: { data: FinanceData; value?: Vehicle; onClose: () => void; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const existingInstallment = value ? vehicleInstallmentPlan(data, value.id) : undefined;
  const [vehicleId] = useState(value?.id ?? crypto.randomUUID());
  const [installmentId] = useState(existingInstallment?.id ?? crypto.randomUUID());
  const [name, setName] = useState(value?.name ?? "");
  const [manufacturer, setManufacturer] = useState(value?.manufacturer ?? "");
  const [model, setModel] = useState(value?.model ?? "");
  const [fuelType, setFuelType] = useState<Vehicle["fuelType"]>(value?.fuelType ?? "petrol");
  const [purchaseDate, setPurchaseDate] = useState(value?.purchaseDate ?? "");
  const [disposalDate, setDisposalDate] = useState(value?.disposalDate ?? "");
  const [purchasePrice, setPurchasePrice] = useState(value?.purchasePrice !== undefined ? String(value.purchasePrice) : "");
  const [salePrice, setSalePrice] = useState(value?.salePrice !== undefined ? String(value.salePrice) : "");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const [financing, setFinancing] = useState(Boolean(existingInstallment
    && existingInstallment.remainingInstallments !== 0
    && (!existingInstallment.endDate || existingInstallment.endDate >= todayIso())));
  const [installmentAmount, setInstallmentAmount] = useState(existingInstallment ? String(existingInstallment.amount) : "");
  const [installmentFrequency, setInstallmentFrequency] = useState<RecurringItem["frequency"]>(existingInstallment?.frequency ?? "monthly");
  const [installmentNextDueDate, setInstallmentNextDueDate] = useState(existingInstallment?.nextDueDate ?? purchaseDate ?? todayIso());
  const [installmentEndDate, setInstallmentEndDate] = useState(existingInstallment?.endDate ?? "");
  const [remainingInstallments, setRemainingInstallments] = useState(existingInstallment?.remainingInstallments !== undefined ? String(existingInstallment.remainingInstallments) : "");
  const [installmentCategoryId, setInstallmentCategoryId] = useState(existingInstallment?.categoryId
    ?? data.categories.find((item) => item.active && item.kind !== "income" && (item.nameIt.toLocaleLowerCase().includes("trasport") || item.nameEn.toLocaleLowerCase().includes("transport")))?.id
    ?? data.categories.find((item) => item.active && item.kind !== "income")?.id
    ?? "");
  const [installmentPaymentMethodId, setInstallmentPaymentMethodId] = useState(existingInstallment?.paymentMethodId ?? data.paymentMethods.find((item) => item.active)?.id ?? "");
  const [installmentAccountId, setInstallmentAccountId] = useState(existingInstallment?.accountId ?? "");
  const remainingCount = remainingInstallments === "" ? undefined : Number(remainingInstallments);
  const financingValid = !financing || Boolean(Number(installmentAmount) > 0
    && installmentNextDueDate
    && installmentCategoryId
    && installmentPaymentMethodId
    && installmentAccountId
    && (remainingCount !== undefined || installmentEndDate)
    && (remainingCount === undefined || (Number.isInteger(remainingCount) && remainingCount > 0 && remainingCount <= 10_000))
    && (!installmentEndDate || installmentEndDate >= installmentNextDueDate));
  const valid = Boolean(name.trim() && financingValid);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!valid) return;
    const vehicle: Vehicle = {
      ...value, id: vehicleId, name: name.trim(), manufacturer: manufacturer.trim(), model: model.trim(), fuelType,
      purchaseDate: purchaseDate || undefined, disposalDate: disposalDate || undefined,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined, salePrice: salePrice ? Number(salePrice) : undefined,
      active: value?.active ?? true, notes,
    };
    const installment: RecurringItem | undefined = financing ? {
      ...existingInstallment,
      id: installmentId,
      name: vehicle.name,
      kind: "installment",
      direction: "expense",
      amount: Number(installmentAmount),
      frequency: installmentFrequency,
      categoryId: installmentCategoryId,
      paymentMethodId: installmentPaymentMethodId,
      accountId: installmentAccountId,
      vehicleId: vehicle.id,
      nextDueDate: installmentNextDueDate,
      endDate: installmentEndDate || undefined,
      remainingInstallments: remainingCount,
      active: vehicle.active,
      closedAt: vehicle.active ? undefined : existingInstallment?.closedAt,
      notes: existingInstallment?.notes ?? "",
    } : undefined;
    await saveAndClose(onSave, {
      type: value ? "updateVehicleWithInstallment" : "addVehicleWithInstallment",
      value: { vehicle, installment },
    }, onClose);
  };
  return <Modal title={value ? t("editVehicle") : t("newVehicle")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <Field label={t("name")} wide><input required maxLength={240} autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label={t("manufacturer")}><input maxLength={120} value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></Field>
    <Field label={t("model")}><input maxLength={120} value={model} onChange={(event) => setModel(event.target.value)} /></Field>
    <Field label={t("fuelType")}><select value={fuelType} onChange={(event) => setFuelType(event.target.value as Vehicle["fuelType"])}>{fuelTypes.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field>
    <Field label={t("date")}><input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} /></Field>
    <Field label={t("purchasePrice")}><input type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} /></Field>
    <Field label={t("disposalDate")}><input type="date" value={disposalDate} onChange={(event) => setDisposalDate(event.target.value)} /></Field>
    <Field label={t("salePrice")}><input type="number" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></Field>
    <section className="vehicle-financing-section" aria-labelledby={`vehicle-financing-${vehicleId}`}>
      <div className="vehicle-financing-heading"><div><h3 id={`vehicle-financing-${vehicleId}`}>{t("vehicleFinancing")}</h3><p>{t("vehicleFinancingHelp")}</p></div><label className="check-field"><input type="checkbox" checked={financing} onChange={(event) => setFinancing(event.target.checked)} />{t("vehicleFinancingEnabled")}</label></div>
      {financing && <div className="vehicle-financing-grid">
        <Field label={existingInstallment ? t("baseRate") : t("installmentAmount")} hint={existingInstallment ? t("vehicleRateChangeHelp") : undefined}><input required disabled={Boolean(existingInstallment)} type="number" min="0.01" step="0.01" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} /></Field>
        <Field label={t("frequency")}><select value={installmentFrequency} onChange={(event) => setInstallmentFrequency(event.target.value as RecurringItem["frequency"])}>{(["weekly", "monthly", "quarterly", "yearly"] as const).map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field>
        <Field label={t("nextDue")}><input required type="date" value={installmentNextDueDate} onChange={(event) => setInstallmentNextDueDate(event.target.value)} /></Field>
        <Field label={t("installmentsLeft")} hint={t("vehicleInstallmentLimitHelp")}><input type="number" min="1" max="10000" step="1" value={remainingInstallments} onChange={(event) => setRemainingInstallments(event.target.value)} /></Field>
        <Field label={t("endDate")} hint={t("vehicleInstallmentEndHelp")}><input type="date" min={installmentNextDueDate} value={installmentEndDate} onChange={(event) => setInstallmentEndDate(event.target.value)} /></Field>
        <Field label={t("category")}><select required value={installmentCategoryId} onChange={(event) => setInstallmentCategoryId(event.target.value)}><option value="">—</option>{data.categories.filter((item) => item.active && item.kind !== "income").map((item) => <option key={item.id} value={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field>
        <Field label={t("paymentMethod")}><select required value={installmentPaymentMethodId} onChange={(event) => setInstallmentPaymentMethodId(event.target.value)}><option value="">—</option>{data.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <PaymentAccountField data={data} paymentMethodId={installmentPaymentMethodId} date={installmentNextDueDate} value={installmentAccountId} onChange={setInstallmentAccountId} />
        {existingInstallment && <RecurringRateChangesEditor data={data} recurring={existingInstallment} onSave={onSave} />}
      </div>}
    </section>
    <Field label={t("notes")} wide><textarea maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}

export function VehicleEntryForm({ data, value, initialVehicleId, onClose, onSave }: { data: FinanceData; value?: VehicleEntry; initialVehicleId?: string; onClose: () => void; onSave: (command: FinanceCommand) => Promise<void> }) {
  const { t, language } = useI18n();
  const existingTransaction = value
    ? data.transactions.find((item) => item.id === value.transactionId || item.vehicleEntryId === value.id)
    : undefined;
  const existingSharedExpense = existingTransaction
    ? data.sharedExpenses.find((item) => item.id === existingTransaction.sharedExpenseId || item.transactionId === existingTransaction.id)
    : undefined;
  const initialVehicle = value?.vehicleId ?? initialVehicleId ?? data.vehicles.find((item) => item.active)?.id ?? "";
  const initialDate = value?.date ?? todayIso();
  const initialPreviousOdometer = previousVehicleOdometer(data, initialVehicle, initialDate, value?.id);
  const initialDistance = calculateVehicleDistance(value?.odometerKm, initialPreviousOdometer);
  const initialFuelLiters = calculateFuelLiters(value?.amount, value?.fuelUnitPrice);
  const [vehicleId, setVehicleId] = useState(initialVehicle);
  const [date, setDate] = useState(initialDate);
  const [kind, setKind] = useState<VehicleEntry["kind"]>(value?.kind ?? "fuel");
  const [description, setDescription] = useState(value?.description ?? "");
  const [amount, setAmount] = useState(value ? String(value.amount) : "");
  const [odometerKm, setOdometerKm] = useState(value?.odometerKm !== undefined ? String(value.odometerKm) : "");
  const [distanceKmOverride, setDistanceKmOverride] = useState<string | null>(
    value?.distanceKm !== undefined && value.distanceKm !== initialDistance ? String(value.distanceKm) : null,
  );
  const [fuelLitersOverride, setFuelLitersOverride] = useState<string | null>(
    value?.fuelLiters !== undefined && value.fuelLiters !== initialFuelLiters ? String(value.fuelLiters) : null,
  );
  const [fuelUnitPrice, setFuelUnitPrice] = useState(value?.fuelUnitPrice !== undefined ? String(value.fuelUnitPrice) : "");
  const [fuelType, setFuelType] = useState(value?.fuelType ?? "");
  const [vendor, setVendor] = useState(value?.vendor ?? "");
  const [categoryId, setCategoryId] = useState(value?.categoryId ?? data.categories.find((item) => item.active && (item.nameIt.toLocaleLowerCase().includes("auto") || item.nameEn.toLocaleLowerCase().includes("car")))?.id ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(value?.paymentMethodId ?? data.paymentMethods.find((item) => item.active)?.id ?? "");
  const [accountId, setAccountId] = useState(value?.accountId ?? "");
  const [shared, setShared] = useState(Boolean(existingTransaction?.shared || existingSharedExpense));
  const [sharedPaidBy, setSharedPaidBy] = useState<"owner" | "partner">(existingSharedExpense?.paidBy ?? existingTransaction?.sharedPaidBy ?? "owner");
  const [notes, setNotes] = useState(value?.notes ?? "");
  const previousOdometerKm = useMemo(
    () => previousVehicleOdometer(data, vehicleId, date, value?.id),
    [data, date, value?.id, vehicleId],
  );
  const odometerValue = numberFromInput(odometerKm);
  const suggestedDistanceKm = calculateVehicleDistance(odometerValue, previousOdometerKm);
  const suggestedFuelLiters = calculateFuelLiters(numberFromInput(amount), numberFromInput(fuelUnitPrice));
  const distanceManuallyEdited = distanceKmOverride !== null;
  const fuelLitersManuallyEdited = fuelLitersOverride !== null;
  const distanceKm = distanceKmOverride ?? (suggestedDistanceKm === undefined ? "" : String(suggestedDistanceKm));
  const fuelLiters = fuelLitersOverride ?? (suggestedFuelLiters === undefined ? "" : String(suggestedFuelLiters));
  const odometerIsLower = odometerValue !== undefined
    && previousOdometerKm !== undefined
    && odometerValue < previousOdometerKm;

  const valid = Boolean(vehicleId && description.trim() && Number(amount || 0) >= 0 && (kind === "valuation" || (categoryId && paymentMethodId && accountId)) && (kind !== "fuel" || Number(fuelLiters) > 0) && (!shared || (kind !== "valuation" && Number(amount) > 0)));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!valid) return;
    const entry: VehicleEntry = {
      ...value, id: value?.id ?? crypto.randomUUID(), vehicleId, date, kind, description: description.trim(), amount: Number(amount || 0),
      odometerKm: odometerKm ? Number(odometerKm) : undefined, distanceKm: distanceKm ? Number(distanceKm) : undefined,
      fuelLiters: kind === "fuel" && fuelLiters ? Number(fuelLiters) : undefined,
      fuelUnitPrice: kind === "fuel" && fuelUnitPrice ? Number(fuelUnitPrice) : undefined,
      fuelType: kind === "fuel" && fuelType ? fuelType : undefined, vendor: vendor || undefined,
      categoryId: kind === "valuation" ? undefined : categoryId, paymentMethodId: kind === "valuation" ? undefined : paymentMethodId,
      accountId: kind === "valuation" ? undefined : accountId, transactionId: value?.transactionId, notes,
    };
    await saveAndClose(onSave, {
      type: value ? "updateVehicleEntryWithSharedExpense" : "addVehicleEntryWithSharedExpense",
      value: {
        entry,
        shared: shared ? {
          paidBy: sharedPaidBy,
          settled: existingSharedExpense?.settled ?? existingTransaction?.sharedSettled ?? false,
        } : undefined,
      },
    }, onClose);
  };
  return <Modal title={value ? t("editVehicleEntry") : t("newVehicleEntry")} onClose={onClose} onSubmit={submit} submitDisabled={!valid}>
    <Field label={t("vehicle")}><select required value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>{data.vehicles.filter((item) => item.active || item.id === vehicleId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label={t("date")}><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
    <Field label={t("type")}><select value={kind} onChange={(event) => { const nextKind = event.target.value as VehicleEntry["kind"]; setKind(nextKind); if (nextKind === "valuation") setShared(false); }}>{entryKinds.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></Field>
    <Field label={t("amount")}><input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
    <Field label={t("description")} wide><input required maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
    {kind !== "valuation" && <><Field label={t("category")}><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">—</option>{data.categories.filter((item) => item.active && (item.kind === "expense" || item.kind === "both")).map((item) => <option key={item.id} value={item.id}>{language === "it" ? item.nameIt : item.nameEn}</option>)}</select></Field><Field label={t("paymentMethod")}><select required value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)}><option value="">—</option>{data.paymentMethods.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><PaymentAccountField data={data} paymentMethodId={paymentMethodId} date={date} value={accountId} onChange={setAccountId} /></>}
    <Field label={t("odometerKm")}><input type="number" min="0" max="100000000" step="1" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} /></Field>
    <Field label={t("distanceKm")} hint={odometerIsLower
      ? t("odometerLowerThanPrevious", { value: previousOdometerKm.toLocaleString(language) })
      : !distanceManuallyEdited && suggestedDistanceKm !== undefined
        ? t("distanceCalculatedHelp", { value: previousOdometerKm?.toLocaleString(language) ?? "" })
        : undefined}><input type="number" min="0" max="10000000" step="1" value={distanceKm} onChange={(event) => setDistanceKmOverride(event.target.value)} onBlur={() => { if (distanceKmOverride === "") setDistanceKmOverride(null); }} /></Field>
    {kind === "fuel" && <><Field label={t("fuelUnitPrice")}><input type="number" min="0" step="0.001" value={fuelUnitPrice} onChange={(event) => setFuelUnitPrice(event.target.value)} /></Field><Field label={t("fuelLiters")} hint={!fuelLitersManuallyEdited && suggestedFuelLiters !== undefined ? t("fuelLitersCalculatedHelp") : undefined}><input required type="number" min="0.001" max="1000000" step="0.001" value={fuelLiters} onChange={(event) => setFuelLitersOverride(event.target.value)} onBlur={() => { if (fuelLitersOverride === "") setFuelLitersOverride(null); }} /></Field><Field label={t("fuelType")}><select value={fuelType} onChange={(event) => setFuelType(event.target.value)}><option value="">—</option>{fuelType && !entryFuelTypes.some((item) => item.value === fuelType) && <option value={fuelType}>{fuelType}</option>}{entryFuelTypes.map((item) => <option key={item.value} value={item.value}>{t(item.label)}</option>)}</select></Field></>}
    <Field label={t("vendor")}><input maxLength={160} value={vendor} onChange={(event) => setVendor(event.target.value)} /></Field>
    {kind !== "valuation" && <><Field label={t("sharedExpense")}><span className="check-field"><input type="checkbox" aria-label={t("splitHalf")} checked={shared} onChange={(event) => setShared(event.target.checked)} />{t("splitHalf")}</span></Field>{shared && <Field label={t("paidBy")}><select value={sharedPaidBy} onChange={(event) => setSharedPaidBy(event.target.value as "owner" | "partner")}><option value="owner">{t("you")}</option><option value="partner">{t("partner")}</option></select></Field>}</>}
    <Field label={t("notes")} wide><textarea maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
  </Modal>;
}
