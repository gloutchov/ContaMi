import { describe, expect, it } from "vitest";
import { createEmptyFinanceData } from "../../src/domain/finance";
import type { FinanceData, VehicleEntry } from "../../src/domain/models";
import { calculateFuelLiters, calculateVehicleDistance, previousVehicleOdometer } from "../../src/domain/vehicleEntries";

function addVehicle(data: FinanceData, name = "Synthetic car"): string {
  const id = crypto.randomUUID();
  data.vehicles.push({ id, name, manufacturer: "Example", model: "One", fuelType: "petrol", active: true, notes: "" });
  return id;
}

function odometerEntry(vehicleId: string, date: string, odometerKm: number, id = crypto.randomUUID()): VehicleEntry {
  return { id, vehicleId, date, kind: "fuel", description: "Synthetic reading", amount: 50, odometerKm, notes: "" };
}

function addVehicleHistory(data: FinanceData, vehicleId: string, year: number, closingOdometer: number): void {
  data.vehicleAnnualSummaries.push({
    vehicleId,
    year,
    totalCosts: 0,
    fuelCosts: 0,
    installments: 0,
    taxes: 0,
    insurance: 0,
    tires: 0,
    maintenance: 0,
    repairs: 0,
    fuelLiters: 0,
    distanceKm: 0,
    closingOdometer,
  });
}

describe("vehicle entry calculations", () => {
  it("selects the latest strictly earlier reading for the same vehicle and excludes the edited row", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = addVehicle(data);
    const otherVehicleId = addVehicle(data, "Other synthetic car");
    const editedId = crypto.randomUUID();
    data.vehicleEntries.push(
      odometerEntry(vehicleId, "2026-03-10", 10_000),
      odometerEntry(vehicleId, "2026-05-10", 10_750, editedId),
      odometerEntry(otherVehicleId, "2026-05-15", 90_000),
    );

    expect(previousVehicleOdometer(data, vehicleId, "2026-06-01")).toBe(10_750);
    expect(previousVehicleOdometer(data, vehicleId, "2026-06-01", editedId)).toBe(10_000);
    expect(previousVehicleOdometer(data, vehicleId, "2026-05-10", editedId)).toBe(10_000);
  });

  it("does not choose arbitrarily between two latest readings on the same day", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = addVehicle(data);
    data.vehicleEntries.push(
      odometerEntry(vehicleId, "2026-03-01", 9_000),
      odometerEntry(vehicleId, "2026-05-10", 10_000),
      odometerEntry(vehicleId, "2026-05-10", 10_050),
    );

    expect(previousVehicleOdometer(data, vehicleId, "2026-06-01")).toBeUndefined();
  });

  it("ignores planned readings and falls back to the latest unambiguous annual closing odometer", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = addVehicle(data);
    addVehicleHistory(data, vehicleId, 2024, 8_000);
    addVehicleHistory(data, vehicleId, 2025, 12_000);
    const plannedEntry = odometerEntry(vehicleId, "2026-01-10", 12_400);
    const transactionId = crypto.randomUUID();
    data.vehicleEntries.push(plannedEntry);
    data.transactions.push({
      id: transactionId,
      date: plannedEntry.date,
      description: plannedEntry.description,
      categoryId: data.categories[4].id,
      paymentMethodId: data.paymentMethods[0].id,
      kind: "expense",
      amount: plannedEntry.amount,
      currency: "EUR",
      vehicleId,
      vehicleEntryId: plannedEntry.id,
      planned: true,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(previousVehicleOdometer(data, vehicleId, "2026-02-01")).toBe(12_000);
  });

  it("prefers a detailed reading and rejects ambiguous annual summaries", () => {
    const data = createEmptyFinanceData(2026);
    const vehicleId = addVehicle(data);
    addVehicleHistory(data, vehicleId, 2025, 12_000);
    data.vehicleEntries.push(odometerEntry(vehicleId, "2026-01-10", 12_400));

    expect(previousVehicleOdometer(data, vehicleId, "2026-02-01")).toBe(12_400);

    data.vehicleEntries = [];
    addVehicleHistory(data, vehicleId, 2025, 12_050);
    expect(previousVehicleOdometer(data, vehicleId, "2026-02-01")).toBeUndefined();
  });

  it("calculates non-negative distances within domain limits", () => {
    expect(calculateVehicleDistance(10_750, 10_000)).toBe(750);
    expect(calculateVehicleDistance(10_000, 10_000)).toBe(0);
    expect(calculateVehicleDistance(9_999, 10_000)).toBeUndefined();
    expect(calculateVehicleDistance(Number.POSITIVE_INFINITY, 10_000)).toBeUndefined();
    expect(calculateVehicleDistance(20_000_001, 1)).toBeUndefined();
    expect(calculateVehicleDistance(10_000, undefined)).toBeUndefined();
  });

  it("calculates fuel litres to thousandths and rejects incomplete or invalid inputs", () => {
    expect(calculateFuelLiters(60, 2)).toBe(30);
    expect(calculateFuelLiters(50, 1.499)).toBe(33.356);
    expect(calculateFuelLiters(60, 0)).toBeUndefined();
    expect(calculateFuelLiters(0, 2)).toBeUndefined();
    expect(calculateFuelLiters(undefined, 2)).toBeUndefined();
    expect(calculateFuelLiters(60, Number.NaN)).toBeUndefined();
  });
});
