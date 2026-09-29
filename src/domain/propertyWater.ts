import type { FinanceData, PropertyWaterReading } from "./models";

export type WaterCoverage = "none" | "partial" | "complete";

export interface PropertyWaterConsumption {
  coldCubicMeters: number | null;
  hotCubicMeters: number | null;
}

export interface PropertyWaterStatistics {
  coldCubicMeters: number;
  hotCubicMeters: number;
  coldCoverage: WaterCoverage;
  hotCoverage: WaterCoverage;
  totalCost: number;
  coldCost?: number;
  hotCost?: number;
  closingReadingDate?: string;
  coldClosingMeterReading?: number;
  hotClosingMeterReading?: number;
}

function priorAnnualMeterValue(
  data: FinanceData,
  reading: PropertyWaterReading,
  component: "cold" | "hot",
): number | undefined {
  const year = Number(reading.periodStart.slice(0, 4));
  return data.propertyAnnualSummaries
    .filter((summary) => summary.propertyId === reading.propertyId && summary.year < year)
    .sort((left, right) => right.year - left.year)
    .map((summary) => component === "cold"
      ? summary.condominiumColdClosingMeterReading
      : summary.condominiumHotClosingMeterReading)
    .find((value): value is number => value !== undefined);
}

function priorProgressiveReading(
  data: FinanceData,
  reading: PropertyWaterReading,
): PropertyWaterReading | undefined {
  return data.propertyWaterReadings
    .filter((candidate) => candidate.id !== reading.id
      && candidate.propertyId === reading.propertyId
      && candidate.measurementMode === "meter_reading"
      && (candidate.readingDate < reading.readingDate
        || (candidate.readingDate === reading.readingDate && candidate.id < reading.id)))
    .sort((left, right) => right.readingDate.localeCompare(left.readingDate) || right.id.localeCompare(left.id))[0];
}

function progressiveConsumption(
  data: FinanceData,
  reading: PropertyWaterReading,
  component: "cold" | "hot",
): number | null {
  const startsNewCycle = component === "cold" ? reading.coldStartsNewCycle : reading.hotStartsNewCycle;
  if (startsNewCycle) return null;
  const previous = priorProgressiveReading(data, reading);
  const previousValue = previous
    ? component === "cold" ? previous.coldCubicMeters : previous.hotCubicMeters
    : priorAnnualMeterValue(data, reading, component);
  if (previousValue === undefined) return null;
  const currentValue = component === "cold" ? reading.coldCubicMeters : reading.hotCubicMeters;
  return currentValue >= previousValue ? currentValue - previousValue : null;
}

export function propertyWaterConsumption(
  data: FinanceData,
  reading: PropertyWaterReading,
): PropertyWaterConsumption {
  if (reading.measurementMode === "period_consumption") {
    return {
      coldCubicMeters: reading.coldCubicMeters,
      hotCubicMeters: reading.hotCubicMeters,
    };
  }
  return {
    coldCubicMeters: progressiveConsumption(data, reading, "cold"),
    hotCubicMeters: progressiveConsumption(data, reading, "hot"),
  };
}

function coverage(values: readonly (number | null)[]): WaterCoverage {
  if (!values.length) return "none";
  return values.every((value) => value !== null) ? "complete" : "partial";
}

export function propertyWaterStatistics(
  data: FinanceData,
  propertyId: string,
  year: number,
): PropertyWaterStatistics {
  const readings = data.propertyWaterReadings
    .filter((reading) => reading.propertyId === propertyId && reading.periodStart.startsWith(String(year)))
    .sort((left, right) => left.periodStart.localeCompare(right.periodStart)
      || left.readingDate.localeCompare(right.readingDate)
      || left.id.localeCompare(right.id));
  const consumptions = readings.map((reading) => propertyWaterConsumption(data, reading));
  const coldValues = consumptions.map((item) => item.coldCubicMeters);
  const hotValues = consumptions.map((item) => item.hotCubicMeters);
  const splitKnown = readings.length > 0
    && readings.every((reading) => reading.coldCost !== undefined && reading.hotCost !== undefined);
  const latestProgressive = readings
    .filter((reading) => reading.measurementMode === "meter_reading")
    .sort((left, right) => left.readingDate.localeCompare(right.readingDate) || left.id.localeCompare(right.id))
    .at(-1);
  return {
    coldCubicMeters: coldValues.reduce((sum: number, value) => sum + (value ?? 0), 0),
    hotCubicMeters: hotValues.reduce((sum: number, value) => sum + (value ?? 0), 0),
    coldCoverage: coverage(coldValues),
    hotCoverage: coverage(hotValues),
    totalCost: readings.reduce((sum, reading) => sum + reading.totalCost, 0),
    coldCost: splitKnown ? readings.reduce((sum, reading) => sum + reading.coldCost!, 0) : undefined,
    hotCost: splitKnown ? readings.reduce((sum, reading) => sum + reading.hotCost!, 0) : undefined,
    closingReadingDate: latestProgressive?.readingDate,
    coldClosingMeterReading: latestProgressive?.coldCubicMeters,
    hotClosingMeterReading: latestProgressive?.hotCubicMeters,
  };
}

export function waterReadingOverlaps(
  readings: readonly PropertyWaterReading[],
  candidate: PropertyWaterReading,
): boolean {
  return readings.some((reading) => reading.id !== candidate.id
    && reading.propertyId === candidate.propertyId
    && candidate.periodStart <= reading.periodEnd
    && candidate.periodEnd >= reading.periodStart);
}
