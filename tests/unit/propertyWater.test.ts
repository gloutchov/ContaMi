import { describe, expect, it } from "vitest";
import { createPropertyAnnualSummaries } from "../../src/domain/annualHistory";
import { applyFinanceCommand, computeDashboard, createEmptyFinanceData } from "../../src/domain/finance";
import type { FinanceData, PropertyWaterReading } from "../../src/domain/models";
import { propertyWaterConsumption } from "../../src/domain/propertyWater";
import { createRolloverFinanceData } from "../../src/domain/rollover";

function residence(data: FinanceData): string {
  const id = crypto.randomUUID();
  data.properties.push({
    id,
    name: "Synthetic residence",
    kind: "apartment",
    usage: "residence",
    ownershipShare: 1,
    purchasePrice: 200_000,
    active: true,
    notes: "",
  });
  return id;
}

function reading(
  propertyId: string,
  overrides: Partial<PropertyWaterReading> = {},
): PropertyWaterReading {
  return {
    id: crypto.randomUUID(),
    propertyId,
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    readingDate: "2026-04-05",
    measurementMode: "period_consumption",
    coldCubicMeters: 18.25,
    hotCubicMeters: 7.5,
    totalCost: 48,
    coldCost: 28,
    hotCost: 20,
    coldStartsNewCycle: false,
    hotStartsNewCycle: false,
    notes: "",
    ...overrides,
  };
}

describe("residence water readings", () => {
  it("stores statistical costs without creating transactions or changing liquidity", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = residence(data);
    const before = computeDashboard(data);

    const updated = applyFinanceCommand(data, {
      type: "addPropertyWaterReading",
      value: reading(propertyId),
    });

    expect(updated.propertyWaterReadings).toHaveLength(1);
    expect(updated.transactions).toEqual([]);
    expect(computeDashboard(updated)).toMatchObject({
      yearIncome: before.yearIncome,
      yearExpenses: before.yearExpenses,
      liquidBalance: before.liquidBalance,
      cashRegisterBalance: before.cashRegisterBalance,
    });
  });

  it("accepts residences only and rejects overlapping periods", () => {
    let data = createEmptyFinanceData(2026);
    const propertyId = residence(data);
    data = applyFinanceCommand(data, { type: "addPropertyWaterReading", value: reading(propertyId) });

    expect(() => applyFinanceCommand(data, {
      type: "addPropertyWaterReading",
      value: reading(propertyId, {
        periodStart: "2026-03-15",
        periodEnd: "2026-04-30",
        readingDate: "2026-05-05",
      }),
    })).toThrow("PROPERTY_WATER_PERIOD_OVERLAP");

    const rentalId = crypto.randomUUID();
    data.properties.push({
      id: rentalId,
      name: "Synthetic rental",
      kind: "apartment",
      usage: "rental",
      ownershipShare: 1,
      purchasePrice: 100_000,
      active: true,
      notes: "",
    });
    expect(() => applyFinanceCommand(data, {
      type: "addPropertyWaterReading",
      value: reading(rentalId, {
        periodStart: "2026-04-01",
        periodEnd: "2026-06-30",
        readingDate: "2026-07-05",
      }),
    })).toThrow("PROPERTY_NOT_RESIDENCE");
  });

  it("derives progressive consumption only from a compatible baseline", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = residence(data);
    const first = reading(propertyId, {
      measurementMode: "meter_reading",
      coldCubicMeters: 100,
      hotCubicMeters: 40,
      coldCost: undefined,
      hotCost: undefined,
    });
    data.propertyWaterReadings.push(first);
    expect(propertyWaterConsumption(data, first)).toEqual({
      coldCubicMeters: null,
      hotCubicMeters: null,
    });

    const second = reading(propertyId, {
      periodStart: "2026-04-01",
      periodEnd: "2026-06-30",
      readingDate: "2026-07-05",
      measurementMode: "meter_reading",
      coldCubicMeters: 123.5,
      hotCubicMeters: 48,
      coldCost: undefined,
      hotCost: undefined,
    });
    data.propertyWaterReadings.push(second);
    expect(propertyWaterConsumption(data, second)).toEqual({
      coldCubicMeters: 23.5,
      hotCubicMeters: 8,
    });

    const replacement = reading(propertyId, {
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      readingDate: "2026-10-05",
      measurementMode: "meter_reading",
      coldCubicMeters: 2,
      hotCubicMeters: 1,
      coldStartsNewCycle: true,
      hotStartsNewCycle: true,
      coldCost: undefined,
      hotCost: undefined,
    });
    data.propertyWaterReadings.push(replacement);
    expect(propertyWaterConsumption(data, replacement)).toEqual({
      coldCubicMeters: null,
      hotCubicMeters: null,
    });
  });

  it("keeps autonomous cold water separate from condominium cold and hot water", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = residence(data);
    data.propertyEntries.push(
      {
        id: crypto.randomUUID(),
        propertyId,
        date: "2026-02-28",
        kind: "consumption",
        category: "Water",
        description: "Autonomous cold water",
        amount: 0,
        quantity: 12,
        unit: "m³",
        detailKind: "utility_water",
        notes: "",
      },
      {
        id: crypto.randomUUID(),
        propertyId,
        date: "2026-02-28",
        kind: "expense",
        category: "Water",
        categoryId: data.categories.find((item) => item.nameEn === "Home")!.id,
        description: "Autonomous water bill",
        amount: 30,
        paymentMethodId: data.paymentMethods[0]!.id,
        detailKind: "utility_water",
        notes: "",
      },
    );
    data.propertyWaterReadings.push(reading(propertyId, {
      coldCubicMeters: 8,
      hotCubicMeters: 3,
      totalCost: 20,
      coldCost: 12,
      hotCost: 8,
    }));

    const summary = createPropertyAnnualSummaries(data)[0]!;
    expect(summary).toMatchObject({
      expenses: 30,
      waterCubicMeters: 12,
      waterCost: 30,
      condominiumColdWaterCubicMeters: 8,
      condominiumHotWaterCubicMeters: 3,
      condominiumWaterCost: 20,
      condominiumColdWaterCost: 12,
      condominiumHotWaterCost: 8,
    });
  });

  it("archives annual statistics without carrying detail rows into the new year", () => {
    const data = createEmptyFinanceData(2026);
    const propertyId = residence(data);
    data.propertyWaterReadings.push(reading(propertyId));

    const next = createRolloverFinanceData(data, 2027);

    expect(next.propertyWaterReadings).toEqual([]);
    expect(next.propertyAnnualSummaries).toContainEqual(expect.objectContaining({
      propertyId,
      year: 2026,
      condominiumColdWaterCubicMeters: 18.25,
      condominiumHotWaterCubicMeters: 7.5,
      condominiumWaterCost: 48,
      condominiumColdWaterCoverage: "complete",
      condominiumHotWaterCoverage: "complete",
    }));
  });
});
