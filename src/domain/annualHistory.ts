import type {
  FinanceData,
  InvestmentAnnualSummary,
  PropertyAnnualSummary,
  VehicleAnnualSummary,
} from "./models";
import { confirmedInvestmentEntries, isRolloverOpeningValuation, latestInvestmentValue } from "./investments";
import { isCondominiumCost, isPropertyUtilityCost, propertyConsumptionQuantity } from "./propertyMetrics";
import { propertyWaterStatistics } from "./propertyWater";
import { confirmedVehicleEntries } from "./vehicleEntries";

const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

function isConfirmedPropertyEntry(data: FinanceData, entry: FinanceData["propertyEntries"][number]): boolean {
  return !data.transactions.find((transaction) => transaction.id === entry.transactionId)?.planned;
}

export function propertyAnnualSummariesWithLateIncome(data: FinanceData): PropertyAnnualSummary[] {
  const summaries = data.propertyAnnualSummaries.map((summary) => ({ ...summary }));
  for (const entry of data.propertyEntries) {
    if (entry.kind !== "income" || !entry.dueDate || !isConfirmedPropertyEntry(data, entry)) continue;
    const competenceYear = Number(entry.dueDate.slice(0, 4));
    const paymentYear = Number(entry.date.slice(0, 4));
    if (competenceYear >= data.meta.activeYear || paymentYear !== data.meta.activeYear || competenceYear === paymentYear) continue;
    const summary = summaries.find((item) => item.propertyId === entry.propertyId && item.year === competenceYear);
    if (summary) summary.income += entry.amount;
  }
  return summaries;
}

export function createPropertyAnnualSummaries(data: FinanceData): PropertyAnnualSummary[] {
  const year = data.meta.activeYear;
  return data.properties.map((property) => {
    const entries = data.propertyEntries.filter((entry) => entry.propertyId === property.id
      && (entry.kind === "income" ? entry.dueDate ?? entry.date : entry.date).startsWith(String(year))
      && isConfirmedPropertyEntry(data, entry));
    const latestValuation = entries.filter((entry) => entry.kind === "valuation").sort((a, b) => b.date.localeCompare(a.date))[0];
    const consumption = (kind: "electricity" | "gas" | "water") => total(entries
      .filter((entry) => entry.kind === "consumption" || entry.detailKind?.startsWith("utility_"))
      .map((entry) => propertyConsumptionQuantity(entry, kind)));
    const utilityCost = (kind: "electricity" | "gas" | "water" | "phoneInternet") => total(entries
      .filter((entry) => isPropertyUtilityCost(entry, kind))
      .map((entry) => entry.amount));
    const water = propertyWaterStatistics(data, property.id, year);
    return {
      propertyId: property.id,
      year,
      income: total(entries.filter((entry) => entry.kind === "income").map((entry) => entry.amount)),
      expenses: total(entries.filter((entry) => entry.kind === "expense").map((entry) => entry.amount)),
      closingValue: latestValuation?.amount ?? property.purchasePrice,
      electricityKwh: consumption("electricity"),
      gasCubicMeters: consumption("gas"),
      waterCubicMeters: consumption("water"),
      electricityCost: utilityCost("electricity"),
      gasCost: utilityCost("gas"),
      waterCost: utilityCost("water"),
      condominiumColdWaterCubicMeters: water.coldCubicMeters,
      condominiumHotWaterCubicMeters: water.hotCubicMeters,
      condominiumColdWaterCoverage: water.coldCoverage,
      condominiumHotWaterCoverage: water.hotCoverage,
      condominiumWaterCost: water.totalCost,
      condominiumColdWaterCost: water.coldCost,
      condominiumHotWaterCost: water.hotCost,
      condominiumClosingReadingDate: water.closingReadingDate,
      condominiumColdClosingMeterReading: water.coldClosingMeterReading,
      condominiumHotClosingMeterReading: water.hotClosingMeterReading,
      phoneInternetCost: utilityCost("phoneInternet"),
      condominiumCost: total(entries.filter((entry) => isCondominiumCost(entry)).map((entry) => entry.amount)),
    };
  });
}

export function createInvestmentAnnualSummaries(data: FinanceData): InvestmentAnnualSummary[] {
  const year = data.meta.activeYear;
  return data.investments.map((investment) => {
    const entries = confirmedInvestmentEntries(data, investment.id).filter((entry) => entry.date.startsWith(String(year)));
    const latestValuation = entries
      .filter((entry) => entry.kind === "valuation" && !isRolloverOpeningValuation(entry))
      .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
      .at(-1);
    const laterMovement = latestValuation && entries.some((entry) => (entry.kind === "contribution" || entry.kind === "withdrawal")
      && entry.date > latestValuation.date);
    return {
      investmentId: investment.id,
      year,
      closingValue: latestInvestmentValue(data, investment.id),
      contributions: total(entries.filter((entry) => entry.kind === "contribution").map((entry) => entry.amount)),
      withdrawals: total(entries.filter((entry) => entry.kind === "withdrawal").map((entry) => entry.amount)),
      closingValueObservedAt: latestValuation && !laterMovement ? latestValuation.date : undefined,
    };
  });
}

export function createVehicleAnnualSummaries(data: FinanceData): VehicleAnnualSummary[] {
  const year = data.meta.activeYear;
  const confirmedEntries = confirmedVehicleEntries(data);
  return data.vehicles.map((vehicle) => {
    const entries = confirmedEntries.filter((entry) => entry.vehicleId === vehicle.id
      && entry.date.startsWith(String(year)));
    const costs = entries.filter((entry) => entry.kind !== "valuation");
    const byKind = (kind: typeof costs[number]["kind"]) => total(costs.filter((entry) => entry.kind === kind).map((entry) => entry.amount));
    const fuelLiters = total(entries.map((entry) => entry.fuelLiters ?? 0));
    const distanceKm = total(entries.map((entry) => entry.distanceKm ?? 0));
    const closingOdometer = entries.map((entry) => entry.odometerKm).filter((value): value is number => value !== undefined).sort((a, b) => b - a)[0];
    return {
      vehicleId: vehicle.id,
      year,
      totalCosts: total(costs.map((entry) => entry.amount)),
      fuelCosts: byKind("fuel"),
      installments: byKind("installment"),
      taxes: byKind("tax"),
      insurance: byKind("insurance"),
      tires: byKind("tires"),
      maintenance: byKind("maintenance"),
      repairs: byKind("repair"),
      fuelLiters,
      distanceKm,
      averageKmPerLiter: fuelLiters > 0 ? distanceKm / fuelLiters : undefined,
      closingOdometer,
    };
  });
}
