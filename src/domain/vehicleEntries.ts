import type { FinanceData } from "./models";

const MAX_ODOMETER_KM = 100_000_000;
const MAX_DISTANCE_KM = 10_000_000;
const MAX_FUEL_LITERS = 1_000_000;

function finiteInRange(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function roundToThousandths(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000) / 1_000;
}

function entryIsConfirmed(data: FinanceData, entry: FinanceData["vehicleEntries"][number]): boolean {
  return !data.transactions.find((transaction) => (
    transaction.id === entry.transactionId || transaction.vehicleEntryId === entry.id
  ))?.planned;
}

export function previousVehicleOdometer(
  data: FinanceData,
  vehicleId: string,
  date: string,
  excludedEntryId?: string,
): number | undefined {
  const datedReadings = data.vehicleEntries.filter((entry) => entry.vehicleId === vehicleId
    && entry.id !== excludedEntryId
    && entry.date < date
    && entry.odometerKm !== undefined
    && finiteInRange(entry.odometerKm, 0, MAX_ODOMETER_KM)
    && entryIsConfirmed(data, entry));

  if (datedReadings.length > 0) {
    const latestDate = datedReadings.reduce(
      (latest, entry) => entry.date > latest ? entry.date : latest,
      datedReadings[0].date,
    );
    const latestReadings = datedReadings.filter((entry) => entry.date === latestDate);
    return latestReadings.length === 1 ? latestReadings[0].odometerKm : undefined;
  }

  const entryYear = Number(date.slice(0, 4));
  if (!Number.isInteger(entryYear)) return undefined;
  const historicalReadings = data.vehicleAnnualSummaries.filter((summary) => summary.vehicleId === vehicleId
    && summary.year < entryYear
    && summary.closingOdometer !== undefined
    && finiteInRange(summary.closingOdometer, 0, MAX_ODOMETER_KM));
  if (historicalReadings.length === 0) return undefined;

  const latestYear = historicalReadings.reduce(
    (latest, summary) => summary.year > latest ? summary.year : latest,
    historicalReadings[0].year,
  );
  const latestReadings = historicalReadings.filter((summary) => summary.year === latestYear);
  return latestReadings.length === 1 ? latestReadings[0].closingOdometer : undefined;
}

export function calculateVehicleDistance(
  odometerKm: number | undefined,
  previousOdometerKm: number | undefined,
): number | undefined {
  if (odometerKm === undefined || previousOdometerKm === undefined) return undefined;
  if (!finiteInRange(odometerKm, 0, MAX_ODOMETER_KM)
    || !finiteInRange(previousOdometerKm, 0, MAX_ODOMETER_KM)) return undefined;
  const distance = roundToThousandths(odometerKm - previousOdometerKm);
  return finiteInRange(distance, 0, MAX_DISTANCE_KM) ? distance : undefined;
}

export function calculateFuelLiters(amount: number | undefined, fuelUnitPrice: number | undefined): number | undefined {
  if (amount === undefined || fuelUnitPrice === undefined) return undefined;
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(fuelUnitPrice) || fuelUnitPrice <= 0) return undefined;
  const liters = roundToThousandths(amount / fuelUnitPrice);
  return finiteInRange(liters, 0.001, MAX_FUEL_LITERS) ? liters : undefined;
}
