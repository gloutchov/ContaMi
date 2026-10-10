import type { FinanceData, RecurringItem } from "./models";

export function vehicleInstallmentPlans(
  data: Pick<FinanceData, "recurringItems">,
  vehicleId: string,
): RecurringItem[] {
  return data.recurringItems.filter((item) => item.vehicleId === vehicleId && item.kind === "installment");
}

export function vehicleInstallmentPlan(
  data: Pick<FinanceData, "recurringItems">,
  vehicleId: string,
): RecurringItem | undefined {
  return [...vehicleInstallmentPlans(data, vehicleId)].sort((left, right) => {
    if (left.active !== right.active) return left.active ? -1 : 1;
    const leftOpen = left.remainingInstallments !== 0;
    const rightOpen = right.remainingInstallments !== 0;
    if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
    return right.nextDueDate.localeCompare(left.nextDueDate);
  })[0];
}

export function normalizeVehicleInstallment(
  data: Pick<FinanceData, "vehicles">,
  recurring: RecurringItem,
): RecurringItem {
  const vehicle = data.vehicles.find((item) => item.id === recurring.vehicleId);
  if (!vehicle) throw new Error("VEHICLE_NOT_FOUND");
  return {
    ...recurring,
    name: vehicle.name,
    kind: "installment",
    direction: "expense",
    investmentId: undefined,
    propertyId: undefined,
  };
}

export function validateVehicleInstallment(
  data: Pick<FinanceData, "vehicles" | "recurringItems">,
  recurring: RecurringItem,
  excludedId?: string,
): void {
  if (!recurring.vehicleId
    || recurring.kind !== "installment"
    || recurring.direction !== "expense"
    || recurring.investmentId
    || recurring.propertyId) throw new Error("INVALID_VEHICLE_INSTALLMENT");
  if (!data.vehicles.some((item) => item.id === recurring.vehicleId)) throw new Error("VEHICLE_NOT_FOUND");
  if (recurring.remainingInstallments === undefined && !recurring.endDate) {
    throw new Error("INVALID_VEHICLE_INSTALLMENT");
  }
  if (recurring.endDate && recurring.endDate < recurring.nextDueDate) {
    throw new Error("INVALID_VEHICLE_INSTALLMENT");
  }
  if (recurring.active && data.recurringItems.some((item) => item.id !== excludedId
    && item.vehicleId === recurring.vehicleId
    && item.kind === "installment"
    && item.active)) throw new Error("VEHICLE_INSTALLMENT_PLAN_EXISTS");
}

export function vehicleInstallmentHasConfirmedHistory(
  data: Pick<FinanceData, "transactions" | "recurringRateChanges">,
  recurringId: string,
): boolean {
  return data.transactions.some((item) => item.recurringId === recurringId && !item.planned)
    || data.recurringRateChanges.some((item) => item.recurringId === recurringId);
}

export function vehicleHasRecordedHistory(
  data: Pick<FinanceData, "transactions" | "vehicleEntries" | "vehicleAnnualSummaries">,
  vehicleId: string,
): boolean {
  if (data.vehicleAnnualSummaries.some((item) => item.vehicleId === vehicleId)) return true;
  if (data.transactions.some((item) => item.vehicleId === vehicleId && !item.planned)) return true;
  return data.vehicleEntries.some((entry) => {
    if (entry.vehicleId !== vehicleId) return false;
    const transaction = entry.transactionId
      ? data.transactions.find((item) => item.id === entry.transactionId)
      : undefined;
    return !transaction?.planned;
  });
}


/** Compare financing fields, excluding the display name derived from the vehicle. */
export function sameVehicleInstallmentConfiguration(left: RecurringItem | undefined, right: RecurringItem | undefined): boolean {
  if (!left || !right) return left === right;
  const fields = ["id", "kind", "direction", "amount", "frequency", "categoryId", "paymentMethodId", "accountId", "vehicleId", "investmentId", "propertyId", "nextDueDate", "endDate", "remainingInstallments", "active", "closedAt", "notes"] as const;
  return fields.every((field) => left[field] === right[field]);
}
