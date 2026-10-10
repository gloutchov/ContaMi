import type { FinanceData, Vehicle, VehicleAnnualSummary } from "./models";

export interface VehicleCostMetrics {
  paymentMode: "cash" | "financed";
  operatingCosts?: number;
  acquisitionPaid: number;
  overallCosts?: number;
  operatingCostPerKm?: number;
  overallCostPerKm?: number;
  incomplete: boolean;
  inconsistent: boolean;
}

/** Financing remains detectable after closure/rollover and before the first payment. */
export function vehicleHasFinancing(data: Pick<FinanceData, "recurringItems" | "vehicleEntries" | "vehicleAnnualSummaries">, vehicleId: string): boolean {
  return data.recurringItems.some((item) => item.vehicleId === vehicleId && item.kind === "installment")
    || data.vehicleEntries.some((item) => item.vehicleId === vehicleId && item.kind === "installment")
    || data.vehicleAnnualSummaries.some((item) => item.vehicleId === vehicleId && item.installments > 0);
}

/** Lifetime paid costs. Acquisition metadata does not create accounting movements. */
export function vehicleCostMetrics(vehicle: Vehicle, summary: VehicleAnnualSummary, hasFinancing: boolean): VehicleCostMetrics {
  const paymentMode = vehicle.purchasePaymentMode ?? (hasFinancing || summary.installments > 0 ? "financed" : "cash");
  const recordedPurchase = vehicle.purchaseCostRecorded ?? 0;
  const nonInstallmentCosts = summary.totalCosts - summary.installments;
  const inconsistent = recordedPurchase > nonInstallmentCosts + 0.005
    || nonInstallmentCosts < -0.005
    || (paymentMode === "cash" && summary.installments > 0);
  const upfront = paymentMode === "cash" ? vehicle.purchasePrice : vehicle.purchaseDownPayment;
  const incomplete = upfront === undefined || inconsistent;
  const acquisitionPaid = summary.installments + Math.max(recordedPurchase, upfront ?? 0);
  // If known payments are lower than the amount already recorded, data is inconsistent.
  const invalidAcquisition = upfront !== undefined && recordedPurchase > upfront + 0.005;
  const invalid = inconsistent || invalidAcquisition;
  const operatingCosts = invalid ? undefined : Math.max(0, Math.round((nonInstallmentCosts - recordedPurchase) * 100) / 100);
  // With unknown upfront payment, retain recorded acquisition as a documented lower bound.
  const overallCosts = operatingCosts === undefined ? undefined
    : operatingCosts + summary.installments + Math.max(recordedPurchase, upfront ?? 0);
  return {
    paymentMode,
    operatingCosts,
    acquisitionPaid,
    overallCosts,
    operatingCostPerKm: summary.distanceKm > 0 && operatingCosts !== undefined ? operatingCosts / summary.distanceKm : undefined,
    overallCostPerKm: summary.distanceKm > 0 && overallCosts !== undefined ? overallCosts / summary.distanceKm : undefined,
    incomplete: incomplete || invalid,
    inconsistent: invalid,
  };
}
