import { createVehicleAnnualSummaries } from "../../domain/annualHistory";
import type { FinanceData, VehicleAnnualSummary } from "../../domain/models";
import { vehicleCostMetrics, vehicleHasFinancing } from "../../domain/vehicleCosts";
import { confirmedVehicleEntries } from "../../domain/vehicleEntries";

export function vehicleHistory(data: FinanceData, vehicleId: string): VehicleAnnualSummary[] {
  const byYear = new Map(
    data.vehicleAnnualSummaries
      .filter((item) => item.vehicleId === vehicleId)
      .map((item) => [item.year, item]),
  );
  const current = createVehicleAnnualSummaries(data).find((item) => item.vehicleId === vehicleId);
  const hasCurrentEntries = confirmedVehicleEntries(data).some((item) => item.vehicleId === vehicleId
    && item.date.startsWith(String(data.meta.activeYear)));
  if (current && hasCurrentEntries) byYear.set(current.year, current);
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export function vehicleLifetimeSummary(data: FinanceData, vehicleId: string): VehicleAnnualSummary {
  const history = vehicleHistory(data, vehicleId);
  const sum = (key: keyof Pick<VehicleAnnualSummary,
    "totalCosts" | "fuelCosts" | "installments" | "taxes" | "insurance" | "tires" | "maintenance" | "repairs" | "fuelLiters" | "distanceKm"
  >) => history.reduce((total, item) => total + item[key], 0);
  const fuelLiters = sum("fuelLiters");
  const distanceKm = sum("distanceKm");
  const closingOdometer = history
    .map((item) => item.closingOdometer)
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => b - a)[0];
  return {
    vehicleId,
    year: data.meta.activeYear,
    totalCosts: sum("totalCosts"),
    fuelCosts: sum("fuelCosts"),
    installments: sum("installments"),
    taxes: sum("taxes"),
    insurance: sum("insurance"),
    tires: sum("tires"),
    maintenance: sum("maintenance"),
    repairs: sum("repairs"),
    fuelLiters,
    distanceKm,
    averageKmPerLiter: fuelLiters > 0 ? distanceKm / fuelLiters : undefined,
    closingOdometer,
  };
}

export function vehicleUnitemizedCosts(summary: VehicleAnnualSummary): number {
  const categorizedCosts = summary.fuelCosts + summary.installments + summary.taxes
    + summary.insurance + summary.tires + summary.maintenance + summary.repairs;
  return Math.round((summary.totalCosts - categorizedCosts) * 100) / 100;
}

export interface VehicleCostComparisonPoint {
  vehicleId: string;
  label: string;
  costPerKm: number;
  totalCosts: number;
  distanceKm: number;
}

export function vehicleCostComparison(data: FinanceData): VehicleCostComparisonPoint[] {
  return data.vehicles.flatMap((vehicle) => {
    const summary = vehicleLifetimeSummary(data, vehicle.id);
    const costs = vehicleCostMetrics(vehicle, summary, vehicleHasFinancing(data, vehicle.id));
    if (costs.operatingCostPerKm === undefined) return [];
    return [{
      vehicleId: vehicle.id,
      label: vehicle.name,
      costPerKm: costs.operatingCostPerKm,
      totalCosts: costs.operatingCosts!,
      distanceKm: summary.distanceKm,
    }];
  });
}
