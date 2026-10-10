import { describe, expect, it } from "vitest";
import { applyFinanceCommand, createEmptyFinanceData } from "../../src/domain/finance";
import { vehicleSchema, type Vehicle, type VehicleAnnualSummary } from "../../src/domain/models";
import { vehicleCostMetrics, vehicleHasFinancing } from "../../src/domain/vehicleCosts";
import { createRolloverFinanceData } from "../../src/domain/rollover";
import { vehicleCostComparison, vehicleLifetimeSummary } from "../../src/renderer/utils/vehicleHistory";

const vehicle: Vehicle = { id: "00000000-0000-4000-8000-000000000099", name: "Synthetic vehicle", manufacturer: "", model: "", fuelType: "petrol", active: true, notes: "" };
const summary: VehicleAnnualSummary = { vehicleId: vehicle.id, year: 2025, totalCosts: 5000, installments: 3000, fuelCosts: 1000, taxes: 200, insurance: 500, tires: 100, maintenance: 100, repairs: 100, fuelLiters: 500, distanceKm: 10000 };

describe("vehicle lifetime operating and overall cost", () => {
  it("detects financed purchases from planned entries without counting them as paid", () => {
    const data = createEmptyFinanceData(2026);
    data.vehicleEntries.push({ id: crypto.randomUUID(), vehicleId: vehicle.id, date: "2026-12-15", kind: "installment", amount: 300, description: "Synthetic financing", notes: "" });
    expect(vehicleHasFinancing(data, vehicle.id)).toBe(true);
    expect(vehicleCostMetrics({ ...vehicle, purchasePrice: 30000 }, { ...summary, installments: 0 }, vehicleHasFinancing(data, vehicle.id))).toMatchObject({ paymentMode: "financed", incomplete: true, overallCosts: 5000 });
  });
  it.each([-1, Infinity, NaN, 1_000_000_000_001])("rejects invalid acquisition metadata amounts (%s)", (amount) => {
    expect(vehicleSchema.safeParse({ ...vehicle, purchaseDownPayment: amount }).success).toBe(false);
    expect(vehicleSchema.safeParse({ ...vehicle, purchaseCostRecorded: amount }).success).toBe(false);
  });

  it("excludes instalments from operating costs and counts only the down payment plus paid instalments", () => {
    const result = vehicleCostMetrics({ ...vehicle, purchasePrice: 30000, purchaseDownPayment: 2000 }, summary, true);
    expect(result).toMatchObject({ operatingCosts: 2000, acquisitionPaid: 5000, overallCosts: 7000, operatingCostPerKm: 0.2, overallCostPerKm: 0.7, incomplete: false });
  });
  it("adds the cash price once without creating accounting movements", () => {
    const cash = { ...vehicle, purchasePrice: 20000 };
    const result = vehicleCostMetrics(cash, { ...summary, installments: 0, totalCosts: 2000 }, false);
    expect(result).toMatchObject({ operatingCosts: 2000, overallCosts: 22000, operatingCostPerKm: 0.2, overallCostPerKm: 2.2, incomplete: false });
    const data = createEmptyFinanceData(2026);
    data.vehicles.push(vehicle);
    const next = applyFinanceCommand(data, { type: "updateVehicle", value: cash });
    expect(next.transactions).toEqual(data.transactions);
    expect(next.accounts).toEqual(data.accounts);
  });
  it("does not double count a cash purchase already included in history", () => {
    const result = vehicleCostMetrics({ ...vehicle, purchasePrice: 20000, purchaseCostRecorded: 20000 }, { ...summary, installments: 0, totalCosts: 22000 }, false);
    expect(result).toMatchObject({ operatingCosts: 2000, overallCosts: 22000, overallCostPerKm: 2.2, incomplete: false });
  });
  it("does not double count a down payment already included in history", () => {
    const result = vehicleCostMetrics({ ...vehicle, purchasePrice: 30000, purchaseDownPayment: 2000, purchaseCostRecorded: 2000 }, { ...summary, totalCosts: 7000 }, true);
    expect(result).toMatchObject({ operatingCosts: 2000, overallCosts: 7000, overallCostPerKm: 0.7, incomplete: false });
  });
  it("marks missing cash price or financed down payment incomplete", () => {
    expect(vehicleCostMetrics(vehicle, { ...summary, installments: 0 }, false)).toMatchObject({ incomplete: true, overallCosts: 5000 });
    expect(vehicleCostMetrics({ ...vehicle, purchasePrice: 30000 }, summary, true)).toMatchObject({ incomplete: true, overallCosts: 5000 });
    expect(vehicleCostMetrics({ ...vehicle, purchaseDownPayment: 0 }, summary, true)).toMatchObject({ incomplete: false, overallCosts: 5000 });
  });
  it("retains known recorded acquisition as a lower bound when the upfront total is unknown", () => {
    const result = vehicleCostMetrics({ ...vehicle, purchaseCostRecorded: 1000 }, summary, true);
    expect(result).toMatchObject({ operatingCosts: 1000, overallCosts: 5000, acquisitionPaid: 4000, incomplete: true });
  });
  it.each([
    [{ purchaseCostRecorded: 3000 }, summary],
    [{ purchaseDownPayment: 500, purchaseCostRecorded: 1000 }, summary],
    [{ purchasePaymentMode: "cash", purchasePrice: 30000 }, summary],
    [{}, { ...summary, totalCosts: 1000 }],
  ])("flags inconsistent acquisition data instead of presenting a false total", (metadata, totals) => {
    const result = vehicleCostMetrics({ ...vehicle, ...metadata } as Vehicle, totals, true);
    expect(result.inconsistent).toBe(true);
    expect(result.incomplete).toBe(true);
    expect(result.overallCostPerKm).toBeUndefined();
  });
  it("does not divide by zero", () => {
    const result = vehicleCostMetrics({ ...vehicle, purchaseDownPayment: 0 }, { ...summary, distanceKm: 0 }, true);
    expect(result.operatingCostPerKm).toBeUndefined();
    expect(result.overallCostPerKm).toBeUndefined();
  });
  it("includes zero operating costs in the comparison and excludes all planned instalments", () => {
    const data = createEmptyFinanceData(2026);
    data.vehicles.push({ ...vehicle, purchaseDownPayment: 0 });
    data.vehicleAnnualSummaries.push({ ...summary, totalCosts: 3000, installments: 3000 });
    expect(vehicleCostComparison(data)[0]).toMatchObject({ costPerKm: 0, totalCosts: 0 });
    const transactionId = crypto.randomUUID();
    const entryId = crypto.randomUUID();
    data.vehicleEntries.push({ id: entryId, vehicleId: vehicle.id, date: "2026-12-15", kind: "installment", amount: 300, description: "Synthetic plan", transactionId, notes: "" });
    data.transactions.push({ id: transactionId, date: "2026-12-15", kind: "expense", amount: 300, currency: "EUR", categoryId: data.categories[4].id, paymentMethodId: data.paymentMethods[0].id, vehicleId: vehicle.id, vehicleEntryId: entryId, planned: true, description: "Synthetic plan", notes: "", createdAt: data.meta.createdAt, updatedAt: data.meta.updatedAt });
    expect(vehicleLifetimeSummary(data, vehicle.id).installments).toBe(3000);
  });
  it("preserves acquisition metadata and paid-cost metrics across rollover", () => {
    const data = createEmptyFinanceData(2026);
    data.vehicles.push({ ...vehicle, purchasePaymentMode: "financed", purchaseDownPayment: 2000, purchaseCostRecorded: 1000 });
    data.vehicleAnnualSummaries.push(summary);
    const next = createRolloverFinanceData(data, 2027);
    expect(next.vehicles[0]).toEqual(data.vehicles[0]);
    expect(vehicleCostMetrics(next.vehicles[0], vehicleLifetimeSummary(next, vehicle.id), true)).toEqual(vehicleCostMetrics(data.vehicles[0], vehicleLifetimeSummary(data, vehicle.id), true));
  });
});
